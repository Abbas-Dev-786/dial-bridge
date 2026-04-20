import asyncio
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.call import Call
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Campaign))
        campaigns = result.scalars().all()
        for c in campaigns:
            print(f"=== Campaign: {c.name} ===")
            print(f"Status: {c.status}")
            print(f"Schedule Days: {c.schedule_days}")
            print(f"Start: {c.schedule_start_time}, End: {c.schedule_end_time}")
            print(f"TZ: {c.timezone}")
            print(f"Max Concurrency: {c.max_concurrency}")
            
            # contacts
            res2 = await db.execute(select(Contact).where(Contact.campaign_id == c.id))
            contacts = res2.scalars().all()
            print(f"Total Contacts: {len(contacts)}")
            for pt in contacts:
                print(f"  Contact: {pt.phone}, status: {pt.status}, DNC: {pt.is_dnc}, Next Retry: {pt.next_retry_at}")
                
            # calls
            res3 = await db.execute(select(Call).where(Call.campaign_id == c.id))
            calls = res3.scalars().all()
            print(f"Total Calls: {len(calls)}")
            for cl in calls:
                print(f"  Call: {cl.to_number}, Status: {cl.status}, Error: {cl.error_message}")

asyncio.run(main())
