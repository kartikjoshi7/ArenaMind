import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:80", "http://localhost"]
    rate_limit: str = "20/minute"
    watsonx_api_key: str = ""
    watsonx_api_project_id: str = ""
    watsonx_api_url: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
limiter = Limiter(key_func=get_remote_address)

# Import our strictly Domain-Driven routers
from backend.app.crowd_control.arena_crowd_router import router as crowd_router
from backend.app.volunteer_ops.arena_volunteer_router import router as volunteer_router
from backend.app.fan_services.arena_fan_router import router as fan_router

# Configure base logging for the application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize the main application entry point (Strictly NOT main.py)
app = FastAPI(
    title="ArenaMind Stadium Ops API",
    description=(
        "High-performance operations backend designed for the FIFA World Cup 2026. "
        "Engineered with strict Domain-Driven Design, this API manages deterministic "
        "crowd density simulations, high-throughput physical sensor telemetry, and "
        "GenAI-powered multilingual signage translation."
    ),
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fail-closed fallback: Never leak Python stack traces."""
    return JSONResponse(
        status_code=502,
        content={"detail": "Bad Gateway: Upstream AI or Engine timeout. Failing closed for safety."}
    )

# Configure CORS Middleware for cross-origin frontend communication (React integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all REST methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all standard and custom headers
)

# Mount our modular, decoupled Domain routers
app.include_router(crowd_router)
app.include_router(volunteer_router)
app.include_router(fan_router)


@app.get("/health", response_model=Dict[str, Any], tags=["System Operations"])
async def health_check() -> Dict[str, Any]:
    """
    Primary system telemetry endpoint utilized by deployment load balancers 
    and infrastructure orchestrators to verify venue software stability.
    
    Returns:
        dict: A nominal status payload verifying the core ArenaMind infrastructure is operational.
    """
    return {
        "status": "online",
        "venue": "ArenaMind 2026",
        "systems_nominal": True
    }
