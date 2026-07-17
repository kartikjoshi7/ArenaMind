from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.arena_server import app
import os

client = TestClient(app)

@patch('backend.app.crowd_control.arena_signage_translator.ModelInference')
def test_crowd_router_signage_fallback(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("Watsonx Offline")
    mock_model.return_value = mock_instance
    payload = {"sector_id": "Gate West", "max_capacity": 1000, "current_occupancy": 950, "flow_rate_per_minute": 120, "egress_gates": ["GATE-NORTH"]}
    response = client.post("/api/v1/crowd/evaluate-sector?target_language=en", json=payload)
    assert response.status_code == 200
    assert "is congested" in response.json()["digital_signage_message"]

@patch('backend.app.crowd_control.arena_signage_translator.ModelInference')
def test_crowd_router_signage_empty_response(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = ""
    mock_model.return_value = mock_instance
    payload = {"sector_id": "Gate Unknown", "max_capacity": 1000, "current_occupancy": 950, "flow_rate_per_minute": 120, "egress_gates": ["GATE-NORTH"]}
    response = client.post("/api/v1/crowd/evaluate-sector?target_language=en", json=payload)
    assert response.status_code == 200

@patch('backend.app.crowd_control.arena_crowd_router.evaluate_sector_status')
def test_crowd_router_internal_error(mock_eval):
    mock_eval.side_effect = Exception("Engine Crash")
    payload = {"sector_id": "Gate South", "max_capacity": 1000, "current_occupancy": 950, "flow_rate_per_minute": 120, "egress_gates": ["GATE-NORTH"]}
    response = client.post("/api/v1/crowd/evaluate-sector?target_language=en", json=payload)
    assert response.status_code == 500

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_router_no_path(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("Offline")
    mock_model.return_value = mock_instance
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Fake Destination", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    assert "Error: No valid path found" in response.json()["structured_content"]

@patch('os.getenv')
def test_fan_router_missing_credentials(mock_getenv):
    mock_getenv.return_value = None
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Section 101", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_router_cot_stripping(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "Clean route. # Step-by-Step Here is how."
    mock_model.return_value = mock_instance
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Section 101", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    assert "Clean route." in response.json()["structured_content"]

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_router_cot_stripping_final_answer(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "# Final Answer This is the final clean route."
    mock_model.return_value = mock_instance
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Section 101", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    assert "This is the final clean route." in response.json()["structured_content"]

@patch('backend.app.volunteer_ops.arena_translation_desk.ModelInference')
def test_translation_desk_empty_response(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = ""
    mock_model.return_value = mock_instance
    payload = {"raw_audio_transcript": "Empty test.", "location_zone": "Gate North", "detected_language": "English"}
    response = client.post("/api/v1/volunteer/process-request", json=payload)
    assert response.status_code == 200
    assert response.json()["priority_level"] == "CRITICAL"

@patch('backend.app.volunteer_ops.arena_translation_desk.ModelInference')
def test_translation_desk_cache(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "```json\n{\"translated_english_summary\": \"Cache Test.\", \"priority_level\": \"LOW\", \"required_staff_role\": \"JANITORIAL\"}\n```"
    mock_model.return_value = mock_instance
    payload = {"raw_audio_transcript": "Cache me.", "location_zone": "Gate North", "detected_language": "English"}
    client.post("/api/v1/volunteer/process-request", json=payload)
    response = client.post("/api/v1/volunteer/process-request", json=payload)
    assert response.status_code == 200

@patch('os.environ.get')
def test_translation_desk_missing_credentials(mock_env_get):
    mock_env_get.return_value = None
    payload = {"raw_audio_transcript": "Missing creds.", "location_zone": "Gate North", "detected_language": "English"}
    response = client.post("/api/v1/volunteer/process-request", json=payload)
    assert response.status_code == 200

def test_volunteer_router_simulate_chatter_success():
    response = client.get("/api/v1/volunteer/simulate/radio-chatter")
    assert response.status_code == 200
    assert "scenario" in response.json()
