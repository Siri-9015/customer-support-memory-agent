"""
Memory extraction service for RecallDesk.

After the LLM generates a response, this service analyses the conversation
and extracts the key facts worth storing in Hindsight for future recall.

Strategy: Use a lightweight Groq call to extract structured facts.
Fallback: Use rule-based extraction if LLM extraction fails.
"""

import os
import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    from groq import Groq  # type: ignore
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


EXTRACTION_SYSTEM_PROMPT = """You are a memory extraction assistant for a customer support system.

Your job is to extract ONLY the important, durable facts from a customer support conversation.
These facts will be stored and retrieved in future conversations to avoid asking the customer to repeat themselves.

Extract facts in these categories:
- ENVIRONMENT: OS, hardware, software versions, device types, router models, etc.
- ISSUE: The specific problem the customer reported
- SOLUTION: Steps that were tried or recommended
- PREFERENCE: Customer preferences or constraints
- OUTCOME: Whether the issue was resolved or not

Rules:
- Extract only factual, specific information (not opinions or pleasantries)
- Each fact must be a single, self-contained sentence
- Maximum 8 facts per conversation turn
- Skip generic statements like "the customer had a problem"
- Include model numbers, versions, and specifics when mentioned

Output format (one fact per line, no numbering or bullets):
The customer uses Windows 11.
The customer's router is a TP-Link Archer AX73.
The customer experienced random Wi-Fi disconnections every 30 minutes.
The customer tried restarting the router — issue persisted.
"""


class MemoryExtractor:
    """
    Extracts durable facts from conversations to store in Hindsight.
    """

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self._client: Optional[object] = None

        if self.api_key and GROQ_AVAILABLE:
            self._client = Groq(api_key=self.api_key)

    def extract_facts(
        self,
        customer_message: str,
        agent_response: str,
        customer_id: str,
    ) -> List[dict]:
        """
        Extract key facts from a conversation turn.

        Returns a list of dicts: [{content, context}, ...]
        Each item is ready to be passed to HindsightMemory.retain().
        """
        if self._client:
            facts = self._llm_extract(customer_message, agent_response)
        else:
            facts = self._rule_extract(customer_message, agent_response)

        logger.debug(f"Extracted {len(facts)} facts for customer={customer_id}")
        return facts

    def _llm_extract(self, customer_message: str, agent_response: str) -> List[dict]:
        """Use Groq to extract structured facts."""
        conversation = f"Customer: {customer_message}\nAgent: {agent_response}"
        try:
            completion = self._client.chat.completions.create(  # type: ignore
                model=self.model,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Extract facts from this conversation:\n\n{conversation}"},
                ],
                max_tokens=512,
                temperature=0.2,  # Low temp for consistent extraction
            )
            raw = completion.choices[0].message.content.strip()
            return _parse_extracted_facts(raw)
        except Exception as exc:
            logger.warning(f"LLM fact extraction failed, using rule-based: {exc}")
            return self._rule_extract(customer_message, agent_response)

    def _rule_extract(self, customer_message: str, agent_response: str) -> List[dict]:
        """
        Rule-based fact extraction as a fallback.
        Looks for common patterns like OS names, device names, version numbers.
        """
        text = f"{customer_message} {agent_response}"
        facts = []

        # Operating system detection
        os_patterns = [
            (r'\bWindows\s+\d+\b', "environment"),
            (r'\bmacOS\b|\bMac OS\b|\bOS X\b', "environment"),
            (r'\bUbuntu\b|\bDebian\b|\bLinux\b', "environment"),
            (r'\biOS\s+\d+\b|\biPadOS\b', "environment"),
            (r'\bAndroid\s+\d+\b', "environment"),
        ]
        for pattern, context in os_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                facts.append({
                    "content": f"Customer uses {match.group(0)}.",
                    "context": context,
                })

        # Router/hardware detection
        hardware_patterns = [
            r'TP-Link\s+\w+',
            r'Netgear\s+\w+',
            r'Asus\s+\w+',
            r'Linksys\s+\w+',
            r'Dell\s+\w+',
            r'HP\s+\w+',
            r'Lenovo\s+\w+',
            r'MacBook\s+\w*',
            r'iPhone\s+\d+',
        ]
        for pattern in hardware_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                facts.append({
                    "content": f"Customer device/hardware: {match.group(0)}.",
                    "context": "environment",
                })

        # Issue keywords
        issue_keywords = ["disconnects", "crash", "freeze", "not working", "error", "fail", "broken", "slow", "lag"]
        for kw in issue_keywords:
            if kw.lower() in customer_message.lower():
                # Extract the sentence containing the keyword
                sentences = re.split(r'[.!?]', customer_message)
                for sentence in sentences:
                    if kw.lower() in sentence.lower() and len(sentence.strip()) > 10:
                        facts.append({
                            "content": f"Customer reported: {sentence.strip()}.",
                            "context": "issue",
                        })
                        break

        # Solution keywords
        solution_keywords = ["restart", "reinstall", "update", "reset", "disable", "uninstall"]
        for kw in solution_keywords:
            if kw.lower() in agent_response.lower():
                sentences = re.split(r'[.!?]', agent_response)
                for sentence in sentences:
                    if kw.lower() in sentence.lower() and len(sentence.strip()) > 10:
                        facts.append({
                            "content": f"Recommended solution: {sentence.strip()}.",
                            "context": "solution",
                        })
                        break

        # Deduplicate by content
        seen = set()
        unique_facts = []
        for fact in facts:
            key = fact["content"].lower()
            if key not in seen:
                seen.add(key)
                unique_facts.append(fact)

        return unique_facts[:8]  # Cap at 8 facts


def _parse_extracted_facts(raw_text: str) -> List[dict]:
    """
    Parse the LLM's plain-text fact output into structured dicts.
    Assigns a context category based on keywords in the fact.
    """
    facts = []
    context_keywords = {
        "environment": ["windows", "macos", "linux", "android", "ios", "router", "device", "hardware",
                        "software", "version", "model", "browser", "driver", "firmware"],
        "issue": ["problem", "issue", "error", "crash", "disconnect", "fail", "broken", "not working",
                  "reported", "experiencing"],
        "solution": ["tried", "recommended", "suggested", "restarted", "updated", "reinstalled", "reset",
                     "disabled", "solution", "resolved"],
        "preference": ["prefers", "wants", "requires", "needs", "likes", "preferred"],
        "outcome": ["resolved", "fixed", "still happening", "persists", "closed", "escalated"],
    }

    for line in raw_text.split("\n"):
        line = line.strip()
        # Strip common list prefixes
        line = re.sub(r'^[-•*\d]+[.)]\s*', '', line)
        if not line or len(line) < 10:
            continue

        # Determine context category
        line_lower = line.lower()
        context = "general"
        for cat, keywords in context_keywords.items():
            if any(kw in line_lower for kw in keywords):
                context = cat
                break

        facts.append({"content": line, "context": context})

    return facts[:8]
