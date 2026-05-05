import os
from dotenv import load_dotenv
from pathlib import Path

# Ensure we load the repository-level .env (backend/.env) regardless of CWD
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")