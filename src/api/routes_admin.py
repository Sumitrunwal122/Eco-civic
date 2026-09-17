from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from config.settings import settings
from src.api.routes_auth import get_current_user, require_roles
from src.database.connection import get_db
from src.database.schemas import (
    ComplaintResponse, ComplaintAssignment, ComplaintStatusUpdate, ComplaintStatus, UserResponse, UserRole
)
from src.utils.geo_helpers import fleet_simulator
from src.utils.logger import get_logger

logger = get_logger("api.routes_admin")
router = APIRouter(prefix="/api/admin", tags=["Municipal Admin & Duty Allocation"])


@router.put("/complaints/{complaint_id}/assign", response_model=ComplaintResponse)
async def assign_complaint_duty(
    complaint_id: str,
    assignment: ComplaintAssignment,
    current_user: UserResponse = Depends(require_roles([UserRole.ADMIN])),
    db=Depends(get_db)
):
    """
    Municipal Officer assigns a citizen waste complaint to a sanitation staff member
    and assigns a municipal vehicle truck.
    """
    complaint = await db.complaints.find_one({"_id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = settings.get_current_ist_time()
    update_data = {
        "status": ComplaintStatus.ASSIGNED.value,
        "assigned_to": assignment.model_dump(),
        "updated_at": now
    }

    await db.complaints.update_one({"_id": complaint_id}, {"$set": update_data})
    updated_doc = await db.complaints.find_one({"_id": complaint_id})
    
    logger.info(
        f"Complaint {complaint_id} assigned to staff {assignment.assigned_staff_name} by admin {current_user.id}"
    )
    return ComplaintResponse.model_validate(updated_doc)


@router.put("/complaints/{complaint_id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    complaint_id: str,
    status_update: ComplaintStatusUpdate,
    current_user: UserResponse = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF])),
    db=Depends(get_db)
):
    """
    Updates complaint status (Pending -> Assigned -> In Progress -> Resolved)
    with resolution notes and proof photo.
    """
    complaint = await db.complaints.find_one({"_id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = settings.get_current_ist_time()
    update_data = {
        "status": status_update.status.value,
        "updated_at": now
    }
    if status_update.resolution_notes:
        update_data["resolution_notes"] = status_update.resolution_notes
    if status_update.resolution_photo_url:
        update_data["resolution_photo_url"] = status_update.resolution_photo_url

    await db.complaints.update_one({"_id": complaint_id}, {"$set": update_data})
    updated_doc = await db.complaints.find_one({"_id": complaint_id})
    
    logger.info(f"Complaint {complaint_id} status updated to {status_update.status.value} by {current_user.id}")
    return ComplaintResponse.model_validate(updated_doc)


@router.get("/staff", response_model=List[UserResponse])
async def list_sanitation_staff(
    ward_no: Optional[str] = None,
    current_user: UserResponse = Depends(require_roles([UserRole.ADMIN])),
    db=Depends(get_db)
):
    """Lists sanitation staff members available for duty allocation."""
    query = {"role": UserRole.STAFF.value}
    if ward_no:
        query["ward_no"] = ward_no.upper()

    cursor = db.users.find(query)
    results = await cursor.to_list(length=100)
    return [UserResponse.model_validate(u) for u in results]


@router.get("/stats")
async def get_municipal_dashboard_stats(
    current_user: UserResponse = Depends(require_roles([UserRole.ADMIN])),
    db=Depends(get_db)
):
    """Returns real-time Swachh Bharat municipal metrics across wards."""
    total_complaints = await db.complaints.count_documents({})
    pending = await db.complaints.count_documents({"status": ComplaintStatus.PENDING.value})
    assigned = await db.complaints.count_documents({"status": ComplaintStatus.ASSIGNED.value})
    in_progress = await db.complaints.count_documents({"status": ComplaintStatus.IN_PROGRESS.value})
    resolved = await db.complaints.count_documents({"status": ComplaintStatus.RESOLVED.value})

    now_ist = settings.get_current_ist_time()
    date_str = now_ist.strftime("%Y-%m-%d")
    active_staff_count = await db.attendance.count_documents({"date_str": date_str, "status": "Active"})

    clearance_rate = round((resolved / total_complaints * 100.0), 1) if total_complaints > 0 else 100.0

    return {
        "ulb_name": settings.MUNICIPAL_NAME,
        "ulb_code": settings.MUNICIPAL_CODE,
        "timestamp": now_ist.isoformat(),
        "complaints": {
            "total": total_complaints,
            "pending": pending,
            "assigned": assigned,
            "in_progress": in_progress,
            "resolved": resolved,
            "clearance_rate_percent": clearance_rate
        },
        "fleet": {
            "active_trucks": len(fleet_simulator.state)
        },
        "workforce": {
            "active_on_duty_today": active_staff_count
        }
    }
