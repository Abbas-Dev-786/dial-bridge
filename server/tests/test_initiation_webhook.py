from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.enums import CallStatus, ContactStatus
from app.services.webhook_handler import handle_initiation_webhook


class ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


@pytest.mark.asyncio
async def test_initiation_webhook_returns_dynamic_variables_and_updates_status():
    contact = SimpleNamespace(
        full_name="Pat Lee",
        phone="+15551230000",
        company="Acme",
        custom_fields={"Interest Level": "High"},
        status=ContactStatus.pending,
    )
    campaign = SimpleNamespace(name="Q2 Demo")
    call = SimpleNamespace(
        status=CallStatus.ringing,
        answered_at=None,
        to_number="+15551230000",
        contact=contact,
        campaign=campaign,
    )

    db = AsyncMock()
    db.execute.return_value = ScalarResult(call)

    response = await handle_initiation_webhook(db, {"conversation_id": "conv-123"})

    assert call.status == CallStatus.in_progress
    assert call.answered_at is not None
    assert contact.status == ContactStatus.calling
    assert response["type"] == "conversation_initiation_client_data"
    assert response["dynamic_variables"]["contact_name"] == "Pat Lee"
    assert response["dynamic_variables"]["custom_interest_level"] == "High"
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_initiation_webhook_returns_empty_payload_when_call_not_found():
    db = AsyncMock()
    db.execute.return_value = ScalarResult(None)

    response = await handle_initiation_webhook(db, {"conversation_id": "missing"})

    assert response["type"] == "conversation_initiation_client_data"
    assert response["dynamic_variables"]["contact_name"] == "there"
    db.commit.assert_not_awaited()
