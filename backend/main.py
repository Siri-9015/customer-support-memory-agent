"""
RecallDesk — FastAPI Backend
AI Customer Support Agent with Persistent Memory via Hindsight

Architecture:
    Customer Message
        ↓
    POST /chat
        ↓
    1. Recall relevant memories from Hindsight (customer's bank)
        ↓
    2. Build memory-enriched system prompt
        ↓
    3. Send to Groq LLM → generate response
        ↓
    4. Extract key facts from conversation
        ↓
    5. Retain extracted facts in Hindsight
        ↓
    6. Return response + memories used to frontend
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import List

from dotenv import load_dotenv

# Load backend/.env before importing services that read environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from memory.hindsight_client import HindsightMemory
from services.llm_service import LLMService
from services.memory_extractor import MemoryExtractor
from services.demo_data import seed_demo_data, DEMO_CUSTOMERS
from models.schemas import (
    ChatRequest,
    ChatResponse,
    MemoryItem,
    RetainRequest,
    RetainResponse,
    RecallRequest,
    RecallResponse,
    HealthResponse,
)

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Global service instances ─────────────────────────────────────────────────
memory: HindsightMemory
llm: LLMService
extractor: MemoryExtractor


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise services on startup."""
    global memory, llm, extractor

    logger.info("Starting RecallDesk backend…")

    memory = HindsightMemory()
    await memory.async_init()
    llm = LLMService()
    extractor = MemoryExtractor()

    # Seed demo data on startup
    if os.getenv("SEED_DEMO_DATA", "true").lower() == "true":
        try:
            seeded = await seed_demo_data(memory)
            logger.info(f"Demo data seeded: {seeded}")
        except Exception as exc:
            logger.warning(f"Demo data seeding failed (non-critical): {exc}")

    logger.info(
        f"RecallDesk ready. "
        f"Hindsight={'connected' if memory.is_connected else 'fallback'}, "
        f"Groq={'configured' if llm.is_configured else 'missing key'}"
    )
    yield
    logger.info("RecallDesk backend shutting down.")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="RecallDesk API",
    description="AI Customer Support Agent with Persistent Memory via Hindsight",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend (Vite default port 5173, also 3000)
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Error handlers ────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check backend health, Hindsight connectivity, and Groq configuration."""
    return HealthResponse(
        status="ok",
        hindsight_connected=memory.is_connected,
        groq_configured=llm.is_configured,
        version="1.0.0",
        message=(
            "All systems operational"
            if memory.is_connected and llm.is_configured
            else "Partial degradation — check logs"
        ),
    )


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Main chat endpoint.

    Flow:
    1. Recall relevant memories from Hindsight for this customer.
    2. Build context-enriched prompt.
    3. Generate response via Groq.
    4. Extract facts from the conversation.
    5. Retain extracted facts in Hindsight.
    6. Return response + memories used.
    """
    customer_id = request.customer_id.strip()
    user_message = request.message.strip()

    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id cannot be empty.")
    if not user_message:
        raise HTTPException(status_code=400, detail="message cannot be empty.")

    # ── Step 1: Recall relevant memories ─────────────────────────────────────
    recalled = await memory.recall(customer_id=customer_id, query=user_message)
    logger.info(f"Recalled {len(recalled)} memories for customer={customer_id}")

    # ── Step 2 & 3: Generate LLM response with memory context ─────────────────
    response_text = llm.generate_response(
        customer_message=user_message,
        memories=recalled,
    )

    # ── Step 4: Extract facts from this conversation turn ─────────────────────
    facts = extractor.extract_facts(
        customer_message=user_message,
        agent_response=response_text,
        customer_id=customer_id,
    )

    # ── Step 5: Retain extracted facts in Hindsight ───────────────────────────
    retain_count = 0
    for fact in facts:
        success = await memory.retain(
            customer_id=customer_id,
            content=fact["content"],
            context=fact.get("context"),
        )
        if success:
            retain_count += 1

    logger.info(f"Retained {retain_count} new facts for customer={customer_id}")

    # ── Step 6: Build response ─────────────────────────────────────────────────
    memory_items = [
        MemoryItem(
            content=m.get("content", ""),
            relevance_score=m.get("relevance_score"),
            timestamp=m.get("timestamp"),
            context=m.get("context"),
        )
        for m in recalled
    ]

    return ChatResponse(
        customer_id=customer_id,
        message=user_message,
        response=response_text,
        memories_used=memory_items,
        memory_count=len(memory_items),
        memory_source=memory.source_label,
        session_id=request.session_id,
    )


@app.post("/memory/retain", response_model=RetainResponse, tags=["Memory"])
async def retain_memory(request: RetainRequest):
    """
    Explicitly store information in a customer's Hindsight memory bank.
    Useful for manually seeding customer context.
    """
    customer_id = request.customer_id.strip()
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id cannot be empty.")

    success = await memory.retain(
        customer_id=customer_id,
        content=request.content,
        context=request.context,
        timestamp=request.timestamp,
    )

    return RetainResponse(
        success=success,
        customer_id=customer_id,
        message="Memory retained successfully." if success else "Failed to retain memory.",
        source=memory.source_label,
    )


@app.post("/memory/recall", response_model=RecallResponse, tags=["Memory"])
async def recall_memories(request: RecallRequest):
    """
    Retrieve relevant memories for a customer from Hindsight.
    """
    customer_id = request.customer_id.strip()
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id cannot be empty.")

    recalled = await memory.recall(customer_id=customer_id, query=request.query)

    memory_items = [
        MemoryItem(
            content=m.get("content", ""),
            relevance_score=m.get("relevance_score"),
            timestamp=m.get("timestamp"),
            context=m.get("context"),
        )
        for m in recalled
    ]

    return RecallResponse(
        customer_id=customer_id,
        query=request.query,
        memories=memory_items,
        memory_count=len(memory_items),
        source=memory.source_label,
    )


@app.get("/memory/timeline/{customer_id}", tags=["Memory"])
async def memory_timeline(customer_id: str):
    """
    Retrieve all stored memories for a customer (for the Memory Timeline panel).
    """
    if not customer_id.strip():
        raise HTTPException(status_code=400, detail="customer_id cannot be empty.")

    all_memories = await memory.get_all_memories(customer_id=customer_id)

    return {
        "customer_id": customer_id,
        "memories": all_memories,
        "count": len(all_memories),
        "source": memory.source_label,
    }


@app.get("/customers/demo", tags=["Demo"])
async def get_demo_customers():
    """
    Return the list of pre-seeded demo customers for the UI selector.
    """
    return {"customers": DEMO_CUSTOMERS}


@app.post("/demo/seed", tags=["Demo"])
async def reseed_demo_data():
    """
    Re-seed demo customer memories. Useful for resetting the demo state.
    """
    try:
        seeded = await seed_demo_data(memory)
        return {
            "success": True,
            "message": "Demo data re-seeded successfully.",
            "seeded": seeded,
        }
    except Exception as exc:
        logger.error(f"Demo seed failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Seeding failed: {exc}")
