"""
LLM service for RecallDesk using Groq.

Groq provides fast inference and is the recommended LLM for this project.
Model: llama-3.3-70b-versatile (default) — can be overridden via GROQ_MODEL env var.

The service builds a context-aware system prompt that injects recalled memories
so the agent gives personalized, memory-informed responses.
"""

import os
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    from groq import Groq  # type: ignore
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("groq package not installed. Run: pip install groq")


SYSTEM_PROMPT_BASE = """You are RecallDesk, an expert AI customer support agent.
You work for a technology company that supports hardware and software products.

Your core strengths:
- Diagnosing technical problems clearly and accurately
- Providing step-by-step troubleshooting instructions
- Remembering customer history to avoid asking them to repeat themselves
- Noticing patterns across a customer's previous issues

Personality:
- Professional, warm, and empathetic
- Direct and clear — no jargon unless the customer uses it
- Patient with customers who are frustrated

IMPORTANT RULES:
- If you have memory of a customer's previous issues, DO NOT ask them to repeat information you already know.
- Always acknowledge previous context when relevant.
- If memory shows a previous solution was attempted, suggest a different approach.
- Keep responses concise but complete.
- If you cannot resolve an issue, escalate clearly.
"""

MEMORY_INJECTION_TEMPLATE = """
=== CUSTOMER MEMORY (retrieved from persistent store) ===
The following information was recalled from this customer's history.
Use it to personalise your response. Do NOT ask the customer to re-explain these facts.

{memories}

=== END OF CUSTOMER MEMORY ===
"""

NO_MEMORY_NOTE = """
Note: No previous interactions found for this customer. This appears to be their first contact.
"""


def _format_memories_for_prompt(memories: List[dict]) -> str:
    """Format recalled memories into a readable block for the system prompt."""
    if not memories:
        return ""
    lines = []
    for i, mem in enumerate(memories, 1):
        content = mem.get("content", "")
        context = mem.get("context", "")
        timestamp = mem.get("timestamp", "")
        score = mem.get("relevance_score")

        line = f"{i}. {content}"
        if context:
            line += f"  [type: {context}]"
        if timestamp:
            # Trim ISO timestamp for readability
            line += f"  [recorded: {timestamp[:10]}]"
        lines.append(line)
    return "\n".join(lines)


def _build_system_prompt(memories: List[dict]) -> str:
    """Construct the full system prompt with or without memory context."""
    prompt = SYSTEM_PROMPT_BASE

    if memories:
        formatted = _format_memories_for_prompt(memories)
        prompt += MEMORY_INJECTION_TEMPLATE.format(memories=formatted)
    else:
        prompt += NO_MEMORY_NOTE

    return prompt


class LLMService:
    """
    Manages communication with the Groq LLM.

    Accepts recalled memories and weaves them into the system prompt
    before generating a response.
    """

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "1024"))
        self.temperature = float(os.getenv("GROQ_TEMPERATURE", "0.7"))
        self._client: Optional[object] = None

        if not self.api_key:
            logger.error("GROQ_API_KEY is not set. LLM responses will be unavailable.")
        elif GROQ_AVAILABLE:
            self._client = Groq(api_key=self.api_key)
            logger.info(f"Groq LLM initialized — model: {self.model}")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key) and GROQ_AVAILABLE and self._client is not None

    def generate_response(
        self,
        customer_message: str,
        memories: List[dict],
        conversation_history: Optional[List[dict]] = None,
    ) -> str:
        """
        Generate a support response using Groq, enriched with recalled memories.

        Args:
            customer_message:      The current customer message.
            memories:              Retrieved memories from Hindsight.
            conversation_history:  Optional prior turns [{"role": ..., "content": ...}].

        Returns:
            The AI-generated response string.
        """
        if not self.is_configured:
            return _fallback_response(customer_message, memories)

        system_prompt = _build_system_prompt(memories)

        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            # Keep last 6 turns to stay within context limits
            messages.extend(conversation_history[-6:])

        messages.append({"role": "user", "content": customer_message})

        try:
            completion = self._client.chat.completions.create(  # type: ignore
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )
            response_text = completion.choices[0].message.content
            logger.debug(f"Groq response generated ({len(response_text)} chars)")
            return response_text
        except Exception as exc:
            logger.error(f"Groq API error: {exc}")
            return _fallback_response(customer_message, memories)


def _fallback_response(message: str, memories: List[dict]) -> str:
    """
    Return a graceful fallback when the LLM is unavailable.
    Still demonstrates memory usage if memories are present.
    """
    if memories:
        mem_summary = "; ".join(m["content"] for m in memories[:3])
        return (
            f"I can see from your history that: {mem_summary}. "
            "However, I'm currently experiencing connectivity issues with our AI service. "
            "Please try again in a moment, or contact our support team directly."
        )
    return (
        "Thank you for contacting RecallDesk support. "
        "I'm currently experiencing connectivity issues with our AI service. "
        "Please try again shortly, or contact our support team directly."
    )
