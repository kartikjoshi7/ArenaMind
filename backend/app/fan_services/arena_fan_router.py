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
    system_prompt = f"You are an expert stadium navigation guide for the FIFA World Cup 2026. Output MUST be entirely in {query.language}. Use **bold text** for key locations and metrics."
    prompt = ""
    max_tokens = 100
    module_constraints = ""

    # 1. Deterministic Execution Phase
    if query.module_type == "G1_PATHFINDING":
        requires_step_free = (query.needs == "step_free")
        path, distance, exploration_steps, pruned_edges = pathfinder_engine.calculate_shortest_path(query.origin, query.destination, requires_step_free) # type: ignore
        
        if not path:
            fallback_message = f"Error: No valid path found from {query.origin} to {query.destination}. Please contact a steward."
        else:
            path_str = " -> ".join(path)
            fallback_message = f"To get from **{query.origin}** to **{query.destination}**, walk along **{path_str}** (Total Distance: **{distance}m**)."
            prompt = f"{system_prompt}\nThe verified path is: {path_str} (Distance: {distance}m). Write a single concise, friendly sentence describing how to walk this route from {query.origin} to {query.destination}."
            module_constraints = "STRICT RULES: Output ONLY 1 concise sentence. Do NOT use bullet points, list prefixes, hashtags, or repeated sentences. No CoT analysis."
            max_tokens = 80

    elif query.module_type == "G2_ACCESS":
        fallback_message = f"ACCOMMODATION LOGGED: Staff will meet you at {query.destination} to assist with {query.needs} requirements."
        prompt = f"{system_prompt}\nThe fan is heading to {query.destination} and requires {query.needs} accommodations. Draft a brief, supportive 3-point accommodation plan detailing how venue staff will assist them."
        module_constraints = "STRICT RULES: Output EXACTLY 3 short bullet points. Do NOT include introductory or concluding paragraphs. No hashtags or CoT analysis."
        max_tokens = 200

    elif query.module_type == "G3_TRANSIT":
        fallback_message = f"TRANSIT LOGGED: You are traveling {query.origin}km via {query.needs}. Please consider low-carbon alternatives if possible."
        prompt = f"{system_prompt}\nThe fan is travelling {query.origin} km to the stadium and prefers {query.needs}. Analyze this transit mode for environmental impact and suggest the most eco-friendly alternative if applicable, keeping the tone encouraging."
        module_constraints = "STRICT RULES: Keep it under 3 short sentences. Do NOT hallucinate specific city names (like New York or Los Angeles). Do NOT include hashtags or CoT analysis."
        max_tokens = 200
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
        
        prompt_with_constraints = f"{prompt}\n{module_constraints}"

        model = ModelInference(
            model_id="mistralai/mistral-small-3-1-24b-instruct-2503",
            credentials=credentials,
            project_id=project_id,
            params={
                "decoding_method": "greedy",
                "max_new_tokens": max_tokens,
                "repetition_penalty": 1.2
            }
        )
        response_text = str(model.generate_text(prompt_with_constraints))

        # Post-process response to strip CoT artifacts and hashtags
        import re
        clean_text = response_text
        if "# Step-by-step" in clean_text:
            clean_text = clean_text.split("# Step-by-step")[0]
        if "# Step-by-Step" in clean_text:
            clean_text = clean_text.split("# Step-by-Step")[0]
        if "# Final Answer" in clean_text:
            clean_text = clean_text.split("# Final Answer")[-1]
        
        # Strip hashtags (e.g. #ArenaMindOS #FIFAWorldCup2026)
        clean_text = re.sub(r'#[A-Za-z0-9_]+', '', clean_text)
        
        # Strip LaTeX math boxes and symbols
        clean_text = re.sub(r'\\?boxed\{([^}]+)\}', r'\1', clean_text)
        clean_text = re.sub(r'\$[\$]?', '', clean_text)
        clean_text = clean_text.strip()

        # For G1 specifically, strip any leading bullet points just in case
        if query.module_type == "G1_PATHFINDING":
            clean_text = re.sub(r'^[\*\-\s\•]+', '', clean_text).strip()
            sentences = [s.strip() for s in clean_text.split('.') if s.strip()]
            if len(sentences) >= 2 and sentences[0] in sentences[1]:
                clean_text = sentences[0] + '.'
        
        # Inject raw path if this is a pathfinding query
        extracted_path = path if query.module_type == "G1_PATHFINDING" and path else []
        extracted_exploration = exploration_steps if query.module_type == "G1_PATHFINDING" else []
        extracted_pruned = pruned_edges if query.module_type == "G1_PATHFINDING" else []
        
        return FanResponse(
            structured_content=clean_text or fallback_message, 
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
