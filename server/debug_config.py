from app.config import settings

def debug_elevenlabs_config():
    key = settings.elevenlabs_api_key
    if not key:
        print("ElevenLabs API Key is EMPTY")
        return
    
    print(f"Key length: {len(key)}")
    print(f"Key starts with: {key[:4]}...")
    print(f"Key ends with: ...{key[-4:]}")
    print(f"Base URL: {settings.elevenlabs_base_url}")

if __name__ == "__main__":
    debug_elevenlabs_config()
