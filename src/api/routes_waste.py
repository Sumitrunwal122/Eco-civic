import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from config.settings import settings
from src.ai_engine.gemini_vision import gemini_vision_engine
from src.api.routes_auth import get_current_user
from src.database.connection import get_db
from src.database.schemas import (
    ComplaintCreate, ComplaintResponse, WasteClassificationResult, ComplaintStatus, UserResponse, UserRole
)
from src.utils.image_processor import process_and_save_image
from src.utils.logger import get_logger

logger = get_logger("api.routes_waste")
router = APIRouter(prefix="/api/waste", tags=["Swachh Bharat Waste & Complaints"])


@router.post("/classify", response_model=WasteClassificationResult)
async def classify_waste_photo(
    file: UploadFile = File(...),
    context: Optional[str] = Form(None)
):
    """
    Instant Gemini Vision AI waste classifier adhering to Swachh Bharat Abhiyan rules.
    Returns bin color (Green, Blue, Black/Red, Yellow), handling instructions, and category.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided must be a valid image (JPEG, PNG, WEBP)."
        )

    content = await file.read()
    rel_path, abs_path = process_and_save_image(content, settings.UPLOAD_DIR)

    try:
        classification = await gemini_vision_engine.classify_waste_image(abs_path, context)
        return classification
    except Exception as e:
        logger.error(f"Error during waste classification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process waste image: {str(e)}"
        )


@router.post("/complaint", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def file_waste_complaint(
    ward_no: str = Form(...),
    landmark: str = Form(...),
    description: Optional[str] = Form(""),
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Files a new civic waste complaint with optional photo upload, GPS coordinates,
    and automatic Gemini Vision AI Swachh Bharat categorization.
    """
    photo_url = None
    ai_result = None

    if file and file.filename:
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File provided must be an image."
            )
        content = await file.read()
        rel_path, abs_path = process_and_save_image(content, settings.UPLOAD_DIR)
        photo_url = rel_path

        # Classify image automatically
        try:
            ai_result = await gemini_vision_engine.classify_waste_image(
                abs_path,
                text_context=f"{landmark} - {description}"
            )
        except Exception as e:
            logger.warning(f"Auto-classification warning: {e}")

    complaint_id = f"cmp_{uuid.uuid4().hex[:12]}"
    now = settings.get_current_ist_time()

    complaint_doc = {
        "_id": complaint_id,
        "citizen_id": current_user.id,
        "citizen_name": current_user.full_name,
        "citizen_phone": current_user.phone,
        "ward_no": ward_no.strip().upper(),
        "landmark": landmark.strip(),
        "description": description.strip() if description else "",
        "photo_url": photo_url,
        "location": {
            "type": "Point",
            "coordinates": [longitude, latitude]
        },
        "status": ComplaintStatus.PENDING.value,
        "ai_classification": ai_result.model_dump() if ai_result else None,
        "assigned_to": None,
        "resolution_notes": None,
        "resolution_photo_url": None,
        "created_at": now,
        "updated_at": now
    }

    await db.complaints.insert_one(complaint_doc)
    logger.info(
        f"Complaint filed: {complaint_id} in {ward_no} by {current_user.id}",
        extra={"ward_no": ward_no, "citizen_id": current_user.id}
    )

    return ComplaintResponse.model_validate(complaint_doc)


@router.get("/complaints", response_model=List[ComplaintResponse])
async def list_complaints(
    ward_no: Optional[str] = None,
    status_filter: Optional[ComplaintStatus] = None,
    mine_only: bool = False,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Lists complaints based on role, ward, status, or citizen ownership.
    Citizens see their complaints; Staff see ward complaints + anything assigned
    to them directly; Admin sees ward/all complaints.
    """
    query = {}
    if mine_only or current_user.role == UserRole.CITIZEN:
        query["citizen_id"] = current_user.id
    elif current_user.role == UserRole.STAFF:
        ward_clause = {"ward_no": (ward_no or current_user.ward_no or "").upper()}
        assigned_clause = {"assigned_to.assigned_staff_id": current_user.id}
        query["$or"] = [ward_clause, assigned_clause]
    elif ward_no:
        query["ward_no"] = ward_no.upper()

    if status_filter:
        query["status"] = status_filter.value

    cursor = db.complaints.find(query).sort("created_at", -1)
    results = await cursor.to_list(length=200)
    return [ComplaintResponse.model_validate(doc) for doc in results]


@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint_detail(
    complaint_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db)
):
    """Retrieves single complaint details."""
    doc = await db.complaints.find_one({"_id": complaint_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintResponse.model_validate(doc)