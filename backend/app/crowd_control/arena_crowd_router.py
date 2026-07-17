import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.app.crowd_control.arena_density_engine import evaluate_sector_status
from backend.app.crowd_control.arena_signage_translator import generate_multilingual_signage
from backend.app.crowd_control.sector_models import StadiumSector

logger = logging.getLogger(__name__)

# Initialize the router strictly following Domain-Driven Design for the micro-city architecture
router = APIRouter(
    prefix="/api/v1/crowd",
    tags=["Crowd Operations"]
)

@router.post("/evaluate-sector", response_model=dict[str, Any])
async def evaluate_sector(
    sector: StadiumSector,
    target_language: str = Query("en", description="The target language for the digital signage translation (e.g., 'es', 'Spanish').")
) -> dict[str, Any]:
    """
    Ingests real-time telemetry from a physical stadium sector to evaluate structural density.
    
    This endpoint serves as the primary webhook for physical venue IoT sensors (turnstiles, cameras). 
    It routes the payload through a deterministic math engine to calculate if a sector's safety capacity 
    has been breached. 
    
    If safe, it returns a 200 OK nominal status. If the deterministic threshold is breached, 
    it generates a CongestionAlert and subsequently triggers the AI phrasing layer to generate 
    a localized digital signage message for immediate venue broadcast.
    
    Args:
        sector (StadiumSector): The real-time physical telemetry payload for the sector.
        target_language (str): The desired language for emergency broadcast translation.
        
    Returns:
        dict: A JSON object containing either a nominal safe status, or a complete CongestionAlert payload
              appended with the newly generated multilingual digital signage message.
    """
    try:
        # Step 1: Execute the Deterministic Math Engine (Zero hallucinations)
        alert = evaluate_sector_status(sector)

        # Step 2: Handle Nominal/Safe State
        if alert is None:
            return {
                "status": "safe",
                "sector_id": sector.sector_id,
                "message": "Sector is currently operating within safe, nominal capacity limits."
            }

        # Step 3: Threshold Breached - Trigger AI Phrasing Layer for downstream digital signage
        signage_message = await generate_multilingual_signage(alert, target_language)

        # Step 4: Construct the unified response payload for Venue Operations and Signage systems
        response_payload = alert.model_dump()
        response_payload["digital_signage_message"] = signage_message

        return response_payload

    except Exception as e:
        logger.critical(f"Critical systems failure in crowd operations router: {e!s}")
        # Graceful degradation at the routing layer to ensure API stability
        raise HTTPException(status_code=500, detail="Internal server error during crowd control telemetry evaluation.")
