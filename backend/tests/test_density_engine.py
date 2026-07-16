from backend.app.crowd_control.arena_density_engine import evaluate_sector_status
from backend.app.crowd_control.sector_models import StadiumSector

def test_density_engine_evaluate_nominal():
    sector = StadiumSector(sector_id="Gate North", current_occupancy=80, max_capacity=100, flow_rate_per_minute=20, egress_gates=[])
    alert = evaluate_sector_status(sector)
    assert alert is None

def test_density_engine_evaluate_critical():
    sector = StadiumSector(sector_id="Gate North", current_occupancy=96, max_capacity=100, flow_rate_per_minute=60, egress_gates=["Gate 2"])
    alert = evaluate_sector_status(sector)
    assert alert is not None
    assert alert.severity_level == "CRITICAL"
    assert alert.requires_staff_intervention is True
    assert "Gate 2" in alert.recommended_diversion_routes

