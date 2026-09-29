"""
Demo data seeding for RecallDesk.

Seeds two demo customers with pre-built memory so we can immediately
demonstrate the before/after Hindsight memory effect without waiting
for real conversations to accumulate.

Demo customers:
  - customer-alice : Windows 11, TP-Link Archer, Wi-Fi disconnection issue
  - customer-bob   : macOS, Dell monitor, display connection issue
"""

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from memory.hindsight_client import HindsightMemory

logger = logging.getLogger(__name__)

DEMO_MEMORIES = {
    "customer-alice": [
        {
            "content": "Customer Alice uses Windows 11 on a Dell XPS 15 laptop.",
            "context": "environment",
        },
        {
            "content": "Alice's router is a TP-Link Archer AX73 connected via 5GHz band.",
            "context": "environment",
        },
        {
            "content": "Alice reported random Wi-Fi disconnections occurring every 20-30 minutes.",
            "context": "issue",
        },
        {
            "content": "Alice's ISP is Comcast Xfinity with a 400 Mbps plan.",
            "context": "environment",
        },
        {
            "content": "Previously tried: restarting the router — issue persisted after 2 hours.",
            "context": "solution",
        },
        {
            "content": "Previously tried: updating the Wi-Fi adapter driver — provided temporary relief but issue returned.",
            "context": "solution",
        },
        {
            "content": "Alice works from home and the disconnections disrupt video calls (uses Microsoft Teams).",
            "context": "preference",
        },
    ],
    "customer-bob": [
        {
            "content": "Customer Bob uses a MacBook Pro 14-inch (M3, 2024) running macOS Sequoia 15.2.",
            "context": "environment",
        },
        {
            "content": "Bob's external monitor is a Dell UltraSharp U2723D connected via USB-C to DisplayPort cable.",
            "context": "environment",
        },
        {
            "content": "Bob reported the external monitor randomly going black for 1-2 seconds then recovering.",
            "context": "issue",
        },
        {
            "content": "Issue occurs more frequently when running multiple apps — observed on macOS Sequoia 15.2.",
            "context": "environment",
        },
        {
            "content": "Previously tried: replacing the USB-C to DisplayPort cable — issue persisted.",
            "context": "solution",
        },
        {
            "content": "Previously tried: resetting NVRAM — provided no improvement.",
            "context": "solution",
        },
        {
            "content": "Bob is a graphic designer and needs colour-accurate display output at all times.",
            "context": "preference",
        },
    ],
}


async def seed_demo_data(memory: "HindsightMemory") -> dict:
    """
    Seed demo customer memories into Hindsight.

    Returns a summary of what was seeded.
    """
    results = {}

    for customer_id, memories in DEMO_MEMORIES.items():
        seeded = 0
        for mem in memories:
            success = await memory.retain(
                customer_id=customer_id,
                content=mem["content"],
                context=mem["context"],
            )
            if success:
                seeded += 1

        results[customer_id] = seeded
        logger.info(f"Demo data seeded: {customer_id} → {seeded} memories")

    return results


DEMO_CUSTOMERS = [
    {
        "id": "customer-alice",
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "avatar": "AJ",
        "description": "Wi-Fi connectivity issues on Windows 11",
        "tag": "Network",
    },
    {
        "id": "customer-bob",
        "name": "Bob Chen",
        "email": "bob@example.com",
        "avatar": "BC",
        "description": "External monitor flickering on macOS",
        "tag": "Display",
    },
    {
        "id": "customer-new",
        "name": "New Customer",
        "email": "new@example.com",
        "avatar": "NC",
        "description": "No previous interactions (demonstrates first-time experience)",
        "tag": "New",
    },
]
