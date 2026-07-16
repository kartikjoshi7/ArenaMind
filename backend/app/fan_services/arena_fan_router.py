from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from ibm_watsonx_ai.foundation_models import ModelInference
import os
from .arena_pathfinder import ArenaPathfinder

router = APIRouter(prefix="/api/v1/fan", tags=["Fan Portal Services"])

# Initialize the deterministic engine
pathfinder_engine = ArenaPathfinder()

class FanQuery(BaseModel):
    module_type: str = Field(..., description="G1_PATHFINDING, G2_ACCESS, or G3_TRANSIT")
    origin: Optional[str] = None
    destination: Optional[str] = None
    needs: Optional[str] = None
    language: str = "English"

class FanResponse(BaseModel):
    structured_content: str
    raw_path: list[str] = []
    exploration_steps: list[str] = []
    pruned_edges: list[dict] = []

@router.post("/process-query", response_model=FanResponse)
async def process_fan_query(query: FanQuery):
    """
    Unified endpoint for Fan Portal interactions.
    Applies deterministic math first (Dijkstra), then translates via GenAI.
    """
    api_key = os.getenv("WATSONX_API_KEY")
    project_id = os.getenv("WATSONX_API_PROJECT_ID")
    url = os.getenv("WATSONX_API_URL")
        
    fallback_message = ""
    system_prompt = f"You are the ArenaMind OS automated intelligence system for the FIFA World Cup 2026. Output MUST be entirely in {query.language}."
    prompt = ""

    # 1. Deterministic Execution Phase
    if query.module_type == "G1_PATHFINDING":
        requires_step_free = (query.needs == "step_free")
        path, distance, exploration_steps, pruned_edges = pathfinder_engine.calculate_shortest_path(query.origin, query.destination, requires_step_free)
        
        if not path:
            fallback_message = f"Error: No valid path found from {query.origin} to {query.destination}. Please contact a steward."
        else:
            path_str = " -> ".join(path)
            fallback_message = f"ROUTE CONFIRMED [{distance} meters]: {path_str}"
            prompt = f"{system_prompt}\nThe mathematical routing engine has verified the following route: {path_str} (Total Distance: {distance}m). Please translate this exact route into a friendly, clear sentence without hallucinating any other locations."

    elif query.module_type == "G2_ACCESS":
        fallback_message = f"ACCOMMODATION LOGGED: Staff will meet you at {query.destination} to assist with {query.needs} requirements."
        prompt = f"{system_prompt}\nThe fan is heading to {query.destination} and requires {query.needs} accommodations. Draft a brief, supportive 3-point accommodation plan detailing how venue staff will assist them."

    elif query.module_type == "G3_TRANSIT":
        fallback_message = f"TRANSIT LOGGED: You are traveling {query.origin}km via {query.needs}. Please consider low-carbon alternatives if possible."
        prompt = f"{system_prompt}\nThe fan is travelling {query.origin} km to the stadium and prefers {query.needs}. Analyze this transit mode for environmental impact and suggest the most eco-friendly alternative if applicable, keeping the tone encouraging."
    else:
        raise HTTPException(status_code=400, detail="Invalid module_type")

    # 2. GenAI Phrasing Layer (Fail-Closed Fallback)
    try:
        if not api_key or not project_id or not url:
            raise ValueError("IBM Cloud credentials are not fully configured.")
            
        credentials = {
            "url": url,
            "apikey": api_key
        }
        
        model = ModelInference(
            model_id="meta-llama/llama-3-3-70b-instruct",
            credentials=credentials,
            project_id=project_id,
            params={
                "decoding_method": "greedy",
                "max_new_tokens": 512,
                "repetition_penalty": 1.1
            }
        )
        response_text = model.generate_text(prompt)
        
        # Inject raw path if this is a pathfinding query
        extracted_path = path if query.module_type == "G1_PATHFINDING" and path else []
        extracted_exploration = exploration_steps if query.module_type == "G1_PATHFINDING" else []
        extracted_pruned = pruned_edges if query.module_type == "G1_PATHFINDING" else []
        
        return FanResponse(
            structured_content=response_text, 
            raw_path=extracted_path,
            exploration_steps=extracted_exploration,
            pruned_edges=extracted_pruned
        )
        
    except Exception as e:
        # Graceful Degradation: Instantly return the deterministic raw data instead of hanging the UI
        print(f"[ArenaMind Warning] GenAI Offline. Degrading to deterministic fallback. Error: {str(e)}")
        extracted_path = path if query.module_type == "G1_PATHFINDING" and path else []
        extracted_exploration = exploration_steps if query.module_type == "G1_PATHFINDING" else []
        extracted_pruned = pruned_edges if query.module_type == "G1_PATHFINDING" else []
        
        return FanResponse(
            structured_content=fallback_message, 
            raw_path=extracted_path,
            exploration_steps=extracted_exploration,
            pruned_edges=extracted_pruned
        )

# End of file (Forces Uvicorn reload to pick up new text format)
@router.get("/venue-graph")
async def get_venue_graph():
    """
    Returns the strict deterministic topology (nodes and edges) for frontend visualization.
    Serves as the Single Source of Truth for the UI to render the StadiumMapVisualizer.
    """
    import json
    with open(pathfinder_engine.GRAPH_PATH if hasattr(pathfinder_engine, 'GRAPH_PATH') else os.path.join(os.path.dirname(__file__), '..', 'data', 'arena_venue_graph.json'), 'r') as f:
        return json.load(f)
