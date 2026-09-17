import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config.settings import settings
from src.api.routes_admin import router as admin_router
from src.api.routes_attendance import router as attendance_router
from src.api.routes_auth import router as auth_router
from src.api.routes_fleet import router as fleet_router
from src.api.routes_waste import router as waste_router
from src.database.connection import db_manager
from src.utils.logger import setup_logging, get_logger

# Initialize JSON logging system
setup_logging()
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager connecting and disconnecting MongoDB."""
    logger.info("Starting Civic Tech Waste Management Backend Engine...", extra={"event": "startup"})
    await db_manager.connect()
    yield
    await db_manager.disconnect()
    logger.info("Shutdown complete.", extra={"event": "shutdown"})


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade Civic Tech Waste Management API for Indian Municipalities and ULBs following Swachh Bharat Abhiyan guidelines.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structured Logging Middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
        extra={
            "method": request.method,
            "endpoint": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown"
        }
    )
    return response


# Mount uploaded image storage
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router)
app.include_router(waste_router)
app.include_router(fleet_router)
app.include_router(attendance_router)
app.include_router(admin_router)


@app.get("/", tags=["Health & Status"])
async def root():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "municipal_ulb": settings.MUNICIPAL_NAME,
        "municipal_code": settings.MUNICIPAL_CODE,
        "timezone": settings.TIMEZONE,
        "swachh_bharat_compliance": True,
        "database_connected": db_manager.is_connected,
        "database_mode": "In-Memory Fallback" if db_manager.is_fallback else "MongoDB Engine"
    }


@app.get("/health", tags=["Health & Status"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": settings.get_current_ist_time().isoformat()
    }
