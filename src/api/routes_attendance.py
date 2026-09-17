import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from config.settings import settings
from src.api.routes_auth import get_current_user, require_roles
from src.database.connection import get_db
from src.database.schemas import (
    CheckInRequest, CheckOutRequest, AttendanceRecord, UserResponse, UserRole
)
from src.utils.logger import get_logger

logger = get_logger("api.routes_attendance")
router = APIRouter(prefix="/api/attendance", tags=["Sanitation Staff Attendance & Muster Roll"])


@router.post("/check-in", response_model=AttendanceRecord)
async def staff_check_in(
    req: CheckInRequest,
    current_user: UserResponse = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
    db=Depends(get_db)
):
    """
    Sanitation worker/driver one-tap GPS check-in.
    Validates geographical location and records IST timestamp.
    """
    now_ist = settings.get_current_ist_time()
    date_str = now_ist.strftime("%Y-%m-%d")

    # Check if worker already checked in today
    existing = await db.attendance.find_one({
        "staff_id": current_user.id,
        "date_str": date_str,
        "status": "Active"
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff member is already checked in for today."
        )

    attendance_id = f"att_{uuid.uuid4().hex[:12]}"
    record = {
        "_id": attendance_id,
        "staff_id": current_user.id,
        "staff_name": current_user.full_name,
        "staff_phone": current_user.phone,
        "ward_no": req.ward_no.upper(),
        "check_in_time": now_ist,
        "check_out_time": None,
        "check_in_location": {
            "type": "Point",
            "coordinates": [req.longitude, req.latitude]
        },
        "check_out_location": None,
        "shift_duration_hours": None,
        "status": "Active",
        "date_str": date_str
    }

    await db.attendance.insert_one(record)
    logger.info(
        f"Staff check-in successful: {current_user.full_name} in {req.ward_no}",
        extra={"staff_id": current_user.id, "ward_no": req.ward_no}
    )
    return AttendanceRecord.model_validate(record)


@router.post("/check-out", response_model=AttendanceRecord)
async def staff_check_out(
    req: CheckOutRequest,
    current_user: UserResponse = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
    db=Depends(get_db)
):
    """
    Sanitation worker/driver check-out. Calculates total shift duration in hours.
    """
    now_ist = settings.get_current_ist_time()
    date_str = now_ist.strftime("%Y-%m-%d")

    active_record = await db.attendance.find_one({
        "staff_id": current_user.id,
        "status": "Active"
    })

    if not active_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active check-in record found for this staff member."
        )

    check_in_time = active_record["check_in_time"]
    if isinstance(check_in_time, str):
        check_in_time = datetime.fromisoformat(check_in_time)

    # Calculate shift duration
    duration = (now_ist.replace(tzinfo=None) - check_in_time.replace(tzinfo=None)).total_seconds() / 3600.0
    duration_hrs = round(max(0.1, duration), 2)

    update_payload = {
        "check_out_time": now_ist,
        "check_out_location": {
            "type": "Point",
            "coordinates": [req.longitude, req.latitude]
        },
        "shift_duration_hours": duration_hrs,
        "status": "Completed"
    }

    await db.attendance.update_one({"_id": active_record["_id"]}, {"$set": update_payload})
    
    updated_doc = await db.attendance.find_one({"_id": active_record["_id"]})
    logger.info(f"Staff check-out successful: {current_user.full_name}, duration: {duration_hrs}h")
    return AttendanceRecord.model_validate(updated_doc)


@router.get("/today", response_model=List[AttendanceRecord])
async def get_today_muster_roll(
    ward_no: Optional[str] = None,
    current_user: UserResponse = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF])),
    db=Depends(get_db)
):
    """Retrieves today's staff muster roll for attendance monitoring."""
    now_ist = settings.get_current_ist_time()
    date_str = now_ist.strftime("%Y-%m-%d")

    query = {"date_str": date_str}
    if ward_no:
        query["ward_no"] = ward_no.upper()

    cursor = db.attendance.find(query).sort("check_in_time", -1)
    results = await cursor.to_list(length=100)
    return [AttendanceRecord.model_validate(r) for r in results]


@router.get("/my-status", response_model=Optional[AttendanceRecord])
async def get_my_active_attendance(
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db)
):
    """Returns currently active check-in record for the logged-in staff member."""
    active_record = await db.attendance.find_one({
        "staff_id": current_user.id,
        "status": "Active"
    })
    if not active_record:
        return None
    return AttendanceRecord.model_validate(active_record)
