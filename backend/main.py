import os
import duckdb
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from routers import query
from services import db_service

CSV_PATH = os.getenv("CSV_PATH", "../dataset.csv")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load default dataset on startup
    print(f"Loading data from {CSV_PATH}...")
    try:
        db_service.init_db(CSV_PATH)
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
    yield
    # Cleanup on shutdown
    pass

app = FastAPI(title="Conversational BI Dashboard API", lifespan=lifespan)

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Allow Restricted CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174",
        "http://localhost:3000",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_headers=["*"],
)

# Enforce Trusted Hosts
app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "*.your-production-domain.com"]
)

# Inject Strict HTTP Security Headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; connect-src 'self' https://*.googleapis.com;"
    return response

app.include_router(query.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Conversational BI Dashboard API"}
