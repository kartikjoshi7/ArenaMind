import logging
import os
import re

from ibm_watsonx_ai.foundation_models import ModelInference


from backend.app.volunteer_ops.volunteer_models import ActionableTask, FanInteraction

logger = logging.getLogger(__name__)

# In-memory LRU approximation for the translation desk
_TRANSLATION_CACHE: dict[str, ActionableTask] = {}

async def process_fan_request(interaction: FanInteraction) -> ActionableTask:
    """
    Acts as the AI triage dispatcher for venue volunteers.
    
    Translates raw, multilingual fan requests into actionable English summaries and 
    assigns them to specific operational units with calculated priority levels.
    Enforces a strict JSON output schema to ensure compatibility with deterministic 
    downstream routing logic.
    
    Args:
        interaction (FanInteraction): The raw data payload from a fan interaction.
        
    Returns:
        ActionableTask: A strictly typed, categorized operational task for stadium staff.
    """
    
    # Security: Input Sanitization to prevent Prompt Injection & Token Exhaustion
    # Strip dangerous characters and enforce a hard limit of 250 chars
    sanitized_transcript = re.sub(r'[<>{}\[\]]', '', interaction.raw_audio_transcript)
    sanitized_transcript = sanitized_transcript[:250].strip()

    # Check cache first to avoid IBM Watsonx 429 Too Many Requests
    if sanitized_transcript in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[sanitized_transcript]

    # Prompt engineering designed specifically to force JSON output and act as a stadium triage system
    prompt = f"""
You are an expert stadium triage dispatcher for the FIFA 2026 World Cup.
Your job is to analyze the following fan interaction, translate it to English, and assign an operational task.

Fan Request (Raw Transcript): "{sanitized_transcript}"
Location: {interaction.location_zone}
Detected Language: {interaction.detected_language or 'Unknown'}

You must return your response STRICTLY as a raw JSON object matching the following structure exactly.
{{
  "translated_english_summary": "Short actionable english summary",
  "priority_level": "LOW", // MUST be exactly one of: LOW, MEDIUM, HIGH, CRITICAL
  "required_staff_role": "SECURITY" // e.g., MEDICAL, SECURITY, USHER, CLEANING, MAINTENANCE, SUPERVISOR
}}
"""

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
            model_id="meta-llama/llama-3-1-8b",
            credentials=credentials,
            project_id=project_id
        )
        
        response_text = str(model.generate_text(prompt=prompt))
        
        if not response_text:
            raise ValueError("Empty response received from Watsonx.")
            
        # Super simple extraction from Llama 3 output format
        json_str = response_text.replace("```json", "").replace("```", "").strip()
            
        # Safely validate and parse the LLM's JSON string directly into our strict Pydantic model
        task = ActionableTask.model_validate_json(json_str)
        
        # Save to cache
        _TRANSLATION_CACHE[sanitized_transcript] = task
        
        return task
        
    except Exception as e:
        logger.error(f"Translation desk failure at location {interaction.location_zone}: {e}")
        
        # Graceful Degradation: Fallback to a critical, manual intervention state
        # This guarantees zero downtime and provides on-ground staff with an actionable physical dispatch
        return ActionableTask(
            translated_english_summary=f"Translation system offline. Immediate manual intervention required at {interaction.location_zone}.",
            priority_level="CRITICAL",
            required_staff_role="SUPERVISOR"
        )
