import httpx
from app.config import settings
from app.exceptions import ElevenLabsError, ValidationError

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

class ElevenLabsClient:
    def __init__(self):
        # Always uses the platform key from settings
        # We don't set a global Content-Type here to avoid conflicts with 
        # multipart/form-data requests (e.g. file uploads).
        self._client = httpx.AsyncClient(
            base_url=settings.elevenlabs_base_url,
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
            },
            timeout=30.0,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        # Default to JSON content type if sending a payload and not otherwise specified
        if "json" in kwargs and "headers" not in kwargs:
            kwargs["headers"] = {"Content-Type": "application/json"}
        
        # Log the request for debugging
        # Ensure path starts with / but base_url doesn't end with one (or vice versa)
        base = str(self._client.base_url).rstrip("/")
        normalized_path = "/" + path.lstrip("/")
        full_url = f"{base}{normalized_path}"
        print(f"DEBUG: ElevenLabs Request: {method} {full_url}")
        if "json" in kwargs:
            print(f"DEBUG: Payload: {kwargs['json']}")
        if "params" in kwargs:
            print(f"DEBUG: Params: {kwargs['params']}")
            
        response = await self._client.request(method, path, **kwargs)
        
        # Log the response
        print(f"DEBUG: ElevenLabs Response Status: {response.status_code}")
        if not response.is_success:
            print(f"DEBUG: ElevenLabs Error Body: {response.text[:500]}")
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
        data = await self._request("GET", "/voices")
        if isinstance(data, list):
            return data
        return data.get("voices", [])

    # ── Knowledge base endpoints (Standalone) ───────────────────────────

    async def add_url_to_kb(self, url: str, name: str) -> dict:
        """
        POST /convai/knowledge-base/url
        Returns: { "id": str, "name": str, ... }
        """
        return await self._request(
            "POST",
            "/convai/knowledge-base/url",
            json={"url": url, "name": name},
        )

    async def add_text_to_kb(self, text: str, name: str) -> dict:
        """
        POST /convai/knowledge-base/text
        """
        return await self._request(
            "POST",
            "/convai/knowledge-base/text",
            json={"text": text, "name": name},
        )

    async def add_file_to_kb(self, file_content: bytes, filename: str) -> dict:
        """
        POST /convai/knowledge-base/file (multipart)
        Returns: { "id": str, "name": str, ... }
        """
        # Use files parameter to send as multipart/form-data
        response = await self._client.post(
            "/convai/knowledge-base/file",
            files={"file": (filename, file_content)},
            data={"name": filename}
        )
        if not response.is_success:
            raise ElevenLabsError(f"{response.status_code} — {response.text[:200]}")
        return response.json() if response.content else {}

    async def delete_kb_document(self, kb_id: str) -> None:
        """
        DELETE /convai/knowledge-base/{kb_id}
        """
        await self._request("DELETE", f"/convai/knowledge-base/{kb_id}")

    async def list_kb_documents(self) -> list[dict]:
        """
        GET /convai/knowledge-base
        Returns list of all documents in the account.
        """
        data = await self._request("GET", "/convai/knowledge-base")
        if isinstance(data, list):
            return data
        return data.get("documents", [])

    # ── Telephony endpoints ─────────────────

    async def list_phone_numbers(self) -> list[dict]:
        """
        GET /convai/phone-numbers
        Returns all phone numbers on the ElevenLabs account for this API key.
        """
        data = await self._request("GET", "/convai/phone-numbers")
        if isinstance(data, list):
            return data
        return data.get("phone_numbers", [])

    async def get_phone_number(self, phone_number_id: str) -> dict:
        """GET /convai/phone-numbers/{phone_number_id}"""
        return await self._request("GET", f"/convai/phone-numbers/{phone_number_id}")

    async def assign_phone_to_agent(self, phone_number_id: str, agent_id: str) -> dict:
        """
        PATCH /convai/phone-numbers/{phone_number_id}
        Assigns the ElevenLabs number to an EL agent.
        """
        return await self._request(
            "PATCH",
            f"/convai/phone-numbers/{phone_number_id}",
            json={"agent_id": agent_id},
        )

    async def unassign_phone_from_agent(self, phone_number_id: str) -> dict:
        """
        PATCH /convai/phone-numbers/{phone_number_id}
        Unassigns the agent from the phone number.
        """
        return await self._request(
            "PATCH",
            f"/convai/phone-numbers/{phone_number_id}",
            json={"agent_id": None},
        )

    # ── Call endpoints ───────────────────────────────────────

    async def initiate_call(self, payload: dict) -> dict:
        """
        POST /convai/twilio/outbound-call
        Returns: { "conversation_id": str }
        """
        return await self._request("POST", "/convai/twilio/outbound-call", json=payload)

    # ── Test & Session endpoints ──────────────────────────────

    async def get_conversation_token(self, agent_id: str) -> dict:
        """
        GET /convai/conversation/token?agent_id={agent_id}
        Returns: { "token": str }
        """
        return await self._request(
            "GET",
            "/convai/conversation/token",
            params={"agent_id": agent_id},
        )

    async def get_conversation(self, conversation_id: str) -> dict:
        """
        GET /convai/conversations/{conversation_id}
        """
        return await self._request("GET", f"/convai/conversations/{conversation_id}")

    async def get_conversation_audio(self, conversation_id: str) -> bytes:
        """
        GET /convai/conversations/{conversation_id}/audio
        Returns the raw audio bytes.
        """
        response = await self._client.get(f"/convai/conversations/{conversation_id}/audio")
        if not response.is_success:
            raise ElevenLabsError(f"{response.status_code} — {response.text[:200]}")
        return response.content


def get_elevenlabs_client() -> ElevenLabsClient:
    """
    Returns an ElevenLabs client using the platform-level configuration.
    No workspace argument is needed as all workspaces share the same account.
    """
    return ElevenLabsClient()
