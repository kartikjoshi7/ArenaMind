import logging
import os

from ibm_watsonx_ai.foundation_models import ModelInference

from backend.app.crowd_control.sector_models import CongestionAlert

logger = logging.getLogger(__name__)

# In-memory cache to prevent 429 Too Many Requests from repeated telemetry polling
_SIGNAGE_CACHE: dict[str, str] = {}

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
    cache_key = f"{alert.sector_id}_{diversion_gates_str}_{target_language}"

    if cache_key in _SIGNAGE_CACHE:
        return _SIGNAGE_CACHE[cache_key]

    message = f"Sector {alert.sector_id} is congested. Please proceed to: {diversion_gates_str}."
    prompt = f"""System: You are an emergency signage translation system.
User: Translate the following emergency message into {target_language}.
Original message: {message}

STRICT RULES:
1. Return ONLY the translated string.
2. Do not include quotes, prefixes, or conversational text.
Assistant:"""

    try:
        api_key = os.environ.get("WATSONX_API_KEY")
        project_id = os.environ.get("WATSONX_API_PROJECT_ID")
        url = os.environ.get("WATSONX_API_URL")

        if not api_key or not project_id or not url:
            raise ValueError("IBM Cloud credentials are not fully configured.")

        credentials = {
            "url": url,
            "apikey": api_key
        }

        model = ModelInference(
            model_id="ibm/granite-4-h-small",
            credentials=credentials,
            project_id=project_id,
            params={
                "decoding_method": "greedy",
                "max_new_tokens": 100
            }
        )

        response_text = str(model.generate_text(prompt))

        if response_text:
            cleaned_text = response_text.strip()
            _SIGNAGE_CACHE[cache_key] = cleaned_text
            return cleaned_text
        else:
            raise ValueError("Received an empty response payload from the Watsonx model.")

    except Exception as e:
        # Log the failure for Operations Engineering review
        logger.error(f"Signage phrasing layer failure for Alert ID {alert.alert_id}: {e}")

        # Graceful degradation: deterministic English fallback using the alert payload
        return f"Sector {alert.sector_id} is congested. Please proceed to: {diversion_gates_str}."
