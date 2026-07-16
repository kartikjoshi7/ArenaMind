import logging
import os

import google.generativeai as genai
from pydantic import ValidationError

from backend.app.volunteer_ops.volunteer_models import ActionableTask, FanInteraction

logger = logging.getLogger(__name__)

# Configure the Gemini API client
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

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
    
    # Prompt engineering designed specifically to force JSON output and act as a stadium triage system
    prompt = f"""
You are an expert stadium triage dispatcher for the FIFA 2026 World Cup.
Your job is to analyze the following fan interaction, translate it to English, and assign an operational task.

Fan Request (Raw Transcript): "{interaction.raw_audio_transcript}"
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
        # Utilize gemini-2.5-flash with forced JSON response mime-type for absolute data integrity
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        
        response = await model.generate_content_async(prompt)
        
        if not response.text:
            raise ValueError("Empty response received from Gemini.")
            
        # Safely validate and parse the LLM's JSON string directly into our strict Pydantic model
        task = ActionableTask.model_validate_json(response.text)
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
