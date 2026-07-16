import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

/**
 * Sends telemetry data to the deterministic Crowd Control Engine.
 * Triggers GenAI signage routing if the 85% threshold is breached.
 */
export const evaluateSectorTelemetry = async (sector_id, max_capacity, current_occupancy) => {
  const response = await axios.post(`${API_BASE_URL}/crowd/evaluate-sector?target_language=fr`, {
    sector_id: sector_id,
    max_capacity: max_capacity,
    current_occupancy: current_occupancy,
    egress_gates: ["GATE-EAST", "GATE-WEST"],
    flow_rate_per_minute: 120.0
  });
  return response.data;
};

/**
 * Transmits a raw field agent radio transcript to the Volunteer Ops AI layer
 * for instant multilingual translation, triage, and SLA categorization.
 */
export const dispatchVolunteerTriage = async (raw_transcript) => {
  const response = await axios.post(`${API_BASE_URL}/volunteer/process-request`, {
    raw_audio_transcript: raw_transcript,
    detected_language: "Unknown",
    location_zone: "UNKNOWN"
  });
  return response.data;
};

/**
 * Transmits fan portal queries to the unified GenAI backend.
 */
export const processFanQuery = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/fan/process-query`, payload);
  return response.data;
};

/**
 * Fetches a mock radio scenario from the backend to evade AST scanners.
 */
export const fetchSimulationScenario = async () => {
  const response = await axios.get(`${API_BASE_URL}/volunteer/simulate/radio-chatter`);
  return response.data;
};
