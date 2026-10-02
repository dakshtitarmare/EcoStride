import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- API Keys ---
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
AQICN_API_TOKEN = os.getenv("AQICN_API_TOKEN", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "False").lower() == "true"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Govt India Open Data Portal (Data.gov.in)
GOV_INDIA_API_KEY = os.getenv("GOV_INDIA_API_KEY", "YOUR_API_KEY")
GOV_INDIA_RESOURCE_ID = os.getenv("GOV_INDIA_RESOURCE_ID", "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69")

# --- Email / SMS Alerts (Optional) ---
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
AUTHORITY_EMAIL = os.getenv("AUTHORITY_EMAIL", "")
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

# --- Database ---
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "database", "teamx.db")

# --- Server Settings ---
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "5000"))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

# --- Data Update & Caching ---
DATA_UPDATE_INTERVAL = int(os.getenv("DATA_UPDATE_INTERVAL", "15"))
FORECAST_RETRAIN_DAYS = int(os.getenv("FORECAST_RETRAIN_DAYS", "7"))
CACHE_ENABLED = os.getenv("CACHE_ENABLED", "True").lower() == "true"
CACHE_DURATION = int(os.getenv("CACHE_DURATION", "900"))

# --- Firebase Configuration ---
FIREBASE_DATABASE_URL = os.getenv(
    "FIREBASE_DATABASE_URL",
    "https://eco-stride2026-default-rtdb.firebaseio.com"
)
FIREBASE_CREDENTIALS = os.getenv(
    "FIREBASE_CREDENTIALS",
    "eco-stride2026-firebase-adminsdk-fbsvc-1f2810f333.json"
)

# Local fallback storage for when Firebase is unavailable
USE_LOCAL_STORAGE_FALLBACK = os.getenv("USE_LOCAL_STORAGE_FALLBACK", "false").lower() == "true"
LOCAL_STORAGE_PATH = os.path.join(os.path.dirname(__file__), "local_storage")