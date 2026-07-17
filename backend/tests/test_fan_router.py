from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.arena_server import app

client = TestClient(app)

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_wayfinding_query_g1(mock_model_inference):
    # Setup mock LLM response
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "Follow the signs to Gate North."
    mock_model_inference.return_value = mock_instance

    payload = {
        "module_type": "G1_PATHFINDING",
        "origin": "Gate North",
        "destination": "Section 101",
        "language": "English"
    }

    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "structured_content" in data
    assert data["structured_content"] == "Follow the signs to Gate North."

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_wayfinding_invalid_module(mock_model_inference):
    payload = {
        "module_type": "G99_INVALID",
        "origin": "Gate North",
        "destination": "Section 101",
        "language": "English"
    }
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 400

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_wayfinding_fallback_on_llm_failure(mock_model_inference):
    # Simulate Watsonx API failure
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("API Timeout")
    mock_model_inference.return_value = mock_instance

    payload = {
        "module_type": "G1_PATHFINDING",
        "origin": "Gate North",
        "destination": "Section 101",
        "language": "English"
    }
    response = client.post("/api/v1/fan/process-query", json=payload)
    
    # Graceful degradation should return 200 with fallback math logic
    assert response.status_code == 200
    data = response.json()
    assert "Error: No valid path found" in data["structured_content"] or "Total Distance" in data["structured_content"]

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_accessibility_g2(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "- Wheelchair ramp access available.\n- Staff will assist."
    mock_model_inference.return_value = mock_instance

    payload = {
        "module_type": "G2_ACCESS",
        "destination": "Gate North",
        "needs": "wheelchair",
        "language": "Spanish"
    }
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "structured_content" in data

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_transit_g3(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "- Take the metro to reduce carbon emissions."
    mock_model_inference.return_value = mock_instance

    payload = {
        "module_type": "G3_TRANSIT",
        "origin": "15",
        "needs": "Car",
        "language": "English"
    }
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "structured_content" in data

def test_venue_graph_endpoint():
    response = client.get("/api/v1/fan/venue-graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_g2_fallback(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("Offline")
    mock_model_inference.return_value = mock_instance
    response = client.post("/api/v1/fan/process-query", json={"module_type": "G2_ACCESS", "destination": "Gate", "needs": "wheelchair", "language": "English"})
    assert response.status_code == 200

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_g3_fallback(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("Offline")
    mock_model_inference.return_value = mock_instance
    response = client.post("/api/v1/fan/process-query", json={"module_type": "G3_TRANSIT", "origin": "10", "needs": "bus", "language": "English"})
    assert response.status_code == 200
