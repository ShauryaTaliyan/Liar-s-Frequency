"""Minimal server-side Bolna API integration for optional, explicitly requested test calls."""
from __future__ import annotations
import os
import httpx
from dotenv import load_dotenv

load_dotenv()


def bolna_status() -> dict:
    configured = bool(os.getenv("BOLNA_API_KEY") and os.getenv("BOLNA_AGENT_ID_ARJUN") and os.getenv("BOLNA_FROM_PHONE_NUMBER"))
    return {"status": "configured" if configured else "demo", "bolna_configured": configured}


async def start_test_call(recipient_phone_number: str) -> dict:
    api_key = os.getenv("BOLNA_API_KEY")
    agent_id = os.getenv("BOLNA_AGENT_ID_ARJUN")
    from_phone_number = os.getenv("BOLNA_FROM_PHONE_NUMBER")
    if not (api_key and agent_id and from_phone_number):
        raise RuntimeError("Set BOLNA_API_KEY, BOLNA_AGENT_ID_ARJUN and BOLNA_FROM_PHONE_NUMBER in backend/.env first.")
    payload = {
        "agent_id": agent_id,
        "recipient_phone_number": recipient_phone_number,
        "from_phone_number": from_phone_number,
        "user_data": {
            "case_id": "LF-001",
            "suspect_name": "Arjun Malhotra",
            "case_context": "Fictional detective game. Play Arjun, the guarded CFO suspect. This is a test call explicitly requested by the developer.",
        },
    }
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(
            "https://api.bolna.ai/call",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if response.status_code >= 400:
        raise RuntimeError(f"Bolna API returned {response.status_code}: {response.text[:700]}")
    return {"status": "requested", "provider_response": response.json()}
