import uuid
from datetime import timedelta, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt
from config.settings import settings
from src.database.connection import get_db
from src.database.schemas import (
    UserCreate, UserResponse, UserLogin, TokenSchema, TokenPayload, UserRole, normalize_indian_phone
)
from src.utils.logger import get_logger

logger = get_logger("api.routes_auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication & Access Control"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/signin")


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate municipal authorization credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_doc = await db.users.find_one({"_id": user_id})
    if user_doc is None:
        raise credentials_exception

    return UserResponse.model_validate(user_doc)


def require_roles(allowed_roles: List[UserRole]):
    """Role-Based Access Control (RBAC) dependency factor."""
    async def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            logger.warning(
                f"Access denied for user {current_user.id} with role {current_user.role}. Required: {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required municipal roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


@router.post("/signup", response_model=TokenSchema, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db=Depends(get_db)):
    """Registers a new citizen, sanitation staff worker, or municipal officer."""
    normalized_phone = user_in.phone
    
    # Check if phone number already exists
    existing_phone = await db.users.find_one({"phone": normalized_phone})
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this Indian phone number (+91) is already registered."
        )

    if user_in.email:
        existing_email = await db.users.find_one({"email": user_in.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address is already registered."
            )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    now = settings.get_current_ist_time()

    user_doc = {
        "_id": user_id,
        "full_name": user_in.full_name,
        "phone": normalized_phone,
        "email": user_in.email,
        "role": user_in.role.value,
        "ward_no": user_in.ward_no or "Ward-101",
        "address": user_in.address.model_dump() if user_in.address else None,
        "hashed_password": hash_password(user_in.password),
        "created_at": now,
        "is_active": True
    }

    await db.users.insert_one(user_doc)
    logger.info(f"New user registered successfully: {user_id} ({user_in.role})", extra={"phone": normalized_phone})

    user_resp = UserResponse.model_validate(user_doc)
    token_data = {
        "sub": user_id,
        "phone": normalized_phone,
        "role": user_in.role.value,
        "ward_no": user_in.ward_no
    }
    access_token = create_access_token(data=token_data)

    return TokenSchema(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/signin", response_model=TokenSchema)
async def signin(login_in: UserLogin, db=Depends(get_db)):
    """Authenticates citizen, staff, or admin using phone (+91) or email."""
    query_str = login_in.username.strip()
    
    # Check if query is phone or email
    user_doc = None
    if "@" in query_str:
        user_doc = await db.users.find_one({"email": query_str.lower()})
    else:
        try:
            norm_phone = normalize_indian_phone(query_str)
            user_doc = await db.users.find_one({"phone": norm_phone})
        except ValueError:
            pass

    if not user_doc or not verify_password(login_in.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check phone number/email and password."
        )

    user_resp = UserResponse.model_validate(user_doc)
    token_data = {
        "sub": user_resp.id,
        "phone": user_resp.phone,
        "role": user_resp.role.value,
        "ward_no": user_resp.ward_no
    }
    access_token = create_access_token(data=token_data)

    logger.info(f"User signed in successfully: {user_resp.id} ({user_resp.role})")
    return TokenSchema(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Returns profile information for the authenticated user."""
    return current_user
