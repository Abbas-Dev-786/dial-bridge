import uuid
import io
import csv
import re
from datetime import datetime
from sqlalchemy import select, and_, or_, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.models.contact import Contact
from app.models.campaign import Campaign
from app.schemas.contact import (
    ContactCreate, 
    ContactUpdate, 
    ContactListResponse, 
    CSVImportResult,
    ContactResponse
)
from app.enums import ContactStatus
from app.exceptions import (
    NotFoundError, 
    ConflictError, 
    ValidationError
)

def normalize_phone(phone: str) -> str | None:
    """Normalize phone to E.164 format."""
    if not phone:
        return None
    
    # Strip non-digit characters except +
    clean = re.sub(r"[^\d+]", "", str(phone))
    
    if not clean:
        return None
    
    if clean.startswith("+"):
        if re.match(r"^\+[1-9]\d{6,14}$", clean):
            return clean
        return None
    else:
        # Assume US (+1) if no leading + and 10 digits
        if len(clean) == 10:
            return f"+1{clean}"
        # If it's 11 digits and starts with 1
        if len(clean) == 11 and clean.startswith("1"):
            return f"+{clean}"
        
    return None

def check_dnc(phone: str) -> bool:
    """Stub for DNC registry integration. Returns False for now."""
    return False

async def create_contact(db: AsyncSession, campaign: Campaign, user_id: uuid.UUID, data: ContactCreate) -> Contact:
    # 1. Check for duplicate phone in same campaign
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.campaign_id == campaign.id,
                Contact.phone == data.phone,
                Contact.deleted_at.is_(None)
            )
        )
    )
    if result.scalar_one_or_none():
        raise ConflictError(f"Phone {data.phone} already exists in this campaign.")

    # 2. Check DNC
    is_dnc = check_dnc(data.phone)
    status = ContactStatus.do_not_call if is_dnc else ContactStatus.pending

    # 3. Create Contact
    contact = Contact(
        campaign_id=campaign.id,
        status=status,
        is_dnc=is_dnc,
        opted_out_at=datetime.now() if is_dnc else None,
        **data.model_dump()
    )
    db.add(contact)
    
    # 4. Atomic Increment
    await db.execute(
        update(Campaign)
        .where(Campaign.id == campaign.id)
        .values(
            contacts_total=Campaign.contacts_total + 1,
            contacts_remaining=Campaign.contacts_remaining + (1 if status == ContactStatus.pending else 0)
        )
    )
    
    await db.commit()
    await db.refresh(contact)
    return contact

async def update_contact(db: AsyncSession, contact: Contact, data: ContactUpdate) -> Contact:
    update_data = data.model_dump(exclude_none=True)
    
    if "phone" in update_data and update_data["phone"] != contact.phone:
        if contact.status == ContactStatus.called:
            raise ConflictError("Cannot change phone number of a contact that has been called.")
        
        # Unique check
        result = await db.execute(
            select(Contact).where(
                and_(
                    Contact.campaign_id == contact.campaign_id,
                    Contact.phone == update_data["phone"],
                    Contact.deleted_at.is_(None),
                    Contact.id != contact.id
                )
            )
        )
        if result.scalar_one_or_none():
            raise ConflictError(f"Phone {update_data['phone']} already exists in this campaign.")

    for key, value in update_data.items():
        setattr(contact, key, value)
    
    await db.commit()
    await db.refresh(contact)
    return contact

async def delete_contact(db: AsyncSession, campaign: Campaign, contact: Contact) -> None:
    if contact.status == ContactStatus.calling:
        raise ConflictError("Cannot delete a contact while a call is in progress.")
    
    # Soft delete
    contact.deleted_at = datetime.now()
    
    # Atomic decrement
    await db.execute(
        update(Campaign)
        .where(Campaign.id == campaign.id)
        .values(
            contacts_total=Campaign.contacts_total - 1,
            contacts_remaining=Campaign.contacts_remaining - (1 if contact.status == ContactStatus.pending else 0)
        )
    )
    
    await db.commit()

async def list_contacts(
    db: AsyncSession, 
    campaign_id: uuid.UUID, 
    page: int = 1, 
    page_size: int = 50, 
    search: str | None = None, 
    status_filter: list[ContactStatus] | None = None
) -> ContactListResponse:
    query = select(Contact).where(
        and_(
            Contact.campaign_id == campaign_id,
            Contact.deleted_at.is_(None)
        )
    )
    
    if status_filter:
        query = query.where(Contact.status.in_(status_filter))
        
    if search:
        # PostgreSQL trigram search
        query = query.where(
            or_(
                Contact.full_name.ilike(f"%{search}%"),
                Contact.phone.ilike(f"%{search}%")
            )
        )
        
    query = query.order_by(Contact.created_at.desc())
    
    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return ContactListResponse(
        items=[ContactResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        has_next=total > page * page_size
    )

async def get_contact(db: AsyncSession, campaign_id: uuid.UUID, contact_id: uuid.UUID) -> Contact:
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.id == contact_id,
                Contact.campaign_id == campaign_id,
                Contact.deleted_at.is_(None)
            )
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact")
    return contact

async def mark_dnc(db: AsyncSession, campaign: Campaign, contact: Contact) -> Contact:
    if contact.is_dnc:
        return contact
        
    contact.is_dnc = True
    old_status = contact.status
    contact.status = ContactStatus.do_not_call
    contact.opted_out_at = datetime.now()
    
    # Atomic decrement if it was pending
    if old_status == ContactStatus.pending:
        await db.execute(
            update(Campaign)
            .where(Campaign.id == campaign.id)
            .values(contacts_remaining=Campaign.contacts_remaining - 1)
        )
        
    await db.commit()
    await db.refresh(contact)
    return contact

async def bulk_import_csv(db: AsyncSession, campaign: Campaign, csv_bytes: bytes, user_id: uuid.UUID) -> CSVImportResult:
    # 1. Byte limit check (10MB)
    if len(csv_bytes) > 10 * 1024 * 1024:
        raise ValidationError("CSV file exceeds 10MB limit.")
        
    # 2. Detect encoding
    try:
        content = csv_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = csv_bytes.decode("latin-1")
        except UnicodeDecodeError:
            raise ValidationError("Unable to detect CSV encoding. Please use UTF-8.")
            
    # 3. Parse CSV
    f = io.StringIO(content)
    # Check total rows (manual count to avoid loading all into memory at once if it was huge, 
    # but 50k is fine to count)
    rows_count = content.count('\n')
    if rows_count > 50000:
         raise ValidationError("CSV exceeds 50,000 row limit.")
    
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []
    
    # Column mapping logic
    mapped_fields = {
        "phone": None, "full_name": None, "email": None, "company": None, "notes": None
    }
    
    mapping_variants = {
        "phone": ["phone", "phone_number", "mobile", "cell", "tel", "contact_number"],
        "full_name": ["name", "full_name", "first_name", "last_name", "customer", "contact_name"],
        "email": ["email", "email_address", "e-mail"],
        "company": ["company", "organization", "org", "business"],
        "notes": ["notes", "comment", "description", "extra"]
    }
    
    for real_field, variants in mapping_variants.items():
        for variant in variants:
            for actual_col in fieldnames:
                if actual_col.lower().strip() == variant or actual_col.lower().strip().replace(" ", "_") == variant:
                     mapped_fields[real_field] = actual_col
                     break
            if mapped_fields[real_field]:
                break
                
    if not mapped_fields["phone"]:
        raise ValidationError(f"Required 'phone' column not found. Detected columns: {', '.join(fieldnames)}")

    # 4. Processing state
    import_result = CSVImportResult(
        total_rows=0,
        imported=0,
        skipped_invalid=0,
        skipped_duplicate=0,
        errors=[]
    )
    
    batch = []
    seen_phones = set()
    
    # 5. Process rows
    row_num = 1
    for row in reader:
        import_result.total_rows += 1
        row_num += 1
        
        raw_phone = row.get(mapped_fields["phone"])
        normalized_phone = normalize_phone(raw_phone)
        
        if not normalized_phone:
            import_result.skipped_invalid += 1
            import_result.errors.append({"row": row_num, "phone": raw_phone, "reason": "Invalid phone format"})
            continue
            
        # De-duplicate within CSV
        if normalized_phone in seen_phones:
            import_result.skipped_duplicate += 1
            # import_result.errors.append({"row": row_num, "phone": normalized_phone, "reason": "Duplicate in file"})
            continue
        seen_phones.add(normalized_phone)

        # Build contact object
        is_dnc = check_dnc(normalized_phone)
        
        full_name = row.get(mapped_fields["full_name"]) or "Contact"
        # Special handling for Name/First Last split if needed, but project says full_name=text
        
        contact_obj = {
            "campaign_id": campaign.id,
            "full_name": full_name,
            "phone": normalized_phone,
            "email": row.get(mapped_fields["email"]),
            "company": row.get(mapped_fields["company"]),
            "notes": row.get(mapped_fields["notes"]),
            "status": ContactStatus.do_not_call if is_dnc else ContactStatus.pending,
            "is_dnc": is_dnc,
            "opted_out_at": datetime.now() if is_dnc else None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        batch.append(contact_obj)
        
        if len(batch) >= 500:
            await _flush_batch(db, campaign, batch, import_result)
            batch = []

    # Final batch
    if batch:
        await _flush_batch(db, campaign, batch, import_result)

    # 6. Update Campaign counters
    if import_result.imported > 0:
        # Re-fetch pending count for the imported batch is tricky in atomic update without knowing how many were DNC
        # I'll track imported_pending in _flush_batch
        pass # Already handled inside _flush_batch via campaign counters

    await db.commit()
    return import_result

async def _flush_batch(db: AsyncSession, campaign: Campaign, batch: list[dict], result: CSVImportResult):
    """Internal helper to insert a batch of contacts with conflict handling."""
    
    # 1. Filter out duplicates already in DB for this campaign
    batch_phones = [b["phone"] for b in batch]
    existing_result = await db.execute(
        select(Contact.phone).where(
            and_(
                Contact.campaign_id == campaign.id,
                Contact.phone.in_(batch_phones),
                Contact.deleted_at.is_(None)
            )
        )
    )
    existing_phones = {r for r in existing_result.scalars().all()}
    
    final_batch = []
    pending_count = 0
    for b in batch:
        if b["phone"] in existing_phones:
            result.skipped_duplicate += 1
            continue
        final_batch.append(b)
        if b["status"] == ContactStatus.pending:
            pending_count += 1
            
    if not final_batch:
        return
        
    # 2. Bulk insert
    await db.execute(insert(Contact), final_batch)
    
    # 3. Update result and campaign counters
    imported_count = len(final_batch)
    result.imported += imported_count
    
    await db.execute(
        update(Campaign)
        .where(Campaign.id == campaign.id)
        .values(
            contacts_total=Campaign.contacts_total + imported_count,
            contacts_remaining=Campaign.contacts_remaining + pending_count
        )
    )
