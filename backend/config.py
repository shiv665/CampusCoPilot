"""
CampusCoPilot – Configuration
Reads secrets from environment variables / .env file.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# ── Azure AI Foundry (Llama endpoint) ────────────────────────────────
AZURE_AI_ENDPOINT: str = os.getenv("AZURE_AI_ENDPOINT", "")
AZURE_AI_PROJECT: str = os.getenv("AZURE_AI_PROJECT", "")
AZURE_AI_API_KEY: str = os.getenv("AZURE_AI_API_KEY", "")
AZURE_AI_DEPLOYMENT: str = os.getenv("AZURE_AI_DEPLOYMENT", "Llama-3.3-70B-Instruct")
AZURE_API_VERSION: str = os.getenv("AZURE_API_VERSION", "2025-11-15-preview")

# ── Azure Document Intelligence (PDF/OCR) ────────────────────────────
AZURE_DI_ENDPOINT: str = os.getenv("AZURE_DI_ENDPOINT", "")
AZURE_DI_KEY: str = os.getenv("AZURE_DI_KEY", "")

# ── Azure AI Search (RAG) ────────────────────────────────────────────
AZURE_SEARCH_ENDPOINT: str = os.getenv("AZURE_SEARCH_ENDPOINT", "")
AZURE_SEARCH_KEY: str = os.getenv("AZURE_SEARCH_KEY", "")
AZURE_SEARCH_INDEX: str = os.getenv("AZURE_SEARCH_INDEX", "campuscopilot-index")

# ── Token-budget guardrails ──────────────────────────────────────────
MAX_INPUT_TOKENS: int = int(os.getenv("MAX_INPUT_TOKENS", "4096"))
MAX_OUTPUT_TOKENS: int = int(os.getenv("MAX_OUTPUT_TOKENS", "2048"))
TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.3"))

# ── MongoDB (Atlas or Azure Cosmos DB for MongoDB API) ────────────────
MONGO_URI: str = os.getenv("MONGO_URI", "")  # Required — set in .env
MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "campuscopilot")

# ── JWT Authentication ───────────────────────────────────────────────
JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production-use-a-long-random-string")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

# ── ChromaDB vector store (local fallback when Azure Search not set) ──
CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "syllabus_chunks")

# ── Upload folder (temp, for PDF extraction) ─────────────────────────
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Server ──────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
