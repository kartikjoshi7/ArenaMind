import uuid

from backend.app.crowd_control.sector_models import CongestionAlert, StadiumSector


def evaluate_sector_status(sector: StadiumSector) -> CongestionAlert | None:
    """
    Deterministically evaluates the density hazard of a sector and generates an alert if thresholds are breached.

    This function strictly avoids LLM or non-deterministic calls. If the capacity utilization
    exceeds the critical threshold (85%), it algorithmically selects alternative routing paths
    from the sector's known egress gates.

    Args:
        sector (StadiumSector): The sector data model containing real-time telemetry.

    Returns:
        Optional[CongestionAlert]: An alert payload if the density threshold is exceeded, None otherwise.
    """
    critical_utilization_threshold = 85.0

    if sector.capacity_utilization > critical_utilization_threshold:
        # Deterministic logic to select alternative gates.
        # For this engine, we provide the available egress gates or a fallback.
        recommended_routes = sector.egress_gates.copy() if sector.egress_gates else ["MAIN_CONCOURSE_FALLBACK"]

        # Determine severity based on how far past the threshold we are
        severity = "CRITICAL" if sector.capacity_utilization >= 95.0 else "HIGH"

        # Determine if physical staff deployment is mandatory based on incoming flow rate
        requires_staff = sector.flow_rate_per_minute > 50.0

        return CongestionAlert(
            alert_id=f"alert-{uuid.uuid4()}",
            sector_id=sector.sector_id,
            severity_level=severity,
            recommended_diversion_routes=recommended_routes,
            requires_staff_intervention=requires_staff
        )

    return None
