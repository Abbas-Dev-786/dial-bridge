from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_secret_key: str
    debug: bool = False

    database_url: str
    redis_url: str = "redis://localhost:6379/0"

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    elevenlabs_api_key: str
    elevenlabs_base_url: str = "https://api.elevenlabs.io/v1"
    elevenlabs_webhook_secret: str = ""
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    frontend_url: str = "http://localhost:8080"

    # Integrations
    hubspot_client_id: str = ""
    hubspot_client_secret: str = ""
    salesforce_client_id: str = ""
    salesforce_client_secret: str = ""
    slack_client_id: str = ""
    slack_client_secret: str = ""
    google_cal_client_id: str = ""
    google_cal_client_secret: str = ""
    pipedrive_client_id: str = ""
    pipedrive_client_secret: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        if self.is_production:
            return [self.frontend_url]
        return ["*"]

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
