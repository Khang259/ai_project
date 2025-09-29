from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # App Configuration
    app_name: str = "Honda_CameraAI"
    app_env: str = "development"
    app_debug: str = "true"
    app_port: str = "8000"
    app_host: str = "0.0.0.0"
    
    # Database
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "CamAI_Honda"
    
    # JWT
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Password
    password_hash_algorithm: str = "bcrypt"
    bcrypt_rounds: int = 12
    hashing_algorithm: str = "bcrypt"
    hashing_rounds: str = "12"
    
    # CORS
    cors_origins: str = "http://192.168.1.6:5173"
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env

settings = Settings()
