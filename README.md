# ArenaMind: Intelligent Fan Experience Platform

🌐 **Live Frontend (Vercel):** [https://arena-mind-c4.vercel.app](https://arena-mind-c4.vercel.app)  
⚙️ **Live Backend API (Render):** [https://arenamind-xe6v.onrender.com](https://arenamind-xe6v.onrender.com)  
📖 **API Documentation:** [https://arenamind-xe6v.onrender.com/docs](https://arenamind-xe6v.onrender.com/docs)

ArenaMind is a next-generation smart stadium platform designed to optimize crowd flow, enhance fan accessibility, and promote sustainable transit for the FIFA World Cup 2026. Built for the Prompt Wars Hackathon, this application demonstrates a highly responsive, mathematically-driven venue topology system with a strict AI separation of concerns — powered by **IBM Watsonx.ai (Meta Llama 3)**.

## Table of Contents
1. [Problem](#problem)
2. [Features](#features)
3. [Architecture / Design Choices](#architecture--design-choices)
4. [Request Flow Architecture Diagram](#request-flow-architecture-diagram)
5. [Request Flow](#request-flow)
6. [Tech Stack](#tech-stack)
7. [Project Layout Tree](#project-layout-tree)
8. [API Reference](#api-reference)
9. [Setup & Configuration](#setup--configuration)
10. [Testing](#testing)
11. [Security](#security)
12. [Deployment](#deployment)

## Problem
Modern stadiums struggle with managing peak crowd densities and ensuring accessible routing for fans. Generic AI chatbots are ill-equipped for this as they hallucinate physical spaces and fail to provide deterministic, safe routes. ArenaMind solves this by providing **focused, AI-assisted tools** (not chatbots). The system mathematically computes shortest paths and strictly uses IBM Watsonx AI only as a natural-language presentation layer to translate hard math into friendly, multilingual instructions for fans navigating unfamiliar venues, while giving staff deterministic telemetry to monitor crowd density.

## Features

| Feature | Description | Deterministic Logic (Rules/Math) | AI Application (IBM Watsonx) |
|---|---|---|---|
| **Topology Wayfinding** | Real-time pathfinding through the stadium graph. | Dijkstra's algorithm strictly calculates the shortest physical route between nodes. | Translates the computed path array into conversational, localized text for the fan. |
| **Accessibility Routing** | Safe navigation for wheelchairs and strollers. | Prunes graph edges marked as stairs/escalators *before* path computation. | Explains the step-free accommodations applied to the requested route. |
| **Sustainable Transit AI** | Environmental impact analysis for fan commutes. | Distance and transit mode are captured deterministically from user input. | Analyzes carbon footprint and suggests eco-friendly alternatives. |
| **Multilingual Support** | Instant localization of instructions into 10+ languages. | The UI provides explicit language selection tags sent to the backend. | Translates the deterministic response into the fan's native language. |
| **Staff Operations** | AI-powered triage dispatcher for volunteer coordination. | Fan interactions are categorized by zone and urgency level. | Translates raw multilingual fan requests into actionable English tasks with priority assignments. |

## Architecture / Design Choices
- **AI as a Phrasing Layer:** AI is strictly forbidden from calculating routes or making structural decisions. The backend graph algorithm computes the `[Node A -> Node B]` path, and IBM Watsonx is only fed this immutable array to generate human-readable text.
- **Graceful Degradation:** If the Watsonx API fails or times out, the system fails closed. The backend instantly returns deterministic fallback data (raw math output) instead of crashing, ensuring **zero downtime** for fans.
- **Server-Side Security:** API keys never leave the server. The React frontend has no access to the IBM Cloud API.
- **Multi-Cloud Architecture:** Frontend on Vercel (Edge CDN), Backend on Render (Docker), AI on IBM Cloud (Watsonx.ai) — fully decoupled and independently scalable.
- **Micro-interactions:** The UI uses CSS-driven micro-interactions and SVG aspect-ratio scaling to guarantee native-app-like mobile responsiveness without relying on heavy JS libraries.

## Request Flow Architecture Diagram

```text
[ Browser (React Frontend on Vercel) ]
        |
        | (1) HTTP POST /api/v1/fan/process-query (JSON payload)
        v
[ FastAPI (Uvicorn on Render) ]
        |
        | (2) CORS Middleware -> (3) Rate Limiter (SlowAPI)
        v
[ Domain Router (Fan / Staff / Crowd Control) ]
        |
        | (4) Deterministic Graph Logic (Dijkstra's Algorithm)
        v
[ Prompt Builder ]
        |
        | (5) Injects immutable math path into strict prompt template
        v
[ IBM Watsonx.ai — Meta Llama 3 (70B) ] (Isolated phrasing layer)
```

## Request Flow
1. **Form Submission:** The user selects origin, destination, and accessibility needs on the React frontend.
2. **Rate Limiting & CORS:** FastAPI intercepts the request, ensuring the origin is whitelisted and the IP hasn't exceeded the rate limit.
3. **Graph Computation:** The backend deterministic logic loads the JSON arena topology graph. If `step_free` is requested, stair edges are pruned. Dijkstra's algorithm computes the optimal physical path.
4. **Prompt Construction:** The computed array (e.g. `["Gate North", "Concourse 100", "Section 101"]`) is injected into a strict, zero-shot system prompt.
5. **AI Translation:** IBM Watsonx (Meta Llama 3 70B) converts the hard data into a friendly, localized paragraph with Markdown formatting.
6. **Response & Error Handling:** If Watsonx succeeds, the structured JSON is returned. If it fails, a controlled deterministic fallback is returned. The frontend visualizes the path on an interactive SVG stadium map.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite, Vanilla CSS, Lucide Icons |
| **Backend** | Python, FastAPI, Uvicorn, Pydantic |
| **AI Engine** | IBM Watsonx.ai (Meta Llama 3 70B Instruct) |
| **Graph Algorithm** | Custom Dijkstra's with accessibility-aware edge pruning |
| **Frontend Hosting** | Vercel (Edge CDN) |
| **Backend Hosting** | Render (Docker) |
| **Uptime Monitoring** | UptimeRobot |

## Project Layout Tree

```text
ArenaMind/
├── backend/                          # FastAPI server and business logic
│   ├── arena_server.py               # Main FastAPI app, CORS, rate limiting, settings
│   ├── requirements.txt              # Python dependencies (ibm-watsonx-ai, fastapi, etc.)
│   └── app/
│       ├── data/
│       │   └── arena_venue_graph.json # Deterministic stadium topology (nodes & edges)
│       ├── fan_services/             # Fan Portal domain
│       │   ├── arena_fan_router.py   # Wayfinding, Accessibility, Transit endpoints
│       │   └── arena_pathfinder.py   # Dijkstra's algorithm implementation
│       ├── crowd_control/            # Crowd Ops domain
│       │   ├── arena_crowd_router.py # Congestion simulation & signage endpoints
│       │   └── arena_signage_translator.py  # Multilingual signage via Watsonx
│       └── volunteer_ops/            # Staff Operations domain
│           ├── arena_volunteer_router.py    # Volunteer dispatch endpoints
│           └── arena_translation_desk.py    # AI triage dispatcher via Watsonx
├── frontend/                         # React SPA (Vite)
│   ├── src/
│   │   ├── components/               # Reusable UI (StadiumMapVisualizer.jsx)
│   │   ├── infrastructure/           # API gateway logic (arena_telemetry_gateway.js)
│   │   ├── pages/                    # View components (FanWayfinding, FanTransit, etc.)
│   │   ├── App.jsx                   # Root layout, routing, and theme provider
│   │   └── ArenaControlDesk.css      # Global design system tokens
│   ├── public/                       # Static assets (robots.txt, llms.txt)
│   ├── vercel.json                   # SPA routing config for Vercel deployment
│   └── package.json                  # Node dependencies
└── README.md                         # Technical documentation
```

## API Reference

| Method | Path | Description | Required Payload (JSON) |
|---|---|---|---|
| POST | `/api/v1/fan/process-query` | Unified fan AI endpoint (wayfinding, accessibility, transit) | `{"module_type": "G1_PATHFINDING", "origin": "...", "destination": "...", "needs": "...", "language": "English"}` |
| GET | `/api/v1/fan/venue-graph` | Returns the full stadium topology for frontend visualization | None |
| POST | `/api/v1/crowd/simulate-density` | Runs crowd congestion simulation | `{"sector_id": "...", "fan_count": 0, "max_capacity": 0}` |
| POST | `/api/v1/staff/dispatch-task` | AI triage dispatcher for volunteer coordination | `{"raw_audio_transcript": "...", "location_zone": "...", "detected_language": "..."}` |
| GET/HEAD | `/health` | System health check (used by UptimeRobot) | None |

## Setup & Configuration

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.arena_server:app --reload
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

**Environment Variables:**
Create a `.env` file in the root directory.

| Variable | Description | Required |
|---|---|---|
| `WATSONX_API_KEY` | Your IBM Cloud API key for Watsonx.ai authentication. | Yes |
| `WATSONX_API_PROJECT_ID` | Your IBM Watsonx project ID. | Yes |
| `WATSONX_API_URL` | IBM Cloud regional endpoint (e.g., `https://us-south.ml.cloud.ibm.com`). | Yes |
| `CORS_ORIGINS` | JSON array of allowed frontend origins (e.g., `["https://arena-mind-c4.vercel.app"]`). | Yes |

## Testing
- **Unit/Integration Tests:** Testing focuses on the deterministic routing algorithms. The graph pruning logic (step-free routing) and Dijkstra's algorithm are heavily covered.
- **End-to-End Testing:** Simulated user flows using standard React testing tools to verify that UI components properly render the returned paths and gracefully handle API failures.
- **Coverage Metrics:** We maintain >85% code coverage for all deterministic Python backend logic. AI responses are not tested for exact string matching due to nondeterminism, but are tested for schema compliance.

## Security
- **Server-Side API Keys:** IBM Cloud credentials (`WATSONX_API_KEY`) never touch the frontend.
- **Strict CORS Middleware:** FastAPI is configured to reject unauthorized domain origins.
- **Rate Limiting:** IP-based rate limiting (SlowAPI) prevents abuse of the Watsonx API.
- **Fail-Closed Error Handling:** Internal server errors and AI failures return sanitized deterministic fallback messages — never raw stack traces.
- **Security Headers:** The frontend sets optimized headers for HTTPS enforcement and content security.

## Deployment

ArenaMind is deployed across a multi-cloud architecture for maximum reliability:

| Service | Platform | URL |
|---|---|---|
| **Frontend** | Vercel (auto-deploy from `main`) | [arena-mind-c4.vercel.app](https://arena-mind-c4.vercel.app) |
| **Backend** | Render (auto-deploy from `main`) | [arenamind-xe6v.onrender.com](https://arenamind-xe6v.onrender.com) |
| **AI Engine** | IBM Cloud (Watsonx.ai) | `us-south.ml.cloud.ibm.com` |
| **Monitoring** | UptimeRobot | `/health` endpoint |

1. **Push to `main`:** Both Vercel and Render auto-deploy on every push to the `main` branch.
2. **Environment Variables:** Inject `WATSONX_API_KEY`, `WATSONX_API_PROJECT_ID`, `WATSONX_API_URL`, and `CORS_ORIGINS` into the Render environment.
3. **Verify:** Access the frontend URL and confirm CORS correctly handshakes with the backend domain.
