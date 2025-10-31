from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "CamAI_Honda"
    
    # JWT
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Password
    hashing_algorithm: str = "bcrypt"
    hashing_rounds: int = 12
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Environment
    app_env: str = "development"
    app_debug: bool = True
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()
