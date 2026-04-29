import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "")))
load_dotenv()

async def main():
    from app.services.elevenlabs_client import ElevenLabsClient
    async with ElevenLabsClient() as client:
        conv = await client.get_conversation("conv_7601kqc3kx3je8y86s7zban6h82x")
        print("Conversation metadata:")
        print(conv)

if __name__ == "__main__":
    asyncio.run(main())
