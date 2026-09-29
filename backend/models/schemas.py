"""
Pydantic schemas for RecallDesk API request/response models.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChatRequest(BaseModel):
    customer_id: str = Field(..., min_length=1, max_length=100, description="Unique customer identifier")
    message: str = Field(..., min_length=1, max_length=4000, description="Customer message")
    session_id: Optional[str] = Field(None, description="Optional session identifier for conversation grouping")


class MemoryItem(BaseModel):
    content: str
    relevance_score: Optional[float] = None
    timestamp: Optional[str] = None
    context: Optional[str] = None


class ChatResponse(BaseModel):
    customer_id: str
    message: str
    response: str
    memories_used: List[MemoryItem] = []
    memory_count: int = 0
    memory_source: str = "hindsight"  # "hindsight" | "fallback" | "none"
    session_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class RetainRequest(BaseModel):
    customer_id: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=8000)
    context: Optional[str] = Field(None, max_length=500)
    timestamp: Optional[str] = None


class RetainResponse(BaseModel):
    success: bool
    customer_id: str
    message: str
    source: str = "hindsight"


class RecallRequest(BaseModel):
    customer_id: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=2000)


class RecallResponse(BaseModel):
    customer_id: str
    query: str
    memories: List[MemoryItem] = []
    memory_count: int = 0
    source: str = "hindsight"


class HealthResponse(BaseModel):
    status: str
    hindsight_connected: bool
    groq_configured: bool
    version: str = "1.0.0"
    message: str
