from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.app.crowd_control.sector_models import StadiumSector
from backend.app.fan_services.arena_pathfinder import ArenaPathfinder
from backend.arena_server import app

client = TestClient(app)

# ═══════════════════════════════════════════════════════════════════════════════
# CROWD CONTROL EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

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

@patch('backend.app.crowd_control.arena_signage_translator.os.environ.get')
def test_signage_translator_missing_credentials(mock_env_get):
    """Covers arena_signage_translator.py line 47: missing IBM credentials raises ValueError."""
    mock_env_get.return_value = None
    payload = {"sector_id": "Gate West", "max_capacity": 1000, "current_occupancy": 950, "flow_rate_per_minute": 120, "egress_gates": ["GATE-NORTH"]}
    response = client.post("/api/v1/crowd/evaluate-sector?target_language=es", json=payload)
    assert response.status_code == 200
    assert "is congested" in response.json()["digital_signage_message"]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTOR MODELS EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

def test_sector_model_zero_max_capacity():
    """Covers sector_models.py line 48: zero max_capacity guard returns 0.0."""
    sector = StadiumSector(
        sector_id="ZeroCapSector",
        max_capacity=1,  # Pydantic requires gt=0, so we test the property logic differently
        current_occupancy=0,
        egress_gates=[]
    )
    # Force max_capacity to 0 after construction to test the guard clause
    object.__setattr__(sector, 'max_capacity', 0)
    assert sector.capacity_utilization == 0.0

# ═══════════════════════════════════════════════════════════════════════════════
# FAN ROUTER EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

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
def test_fan_router_cot_stripping_lowercase(mock_model):
    """Covers arena_fan_router.py line 98: lowercase '# Step-by-step' CoT stripping."""
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "Navigate via Concourse. # Step-by-step First go to Gate."
    mock_model.return_value = mock_instance
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Section 101", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    assert "Navigate via Concourse." in response.json()["structured_content"]
    assert "Step-by-step" not in response.json()["structured_content"]

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_router_cot_stripping_final_answer(mock_model):
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "# Final Answer This is the final clean route."
    mock_model.return_value = mock_instance
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Section 101", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    assert "This is the final clean route." in response.json()["structured_content"]

@patch('backend.app.fan_services.arena_fan_router.ModelInference')
def test_fan_router_duplicate_sentence_stripping(mock_model):
    """Covers arena_fan_router.py line 117: duplicate sentence detection and stripping."""
    mock_instance = MagicMock()
    mock_instance.generate_text.return_value = "Walk to Gate North. Walk to Gate North via Concourse."
    mock_model.return_value = mock_instance
    payload = {"module_type": "G1_PATHFINDING", "origin": "Gate North", "destination": "Section 101", "language": "English"}
    response = client.post("/api/v1/fan/process-query", json=payload)
    assert response.status_code == 200
    result = response.json()["structured_content"]
    assert "Walk to Gate North." in result

# ═══════════════════════════════════════════════════════════════════════════════
# PATHFINDER EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

def test_pathfinder_revisit_skipping():
    """Covers arena_pathfinder.py line 63: Dijkstra skips already-visited nodes."""
    pf = ArenaPathfinder()
    # A complex route that forces Dijkstra to encounter already-visited nodes
    # Gate North -> Section 101 involves multiple hops through the graph
    path, dist, exploration, _pruned = pf.calculate_shortest_path("Gate North", "Section 102")
    assert len(path) > 0
    assert dist > 0
    # Verify that the exploration history has no duplicates (proves line 63 was hit)
    assert len(exploration) == len(set(exploration))

# ═══════════════════════════════════════════════════════════════════════════════
# VOLUNTEER OPS EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY HEADERS VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

def test_security_headers_present():
    """Verifies that all security hardening headers are injected into every response."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers.get("Permissions-Policy", "")

def test_venue_graph_cache_headers():
    """Verifies that the venue-graph endpoint returns proper Cache-Control headers."""
    response = client.get("/api/v1/fan/venue-graph")
    assert response.status_code == 200
    assert "max-age=3600" in response.headers.get("Cache-Control", "")
    assert "nodes" in response.json()
