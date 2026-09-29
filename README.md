# RecallDesk

RecallDesk is an AI customer support agent that remembers customer context across conversations. Before answering, it recalls relevant memories, injects them into the Groq prompt, and stores durable facts extracted from each turn.

## Features

- Persistent, per-customer memory with Hindsight
- Automatic fact extraction for environment, issue, solution, preference, and outcome
- React chat interface with a customer selector and memory timeline
- Demo customers seeded on backend startup
- In-memory fallback when Hindsight is unavailable
- FastAPI health and memory endpoints

## Architecture

```text
Customer message
       |
       v
Recall customer memories from Hindsight
       |
       v
Generate a response with recalled context via Groq
       |
       v
Extract durable facts from the turn
       |
       v
Retain facts in the customer's memory bank
```

Each customer is isolated in a bank named `recalldesk-{customer_id}`.

## Requirements

- Python 3.10+
- Node.js 18+
- A Groq API key
- Docker, only if you want persistent Hindsight memory locally

## Quick Start

### 1. Configure the backend

From the repository root:

```powershell
Copy-Item .env.example backend\.env
```

Edit `backend/.env` and set `GROQ_API_KEY` to your own key. Do not commit `.env` or expose API keys in frontend code.

### 2. Start Hindsight (optional)

Hindsight is optional for local demos. Without it, the backend uses an in-memory fallback that is cleared when the process stops.

```powershell
docker run -d --pull always --name hindsight --restart unless-stopped `
  -p 8888:8888 -p 9999:9999 `
  -e HINDSIGHT_API_LLM_API_KEY=$env:GROQ_API_KEY `
  -e HINDSIGHT_API_LLM_PROVIDER=groq `
  -v hindsight-data:/home/hindsight/.pg0 `
  ghcr.io/vectorize-io/hindsight:latest
```

Hindsight API: `http://localhost:8888`

Hindsight UI: `http://localhost:9999`

### 3. Install and start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend API: `http://localhost:8000`

Interactive API docs: `http://localhost:8000/docs`

### 4. Install and start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite development server proxies `/api` requests to `http://localhost:8000`. To use a different backend URL, create `frontend/.env` with:

```text
VITE_API_URL=http://localhost:8000
```

## Useful Commands

Backend:

```powershell
uvicorn main:app --reload --port 8000
```

Frontend development server:

```powershell
npm run dev
```

Frontend production build:

```powershell
npm run build
```

Frontend lint:

```powershell
npm run lint
```

## API Overview

- `GET /health` - Check backend, Groq, and Hindsight status
- `POST /chat` - Chat with the memory-enabled support agent
- `POST /memory/retain` - Store a customer memory explicitly
- `POST /memory/recall` - Retrieve memories relevant to a query
- `GET /memory/timeline/{customer_id}` - List a customer's stored memories
- `GET /customers/demo` - List demo customers
- `POST /demo/seed` - Re-seed demo memories

## Environment Variables

The root `.env.example` documents the available settings:

- `GROQ_API_KEY` - Groq authentication key
- `GROQ_MODEL` - Groq model, defaulting to `llama-3.3-70b-versatile`
- `HINDSIGHT_BASE_URL` - Hindsight API URL, defaulting to `http://localhost:8888`
- `CORS_ORIGINS` - Comma-separated frontend origins
- `SEED_DEMO_DATA` - Whether to seed demo data on startup
- `VITE_API_URL` - Optional frontend API URL override

## Project Structure

```text
backend/
  main.py                    FastAPI application and routes
  memory/hindsight_client.py Hindsight integration and fallback store
  models/schemas.py          Request and response models
  services/                  LLM, extraction, and demo-data services
frontend/
  src/                       React application
  src/utils/api.ts           Backend API client
article.md                   Design notes and implementation rationale
```

## Memory Behavior

With Hindsight connected, memories are semantically recalled and persisted between restarts. If Hindsight cannot be reached, the backend automatically switches to a keyword-based in-memory store so the demo remains usable. The `/health` endpoint reports the active memory source.

See [article.md](article.md) for the detailed design discussion and lessons learned.
