from uuid import UUID
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.phone_number import PhoneNumber
from app.models.workspace import Workspace
from app.schemas.phone_number import (
    PhoneNumberImportFromEL, SIPTrunkCreate, PhoneNumberUpdate, ElevenLabsAvailableNumber
)
from app.services.elevenlabs_client import get_elevenlabs_client
from app.enums import PhoneProvider, PhoneNumberStatus, PhoneNumberType
from app.exceptions import NotFoundError, ConflictError, ValidationError

# For SIP password encryption
def encrypt_password(password: str) -> str:
    # Placeholder: In a real app, use Fernet or similar
    # For now, we'll store it as "enc:<password>" to simulate encryption
    return f"enc:{password}"

def decrypt_password(encrypted_password: str) -> str:
    if encrypted_password.startswith("enc:"):
        return encrypted_password[4:]
    return encrypted_password

async def list_elevenlabs_available_numbers(db: AsyncSession, workspace_id: UUID) -> list[ElevenLabsAvailableNumber]:
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        el_numbers = await client.list_phone_numbers()
    
    # Fetch ALL imported numbers across ALL workspaces
    all_imported = (await db.execute(
        select(PhoneNumber.elevenlabs_number_id, PhoneNumber.workspace_id)
        .where(PhoneNumber.released_at.is_(None))
    )).all()

    imported_by_this_workspace = {
        row.elevenlabs_number_id
        for row in all_imported
        if row.workspace_id == workspace_id
    }
    imported_by_other_workspace = {
        row.elevenlabs_number_id
        for row in all_imported
        if row.workspace_id != workspace_id
    }
    
    available = []
    for el in el_numbers:
        el_id = el.get("phone_number_id") or el.get("id")
        number = el.get("phone_number") or el.get("number")
        
        if not el_id or not number:
            continue
            
        available.append(ElevenLabsAvailableNumber(
            elevenlabs_number_id=el_id,
            number=number,
            label=el.get("label"),
            assigned_agent_id=el.get("assigned_agent_id") or el.get("assigned_agent"),
            is_imported=el_id in imported_by_this_workspace,
            is_unavailable=el_id in imported_by_other_workspace
        ))
    return available

async def import_from_elevenlabs(db: AsyncSession, workspace: Workspace, data: PhoneNumberImportFromEL) -> PhoneNumber:
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        el_data = await client.get_phone_number(data.elevenlabs_number_id)
    
    el_id = el_data.get("phone_number_id") or el_data.get("id") or data.elevenlabs_number_id
    el_number = el_data.get("phone_number") or el_data.get("number")
    
    if not el_number:
        raise ValidationError("Could not retrieve number from ElevenLabs.")
    
    # Check if already imported
    stmt = select(PhoneNumber).where(
        PhoneNumber.workspace_id == workspace.id,
        PhoneNumber.elevenlabs_number_id == el_id,
        PhoneNumber.status != PhoneNumberStatus.released
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise ConflictError(f"Phone number {el_number} is already imported.")
    
    # Map EL type to our enum if needed
    num_type = PhoneNumberType.local
    # Map logic here if EL provides type... for now default local
    
    phone_number = PhoneNumber(
        workspace_id=workspace.id,
        number=el_number,
        friendly_name=data.friendly_name or el_data.get("label"),
        provider=PhoneProvider.elevenlabs,
        elevenlabs_number_id=data.elevenlabs_number_id,
        number_type=num_type,
        status=PhoneNumberStatus.active
    )
    db.add(phone_number)
    await db.commit()
    return phone_number

async def import_sip_trunk(db: AsyncSession, workspace: Workspace, data: SIPTrunkCreate) -> PhoneNumber:
    # Check uniqueness
    stmt = select(PhoneNumber).where(
        PhoneNumber.workspace_id == workspace.id,
        PhoneNumber.number == data.number,
        PhoneNumber.status != PhoneNumberStatus.released
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise ConflictError(f"Phone number {data.number} already exists in this workspace.")
    
    phone_number = PhoneNumber(
        workspace_id=workspace.id,
        number=data.number,
        friendly_name=data.friendly_name,
        provider=PhoneProvider.sip_trunk,
        sip_server=data.sip_server,
        sip_username=data.sip_username,
        sip_password_enc=encrypt_password(data.sip_password),
        sip_port=data.sip_port,
        status=PhoneNumberStatus.active
    )
    db.add(phone_number)
    await db.commit()
    return phone_number

async def get_phone_number(db: AsyncSession, workspace_id: UUID, phone_number_id: UUID) -> PhoneNumber:
    stmt = select(PhoneNumber).where(
        PhoneNumber.id == phone_number_id,
        PhoneNumber.workspace_id == workspace_id,
        PhoneNumber.status != PhoneNumberStatus.released
    )
    result = await db.execute(stmt)
    phone_number = result.scalar_one_or_none()
    if not phone_number:
        raise NotFoundError("Phone number", str(phone_number_id))
    return phone_number

async def list_phone_numbers(db: AsyncSession, workspace_id: UUID, status_filter: PhoneNumberStatus | None = None) -> list[PhoneNumber]:
    stmt = select(PhoneNumber).where(
        PhoneNumber.workspace_id == workspace_id,
        PhoneNumber.status != PhoneNumberStatus.released
    )
    if status_filter:
        stmt = stmt.where(PhoneNumber.status == status_filter)
    
    stmt = stmt.order_by(PhoneNumber.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def update_phone_number(db: AsyncSession, phone_number: PhoneNumber, data: PhoneNumberUpdate) -> PhoneNumber:
    if data.friendly_name is not None:
        phone_number.friendly_name = data.friendly_name
    if data.display_name is not None:
        phone_number.display_name = data.display_name
        
    await db.commit()
    return phone_number

async def release_phone_number(db: AsyncSession, phone_number: PhoneNumber) -> None:
    phone_number.status = PhoneNumberStatus.released
    phone_number.released_at = datetime.utcnow()
    
    await db.commit()

async def sync_from_elevenlabs(db: AsyncSession, workspace: Workspace) -> int:
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        el_numbers = await client.list_phone_numbers()
    
    el_map = {el["phone_number_id"]: el for el in el_numbers}
    
    stmt = select(PhoneNumber).where(
        PhoneNumber.workspace_id == workspace.id,
        PhoneNumber.provider == PhoneProvider.elevenlabs,
        PhoneNumber.status != PhoneNumberStatus.released
    )
    result = await db.execute(stmt)
    db_numbers = result.scalars().all()
    
    count = 0
    for db_num in db_numbers:
        if db_num.elevenlabs_number_id in el_map:
            # Update status or other fields if needed
            count += 1
            
    await db.commit()
    return count
