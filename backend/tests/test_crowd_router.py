from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.arena_server import app

client = TestClient(app)

@patch('backend.app.crowd_control.arena_signage_translator.ModelInference')
def test_simulate_density_critical(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "WARNING: Crowd capacity exceeded. Seek alternative exits."
    mock_model_inference.return_value = mock_instance

    payload = {
        "sector_id": "Gate North",
        "max_capacity": 1000,
        "current_occupancy": 950,
        "flow_rate_per_minute": 120,
        "egress_gates": ["GATE-EAST"]
    }

    response = client.post("/api/v1/crowd/evaluate-sector?target_language=en", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["sector_id"] == "Gate North"
    assert data["severity_level"] == "HIGH" or data["severity_level"] == "CRITICAL"
    assert "WARNING" in data["digital_signage_message"]

@patch('backend.app.crowd_control.arena_signage_translator.ModelInference')
def test_simulate_density_nominal(mock_model_inference):
    payload = {
        "sector_id": "Gate North",
        "max_capacity": 1000,
        "current_occupancy": 200,
        "flow_rate_per_minute": 20,
        "egress_gates": ["GATE-EAST"]
    }

    response = client.post("/api/v1/crowd/evaluate-sector?target_language=en", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["sector_id"] == "Gate North"
    assert data["status"] == "safe"

@patch('backend.app.crowd_control.arena_signage_translator.ModelInference')
def test_simulate_density_critical_fallback(mock_model_inference):
    mock_instance = MagicMock()
    mock_instance.generate_text.side_effect = Exception("Offline")
    mock_model_inference.return_value = mock_instance
    payload = {
        "sector_id": "Gate North",
        "max_capacity": 1000,
        "current_occupancy": 950,
        "flow_rate_per_minute": 120,
        "egress_gates": ["GATE-EAST"]
    }
    response = client.post("/api/v1/crowd/evaluate-sector?target_language=en", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "capacity exceeded" in data["digital_signage_message"]
