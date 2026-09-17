import os

from dotenv import load_dotenv

load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")


if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing from .env")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from .env")


class Config:
    SECRET_KEY = SECRET_KEY

    SQLALCHEMY_DATABASE_URI = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Production-safe connection pool settings for PostgreSQL/Supabase
    # - pool_pre_ping: tests connection liveness before checkout to prevent stale connection errors
    # - pool_recycle: proactively recycles connections after 5 minutes (300s) to avoid cloud idle timeouts
    # - pool_size / max_overflow: conservative baseline concurrency per worker process
    # - pool_timeout: wait up to 30s for an available pool slot before failing
    # - connect_timeout: driver-level socket connection timeout (10s)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }

    if not DATABASE_URL.startswith("sqlite"):
        SQLALCHEMY_ENGINE_OPTIONS.update({
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
            "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
            "connect_args": {
                "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
            },
        })

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000"
    )