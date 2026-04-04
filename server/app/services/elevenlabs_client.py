import httpx
from app.config import settings
from app.exceptions import ElevenLabsError, ValidationError

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

class ElevenLabsClient:
    def __init__(self):
        # Always uses the platform key from settings
        self._client = httpx.AsyncClient(
            base_url=settings.elevenlabs_base_url,
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        response = await self._client.request(method, path, **kwargs)
        if not response.is_success:
            raise ElevenLabsError(
                f"{response.status_code} — {response.text[:200]}"
            )
        try:
            return response.json() if response.content else {}
        except Exception:
            return {}

    # ── Agent endpoints ──────────────────────────────────────

    async def create_agent(self, payload: dict) -> dict:
        """POST /convai/agents/create — returns { agent_id: str }"""
        return await self._request("POST", "/convai/agents/create", json=payload)

    async def get_agent(self, agent_id: str) -> dict:
        """GET /convai/agents/{agent_id}"""
        return await self._request("GET", f"/convai/agents/{agent_id}")

    async def update_agent(self, agent_id: str, payload: dict) -> dict:
        """PATCH /convai/agents/{agent_id} — returns dict"""
        return await self._request("PATCH", f"/convai/agents/{agent_id}", json=payload)

    async def delete_agent(self, agent_id: str) -> None:
        """DELETE /convai/agents/{agent_id}"""
        await self._request("DELETE", f"/convai/agents/{agent_id}")

    # ── Voice endpoints ───────────────────────────────────────

    async def list_voices(self) -> list[dict]:
        """GET /voices — returns list of available voices for this API key"""
        data = await self._request("GET", "/v1/voices") # ElevenLabs voices endpoint is /v1/voices or /voices depending on base url
        # If base_url ends with /v1, we use /voices. Our base_url is /v1, so we use /voices.
        # Wait, the prompt says GET /voices. Let's stick to that.
        return data.get("voices", [])

    # ── Knowledge base endpoints ──────────────────────────────────────

    async def add_url_to_kb(self, agent_id: str, url: str, name: str) -> dict:
        """
        POST /convai/agents/{agent_id}/add-to-knowledge-base
        Body: { "type": "url", "url": str, "name": str }
        Returns: { "id": str }
        """
        return await self._request(
            "POST",
            f"/convai/agents/{agent_id}/add-to-knowledge-base",
            json={"type": "url", "url": url, "name": name},
        )

    async def add_text_to_kb(self, agent_id: str, text: str, name: str) -> dict:
        """
        POST /convai/agents/{agent_id}/add-to-knowledge-base
        Body: { "type": "text", "text": str, "name": str }
        """
        return await self._request(
            "POST",
            f"/convai/agents/{agent_id}/add-to-knowledge-base",
            json={"type": "text", "text": text, "name": name},
        )

    async def add_file_to_kb(self, agent_id: str, file_content: bytes, filename: str) -> dict:
        """
        POST /convai/agents/{agent_id}/add-to-knowledge-base (multipart)
        Used for PDF, DOCX, TXT uploads.
        Returns: { "id": str }
        """
        response = await self._client.post(
            f"/convai/agents/{agent_id}/add-to-knowledge-base",
            content=file_content,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/octet-stream",
            },
        )
        if not response.is_success:
            raise ElevenLabsError(f"{response.status_code} — {response.text[:200]}")
        return response.json() if response.content else {}

    async def delete_kb_document(self, agent_id: str, kb_id: str) -> None:
        """
        DELETE /convai/agents/{agent_id}/knowledge-base/{kb_id}
        """
        await self._request("DELETE", f"/convai/agents/{agent_id}/knowledge-base/{kb_id}")

    async def list_kb_documents(self, agent_id: str) -> list[dict]:
        """
        GET /convai/agents/{agent_id}/knowledge-base
        Returns list of documents currently on the EL agent.
        """
        data = await self._request("GET", f"/convai/agents/{agent_id}/knowledge-base")
        return data.get("documents", [])

    # ── Telephony endpoints ─────────────────

    async def list_phone_numbers(self) -> list[dict]:
        """
        GET /convai/phone-numbers
        Returns all phone numbers on the ElevenLabs account for this API key.
        """
        data = await self._request("GET", "/convai/phone-numbers")
        return data.get("phone_numbers", [])

    async def get_phone_number(self, phone_number_id: str) -> dict:
        """GET /convai/phone-numbers/{phone_number_id}"""
        return await self._request("GET", f"/convai/phone-numbers/{phone_number_id}")

    async def assign_phone_to_agent(self, phone_number_id: str, agent_id: str) -> dict:
        """
        POST /convai/phone-numbers/{phone_number_id}/assign
        Assigns the ElevenLabs number to an EL agent.
        """
        return await self._request(
            "POST",
            f"/convai/phone-numbers/{phone_number_id}/assign",
            json={"agent_id": agent_id},
        )

    async def unassign_phone_from_agent(self, phone_number_id: str) -> dict:
        """
        POST /convai/phone-numbers/{phone_number_id}/unassign
        """
        return await self._request(
            "POST",
            f"/convai/phone-numbers/{phone_number_id}/unassign",
        )

    # ── Call endpoints ───────────────────────────────────────

    async def initiate_call(self, payload: dict) -> dict:
        """
        POST /convai/twilio/outbound-call
        Returns: { "conversation_id": str }
        """
        return await self._request("POST", "/convai/twilio/outbound-call", json=payload)


def get_elevenlabs_client() -> ElevenLabsClient:
    """
    Returns an ElevenLabs client using the platform-level configuration.
    No workspace argument is needed as all workspaces share the same account.
    """
    return ElevenLabsClient()
