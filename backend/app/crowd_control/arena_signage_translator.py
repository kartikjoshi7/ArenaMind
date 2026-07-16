import logging
import os

import google.generativeai as genai
from backend.app.crowd_control.sector_models import CongestionAlert

logger = logging.getLogger(__name__)

# Configure the Gemini API client. It expects the GEMINI_API_KEY environment variable.
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

async def generate_multilingual_signage(alert: CongestionAlert, target_language: str) -> str:
    """
    Acts as the AI phrasing layer for the digital signage system.
    Translates a deterministic CongestionAlert into a natural language, multilingual 
    signage message using Gemini, with a strict graceful degradation mechanism.
    
    Args:
        alert (CongestionAlert): The deterministic payload containing congestion details and routing logic.
        target_language (str): The requested language for the signage output (e.g., 'Spanish', 'Japanese').
        
    Returns:
        str: A translated, maximum 150-character string for display on digital stadium boards.
    """
    diversion_gates_str = ", ".join(alert.recommended_diversion_routes)
    
    prompt = (
        f"You are a stadium digital signage system. You must generate a polite, "
        f"maximum 150-character message in {target_language}. Inform fans that their "
        f"current sector ({alert.sector_id}) is congested and direct them to the "
        f"following recommended routes: {diversion_gates_str}. "
        f"Do NOT invent new gates or include external information."
    )
    
    try:
        # Initialize the model (using gemini-2.5-flash for fast, short-form text generation)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Execute the asynchronous API call
        response = await model.generate_content_async(prompt)
        
        if response.text:
            return response.text.strip()
        else:
            raise ValueError("Received an empty response payload from the Gemini model.")
            
    except Exception as e:
        # Log the failure for Operations Engineering review
        logger.error(f"Signage phrasing layer failure for Alert ID {alert.alert_id}: {e}")
        
        # Graceful degradation: deterministic English fallback using the alert payload
        return f"Sector {alert.sector_id} is congested. Please proceed to: {diversion_gates_str}."
