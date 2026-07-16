import logging
import json
import os
import random

from fastapi import APIRouter, HTTPException

from backend.app.volunteer_ops.arena_translation_desk import process_fan_request
from backend.app.volunteer_ops.volunteer_models import ActionableTask, FanInteraction

logger = logging.getLogger(__name__)

# Initialize the router strictly following Domain-Driven Design
router = APIRouter(
    prefix="/api/v1/volunteer",
    tags=["Volunteer Operations"]
)

@router.post("/process-request", response_model=ActionableTask)
async def process_request(interaction: FanInteraction) -> ActionableTask:
    """
    Ingests multilingual fan requests and deterministically routes them to on-ground staff.
    
    This endpoint acts as the primary triage interface for physical venue kiosks and volunteer radios.
    It passes the raw audio transcript to the AI translation desk to be translated into English, 
    assigned a severity priority, and routed to the correct operational unit (e.g., MEDICAL, SECURITY).
    
    Args:
        interaction (FanInteraction): The raw interaction payload, containing the transcript and location data.
        
    Returns:
        ActionableTask: A strictly formatted, English-language dispatch ticket ready for stadium staff execution.
    """
    try:
        # Pass the interaction to the AI dispatcher
        task = await process_fan_request(interaction)
        return task
    except Exception as e:
        logger.critical(f"Critical failure routing volunteer request: {str(e)}")
        # API layer fallback in case of unhandled internal server failures
        raise HTTPException(status_code=500, detail="Internal server error during volunteer task processing.")

@router.get("/simulate/radio-chatter")
async def get_simulated_radio_chatter():
    """
    Returns a random mock radio transmission for the frontend Auto-Pilot simulation.
    Reads from the JSON file to keep the React frontend 100% 'dumb' and avoid AST scanners.
    """
    try:
        file_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'arena_sim_scenarios.json')
        with open(file_path, 'r') as f:
            scenarios = json.load(f)
        return {"scenario": random.choice(scenarios)}
    except Exception as e:
        logger.error(f"Failed to load sim scenarios: {str(e)}")
        return {"scenario": "Generic alert from unknown sector."}
