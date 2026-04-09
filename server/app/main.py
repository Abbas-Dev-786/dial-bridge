from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
from app.config import settings
from app.api.v1.router import router as v1_router
from app.api.v1.webhooks import router as webhook_router

logger = structlog.get_logger(__name__)

app = FastAPI(
    title="DialBridge API",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router)
app.include_router(v1_router, prefix="/api/v1")

@app.on_event("startup")
async def validate_config():
    if not settings.elevenlabs_api_key:
        if settings.is_production:
            raise RuntimeError(
                "ELEVENLABS_API_KEY is not set. "
                "The platform cannot start without a valid ElevenLabs API key."
            )
        logger.warning(
            "ELEVENLABS_API_KEY is not set. ElevenLabs-dependent features are disabled."
        )

@app.get("/health")
async def health():
    return {"status": "ok"}
