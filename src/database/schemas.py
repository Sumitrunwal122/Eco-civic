import re
from datetime import datetime
from enum import Enum
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict


# ==========================================
# 1. ENUMS FOR ROLES, STATUS & CATEGORIES
# ==========================================

class UserRole(str, Enum):
    CITIZEN = "citizen"
    STAFF = "staff"       # Sanitation Worker / Driver / Area Inspector
    ADMIN = "admin"       # Municipal Officer / Health Inspector / ULB Admin


class ComplaintStatus(str, Enum):
    PENDING = "Pending"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"


class WasteCategoryEnum(str, Enum):
    WET = "Wet Waste"
    DRY = "Dry Waste"
    HAZARDOUS = "Hazardous/E-Waste"
    SANITARY = "Sanitary Waste"


class SwachhBharatBinColor(str, Enum):
    GREEN = "Green"           # Wet / Biodegradable
    BLUE = "Blue"             # Dry / Recyclable
    BLACK_RED = "Black/Red"   # Domestic Hazardous & E-Waste
    MARKED_BAG = "Yellow/Marked Bag"  # Sanitary Waste


# ==========================================
# 2. GEOJSON & INDIAN LOCALIZED SCHEMAS
# ==========================================

class GeoJSONPoint(BaseModel):
    """GeoJSON Point specification for MongoDB 2dsphere indexing."""
    type: str = Field(default="Point")
    # [longitude, latitude] as per GeoJSON RFC 7946
    coordinates: List[float] = Field(..., min_length=2, max_length=2)

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, v: List[float]) -> List[float]:
        lon, lat = v[0], v[1]
        if not (-180.0 <= lon <= 180.0):
            raise ValueError("Longitude must be between -180 and 180 degrees.")
        if not (-90.0 <= lat <= 90.0):
            raise ValueError("Latitude must be between -90 and 90 degrees.")
        return v


class IndianAddress(BaseModel):
    """Validated Indian address structure for Municipalities / ULBs."""
    ulb_name: str = Field(..., description="Urban Local Body / Municipal Corporation name (e.g. BBMP, BMC)")
    ward_no: str = Field(..., description="Municipal Ward identifier (e.g. Ward-101, Ward-42B)")
    landmark: Optional[str] = Field(None, description="Prominent local landmark")
    district: str = Field(..., description="District name (e.g. Bengaluru Urban, Pune)")
    state: str = Field(..., description="State name (e.g. Karnataka, Maharashtra)")
    pincode: str = Field(..., description="6-digit Indian Postal PIN code")

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[1-9][0-9]{5}$", clean):
            raise ValueError("Invalid Indian PIN code. Must be a 6-digit number not starting with 0.")
        return clean

    @field_validator("ward_no")
    @classmethod
    def normalize_ward(cls, v: str) -> str:
        clean = v.strip().upper()
        if not clean:
            raise ValueError("Ward number cannot be blank.")
        return clean


# ==========================================
# 3. AUTHENTICATION & USER SCHEMAS
# ==========================================

def normalize_indian_phone(v: str) -> str:
    """Validates and normalizes Indian phone numbers to +91XXXXXXXXXX format."""
    clean = re.sub(r"[\s\-\(\)]", "", v.strip())
    # Match +91XXXXXXXXXX, 91XXXXXXXXXX, or 10-digit starting with 6-9
    match = re.match(r"^(?:\+91|91)?([6-9]\d{9})$", clean)
    if not match:
        raise ValueError("Invalid Indian mobile number. Must be a 10-digit number starting with 6-9.")
    return f"+91{match.group(1)}"


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., description="Indian phone number normalized to +91")
    email: Optional[EmailStr] = None
    role: UserRole = Field(default=UserRole.CITIZEN)
    ward_no: Optional[str] = Field(None, description="Assigned or residential ward number")
    address: Optional[IndianAddress] = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return normalize_indian_phone(v)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    # User can login with either phone (+91) or email
    username: str = Field(..., description="Indian phone (+91XXXXXXXXXX) or email address")
    password: str = Field(..., min_length=1)


class UserResponse(UserBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    is_active: bool = True

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.isoformat()}
    )


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str  # User ID
    phone: str
    role: UserRole
    ward_no: Optional[str] = None
    exp: int


# ==========================================
# 4. SWACHH BHARAT AI WASTE CLASSIFICATION
# ==========================================

class WasteClassificationResult(BaseModel):
    detected_items: List[str] = Field(default_factory=list)
    primary_category: WasteCategoryEnum
    bin_color: SwachhBharatBinColor
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    handling_instructions: str
    swachh_bharat_advisory: str
    is_hazardous: bool = False
    estimated_volume_kg: Optional[float] = None


# ==========================================
# 5. CITIZEN COMPLAINT SCHEMAS
# ==========================================

class ComplaintCreate(BaseModel):
    ward_no: str
    landmark: str
    description: Optional[str] = ""
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    photo_url: Optional[str] = None
    # Optional direct classification override/pre-fill
    ai_classification: Optional[WasteClassificationResult] = None


class ComplaintAssignment(BaseModel):
    assigned_staff_id: str
    assigned_staff_name: str
    assigned_vehicle_id: Optional[str] = None
    duty_notes: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    resolution_notes: Optional[str] = None
    resolution_photo_url: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: str = Field(..., alias="_id")
    citizen_id: str
    citizen_name: str
    citizen_phone: str
    ward_no: str
    landmark: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    location: GeoJSONPoint
    status: ComplaintStatus = ComplaintStatus.PENDING
    ai_classification: Optional[WasteClassificationResult] = None
    assigned_to: Optional[ComplaintAssignment] = None
    resolution_notes: Optional[str] = None
    resolution_photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.isoformat()}
    )


# ==========================================
# 6. SANITATION STAFF ATTENDANCE SCHEMAS
# ==========================================

class CheckInRequest(BaseModel):
    ward_no: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    selfie_photo_url: Optional[str] = None
    notes: Optional[str] = None


class CheckOutRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    notes: Optional[str] = None


class AttendanceRecord(BaseModel):
    id: str = Field(..., alias="_id")
    staff_id: str
    staff_name: str
    staff_phone: str
    ward_no: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    check_in_location: GeoJSONPoint
    check_out_location: Optional[GeoJSONPoint] = None
    shift_duration_hours: Optional[float] = None
    status: str = "Active"  # "Active", "Completed"
    date_str: str  # YYYY-MM-DD in Asia/Kolkata

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.isoformat()}
    )


# ==========================================
# 7. FLEET TRACKING SCHEMAS
# ==========================================

class VehicleTelemetry(BaseModel):
    vehicle_id: str
    driver_name: str
    driver_phone: str
    ward_no: str
    vehicle_type: str
    capacity_tons: float
    current_load_tons: float
    status: str
    speed_kmh: float
    fuel_percent: float
    latitude: float
    longitude: float
    timestamp: Optional[datetime] = None
