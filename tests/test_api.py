import pytest
from datetime import timedelta
from src.database.schemas import (
    normalize_indian_phone, IndianAddress, UserRole, UserCreate, ComplaintStatus, GeoJSONPoint
)
from src.api.routes_auth import hash_password, verify_password, create_access_token


def test_indian_phone_normalization_valid():
    assert normalize_indian_phone("9876543210") == "+919876543210"
    assert normalize_indian_phone("+91 9876543210") == "+919876543210"
    assert normalize_indian_phone("919876543210") == "+919876543210"


def test_indian_phone_normalization_invalid():
    with pytest.raises(ValueError):
        normalize_indian_phone("1234567890")  # Does not start with 6-9
    with pytest.raises(ValueError):
        normalize_indian_phone("98765")  # Too short


def test_indian_address_validation():
    addr = IndianAddress(
        ulb_name="BBMP",
        ward_no="ward-101",
        landmark="Metro Station Gate 1",
        district="Bengaluru Urban",
        state="Karnataka",
        pincode="560001"
    )
    assert addr.ward_no == "WARD-101"
    assert addr.pincode == "560001"

    with pytest.raises(ValueError):
        IndianAddress(
            ulb_name="BBMP",
            ward_no="Ward-101",
            district="Bengaluru",
            state="Karnataka",
            pincode="060001"  # Starts with 0
        )


def test_password_hashing_and_jwt():
    raw_pass = "SecurePass123!"
    hashed = hash_password(raw_pass)
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPass", hashed) is False

    token_data = {"sub": "usr_123", "phone": "+919876543210", "role": "citizen"}
    token = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)
    assert len(token) > 20


def test_geojson_point_validation():
    point = GeoJSONPoint(type="Point", coordinates=[77.5946, 12.9716])
    assert point.coordinates == [77.5946, 12.9716]

    with pytest.raises(ValueError):
        GeoJSONPoint(type="Point", coordinates=[200.0, 12.9716])  # Invalid lon
