from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.arena_server import app

client = TestClient(app)

@patch('backend.app.volunteer_ops.arena_translation_desk.ModelInference')
def test_volunteer_triage_dispatcher_valid(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = """```json
    {
        "translated_english_summary": "Medical emergency at gate.",
        "priority_level": "CRITICAL",
        "required_staff_role": "Medical Team"
    }
    ```"""
    mock_model_inference.return_value = mock_instance

    payload = {
        "raw_audio_transcript": "Emergency! Someone fell.",
        "location_zone": "Gate North",
        "detected_language": "English"
    }

    response = client.post("/api/v1/volunteer/process-request", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["priority_level"] == "CRITICAL"
    assert data["required_staff_role"] == "Medical Team"

@patch('backend.app.volunteer_ops.arena_translation_desk.ModelInference')
def test_volunteer_triage_dispatcher_fallback(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("LLM Error")
    mock_model_inference.return_value = mock_instance

    payload = {
        "raw_audio_transcript": "Need more hotdogs.",
        "location_zone": "Concession 1",
        "detected_language": "English"
    }

    response = client.post("/api/v1/volunteer/process-request", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Fallback should assign CRITICAL priority to guarantee safety
    assert data["priority_level"] == "CRITICAL"
    assert data["required_staff_role"] == "SUPERVISOR"

@patch('backend.app.volunteer_ops.arena_volunteer_router.process_fan_request')
def test_volunteer_router_internal_error(mock_process):
    mock_process.side_effect = Exception("Router crash")
    payload = {
        "raw_audio_transcript": "Crash me.",
        "location_zone": "Concession 1",
        "detected_language": "English"
    }
    response = client.post("/api/v1/volunteer/process-request", json=payload)
    assert response.status_code == 500

@patch('builtins.open', side_effect=Exception("File not found"))
def test_volunteer_router_simulate_chatter_fallback(mock_open):
    response = client.get("/api/v1/volunteer/simulate/radio-chatter")
    assert response.status_code == 200
    assert response.json()["scenario"] == "Generic alert from unknown sector."
