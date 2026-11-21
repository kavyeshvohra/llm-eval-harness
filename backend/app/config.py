import pydantic_settings


class Settings(pydantic_settings.BaseSettings):
    llm_api_key: str
    database_url: str

    model_config = pydantic_settings.SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()