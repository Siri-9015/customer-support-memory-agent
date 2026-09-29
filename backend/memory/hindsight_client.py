"""
Hindsight memory integration for RecallDesk.

Uses the official hindsight-client SDK:
  pip install hindsight-client

Hindsight server runs via Docker:
  docker run -d --pull always --name hindsight --restart unless-stopped \
    -p 8888:8888 -p 9999:9999 \
    -e HINDSIGHT_API_LLM_API_KEY=$GROQ_API_KEY \
    -e HINDSIGHT_API_LLM_PROVIDER=groq \
    -v hindsight-data:/home/hindsight/.pg0 \
    ghcr.io/vectorize-io/hindsight:latest

API:  http://localhost:8888
UI:   http://localhost:9999

Each customer gets their own isolated bank_id = f"recalldesk-customer-{customer_id}"
This ensures zero cross-customer memory leakage.

NOTE: All public methods are async. The Hindsight SDK sync wrappers
(recall/retain/reflect) use loop.run_until_complete() internally and will
raise "This event loop is already running" inside FastAPI. Always use the
a-prefixed async methods (arecall, aretain, areflect).
"""

import os
import logging
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Try to import the real Hindsight client ──────────────────────────────────
try:
    from hindsight_client import Hindsight  # type: ignore
    HINDSIGHT_AVAILABLE = True
except ImportError:
    HINDSIGHT_AVAILABLE = False
    logger.warning(
        "hindsight-client not installed. "
        "Run: pip install hindsight-client\n"
        "Falling back to in-memory store for development."
    )


# ── Fallback in-memory store (development / Hindsight unavailable) ───────────
_fallback_store: dict[str, list[dict]] = {}


def _fallback_retain(bank_id: str, content: str, context: Optional[str] = None) -> bool:
    """Simple in-memory fallback when Hindsight is unavailable."""
    if bank_id not in _fallback_store:
        _fallback_store[bank_id] = []
    _fallback_store[bank_id].append({
        "content": content,
        "context": context or "",
        "timestamp": datetime.utcnow().isoformat(),
    })
    return True


def _fallback_recall(bank_id: str, query: str) -> List[dict]:
    """Naive keyword-based recall for the fallback store."""
    if bank_id not in _fallback_store:
        return []
    query_lower = query.lower()
    query_words = set(query_lower.split())
    results = []
    for item in _fallback_store[bank_id]:
        content_lower = item["content"].lower()
        matching = sum(1 for w in query_words if w in content_lower)
        if matching > 0:
            results.append({**item, "relevance_score": matching / max(len(query_words), 1)})
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:5]


# ── HindsightMemory class ────────────────────────────────────────────────────

class HindsightMemory:
    """
    Async wrapper around the Hindsight Python client.

    All public methods are async — safe to call from FastAPI route handlers
    and lifespan hooks without triggering "event loop already running" errors.

    Each customer gets a dedicated bank identified by:
        bank_id = f"recalldesk-{customer_id}"
    """

    def __init__(self):
        self.base_url = os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888")
        self._client: Optional[object] = None
        self._connected = False
        self._use_fallback = not HINDSIGHT_AVAILABLE

        if HINDSIGHT_AVAILABLE:
            # Only create the client object here — connectivity probe happens
            # in async_init() which must be awaited inside an async context.
            try:
                self._client = Hindsight(base_url=self.base_url)
            except Exception as exc:
                logger.warning(f"Failed to create Hindsight client: {exc}")
                self._use_fallback = True
        else:
            logger.warning("Operating in FALLBACK mode — Hindsight not installed.")

    async def async_init(self):
        """
        Async connectivity probe. Call this once from FastAPI lifespan
        after constructing HindsightMemory(), e.g.:
            memory = HindsightMemory()
            await memory.async_init()
        """
        if self._use_fallback or self._client is None:
            return

        try:
            await self._client.arecall(  # type: ignore
                bank_id="recalldesk-probe", query="health check"
            )
            self._connected = True
            logger.info(f"Hindsight connected at {self.base_url}")
        except Exception as exc:
            # A 404 "Bank not found" means Hindsight IS reachable — the probe
            # bank simply doesn't exist yet. Treat it as a successful connection.
            exc_str = str(exc)
            if "404" in exc_str or "not found" in exc_str.lower() or "Bank" in exc_str:
                self._connected = True
                logger.info(f"Hindsight connected at {self.base_url}")
            else:
                self._connected = False
                self._use_fallback = True
                logger.warning(
                    f"Cannot reach Hindsight at {self.base_url}: {exc}\n"
                    "Switching to in-memory fallback."
                )

    @property
    def is_connected(self) -> bool:
        return self._connected and not self._use_fallback

    @property
    def source_label(self) -> str:
        return "hindsight" if self.is_connected else "fallback"

    def _make_bank_id(self, customer_id: str) -> str:
        safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in customer_id)
        return f"recalldesk-{safe.lower()}"

    # ── Public async API ──────────────────────────────────────────────────────

    async def retain(
        self,
        customer_id: str,
        content: str,
        context: Optional[str] = None,
        timestamp: Optional[str] = None,
    ) -> bool:
        bank_id = self._make_bank_id(customer_id)
        ts = timestamp or datetime.utcnow().isoformat() + "Z"

        if self._use_fallback:
            result = _fallback_retain(bank_id, content, context)
            logger.debug(f"[FALLBACK] retain → bank={bank_id}")
            return result

        try:
            kwargs: dict = {"bank_id": bank_id, "content": content}
            if context:
                kwargs["context"] = context
            if ts:
                kwargs["timestamp"] = ts
            await self._client.aretain(**kwargs)  # type: ignore
            logger.debug(f"[Hindsight] retain → bank={bank_id}, context={context}")
            return True
        except Exception as exc:
            logger.error(f"Hindsight retain failed: {exc}")
            _fallback_retain(bank_id, content, context)
            return True

    async def recall(
        self,
        customer_id: str,
        query: str,
    ) -> List[dict]:
        bank_id = self._make_bank_id(customer_id)

        if self._use_fallback:
            results = _fallback_recall(bank_id, query)
            logger.debug(f"[FALLBACK] recall → bank={bank_id}, found={len(results)}")
            return results

        try:
            raw = await self._client.arecall(bank_id=bank_id, query=query)  # type: ignore
            memories = _normalise_recall_results(raw)
            logger.debug(f"[Hindsight] recall → bank={bank_id}, found={len(memories)}")
            return memories
        except Exception as exc:
            logger.error(f"Hindsight recall failed: {exc}")
            return _fallback_recall(bank_id, query)

    async def reflect(
        self,
        customer_id: str,
        query: str,
    ) -> str:
        bank_id = self._make_bank_id(customer_id)

        if self._use_fallback:
            items = _fallback_recall(bank_id, query)
            return " | ".join(i["content"] for i in items[:3]) if items else ""

        try:
            result = await self._client.areflect(bank_id=bank_id, query=query)  # type: ignore
            if hasattr(result, "text"):
                return result.text
            if isinstance(result, str):
                return result
            if hasattr(result, "content"):
                return result.content
            return str(result)
        except Exception as exc:
            logger.error(f"Hindsight reflect failed: {exc}")
            items = _fallback_recall(bank_id, query)
            return " | ".join(i["content"] for i in items[:3]) if items else ""

    async def get_all_memories(self, customer_id: str) -> List[dict]:
        """Return all stored memories for a customer (timeline view)."""
        bank_id = self._make_bank_id(customer_id)

        if self._use_fallback:
            return _fallback_store.get(bank_id, [])

        try:
            raw = await self._client.memory.list_memories(  # type: ignore
                bank_id=bank_id, limit=50
            )
            return _normalise_recall_results(raw)
        except Exception as exc:
            logger.warning(f"Hindsight list_memories failed, falling back to recall: {exc}")
            try:
                raw = await self._client.arecall(  # type: ignore
                    bank_id=bank_id,
                    query="customer history issues preferences environment",
                )
                return _normalise_recall_results(raw)
            except Exception as exc2:
                logger.error(f"Hindsight get_all_memories failed: {exc2}")
                return []


def _normalise_recall_results(raw) -> List[dict]:
    """
    Normalise the Hindsight recall() / list_memories() response into a
    consistent list of dicts: [{content, context, timestamp, relevance_score}]
    """
    if raw is None:
        return []

    if hasattr(raw, "results"):
        return _normalise_recall_results(raw.results)
    if hasattr(raw, "memories"):
        return _normalise_recall_results(raw.memories)
    if hasattr(raw, "items"):
        return _normalise_recall_results(raw.items)

    if isinstance(raw, list):
        results = []
        for item in raw:
            if isinstance(item, str):
                results.append({
                    "content": item,
                    "context": "",
                    "timestamp": "",
                    "relevance_score": None,
                })
            elif isinstance(item, dict):
                meta = item.get("metadata", {})
                context = item.get("context") or (meta.get("context") if isinstance(meta, dict) else "") or ""
                results.append({
                    "content": item.get("content") or item.get("text") or str(item),
                    "context": context,
                    "timestamp": item.get("timestamp") or item.get("created_at") or "",
                    "relevance_score": item.get("score") or item.get("relevance_score"),
                })
            else:
                content = (
                    getattr(item, "text", None)
                    or getattr(item, "content", None)
                    or str(item)
                )
                results.append({
                    "content": content,
                    "context": getattr(item, "context", "") or "",
                    "timestamp": getattr(item, "timestamp", "") or "",
                    "relevance_score": getattr(item, "score", None),
                })
        return results

    if hasattr(raw, "text"):
        return [{"content": raw.text, "context": "", "timestamp": "", "relevance_score": None}]

    return [{"content": str(raw), "context": "", "timestamp": "", "relevance_score": None}]
