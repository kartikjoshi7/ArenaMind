from datetime import UTC, datetime

from pydantic import BaseModel, Field


class StadiumSector(BaseModel):
    """
    Operational data model representing a specific physical sector within the venue.
    
    This model defines the spatial characteristics, real-time occupancy metrics, 
    and flow rate parameters necessary for deterministic crowd control systems to 
    predict and mitigate localized density hazards during a live event.
    """
    sector_id: str = Field(
        ...,
        description="Unique alphanumeric identifier for the sector (e.g., 'N-104').",
        examples=["N-104"]
    )
    max_capacity: int = Field(
        ...,
        gt=0,
        description="Maximum mathematically safe occupancy limit determined by fire safety and ingress/egress modeling."
    )
    current_occupancy: int = Field(
        ...,
        ge=0,
        description="Real-time count of individuals currently detected within the sector boundaries."
    )
    egress_gates: list[str] = Field(
        default_factory=list,
        description="List of gate identifiers serving as egress routes for this sector."
    )
    flow_rate_per_minute: float = Field(
        default=0.0,
        description="Calculated net flow of individuals per minute (positive indicates net ingress, negative indicates net egress)."
    )

    @property
    def capacity_utilization(self) -> float:
        """
        Calculates the current capacity utilization ratio.
        
        Returns:
            float: A percentage representing the utilization of the sector's maximum capacity.
        """
        if self.max_capacity == 0:
            return 0.0
        return (self.current_occupancy / self.max_capacity) * 100.0


class CongestionAlert(BaseModel):
    """
    High-priority alert payload generated when a StadiumSector approaches or exceeds safe operational density limits.
    
    This payload is consumed by downstream routing logic to initiate deterministic crowd diversion protocols 
    and subsequently by the AI phrasing layer to generate localized, natural-language multilingual signage updates.
    """
    alert_id: str = Field(
        ...,
        description="Unique UUID or sequence identifier for the congestion event."
    )
    sector_id: str = Field(
        ...,
        description="Identifier of the sector experiencing the density anomaly."
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="UTC timestamp of when the threshold breach was mathematically detected."
    )
    severity_level: str = Field(
        ...,
        description="Categorized severity of the alert ('ELEVATED', 'HIGH', 'CRITICAL')."
    )
    recommended_diversion_routes: list[str] = Field(
        default_factory=list,
        description="Calculated list of alternative sectors or gates to route incoming traffic towards based on deterministic capacity simulations."
    )
    requires_staff_intervention: bool = Field(
        default=False,
        description="Flag indicating if the autonomous routing logic is deemed insufficient and physical staff deployment is mandatory."
    )
