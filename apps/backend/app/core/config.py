from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "zhitou-copilot"
    api_base_url: str = "http://127.0.0.1:8001"
    public_api_base_url: str = "http://127.0.0.1:8001"
    allow_origins: str = "*"

    database_url: str = "sqlite:///./data/zhitou_copilot.sqlite3"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 50

    lanxin_api_base_url: str = ""
    lanxin_api_key: str = ""
    lanxin_text_model: str = ""
    lanxin_asr_model: str = ""
    lanxin_tts_model: str = ""

    ai_provider: str = "lanxin"
    ai_timeout_seconds: int = 60
    ai_enable_mock: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allow_origins_list(self) -> list[str]:
        if self.allow_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.allow_origins.split(",") if origin.strip()]


settings = Settings()

