import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator

# Load environment variables from backend/.env explicitly
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

# Choose connect args based on the database type so local sqlite runs work
if DATABASE_URL.startswith("sqlite"):
    # sqlite specific args (sane defaults for local dev)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    # Postgres / networked DBs require SSL/connect timeouts
    engine = create_engine(
        DATABASE_URL,
        connect_args={"sslmode": "require", "connect_timeout": 5},
        pool_pre_ping=True,
    )

# Session maker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class
Base = declarative_base()

# Dependency
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

try:
    safe_db_url = DATABASE_URL.split("@", 1)[-1] if "@" in DATABASE_URL else DATABASE_URL
except Exception:
    safe_db_url = "(hidden)"
print("Connected to database:", safe_db_url)