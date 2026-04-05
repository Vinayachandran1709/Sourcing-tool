from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Log connection (hide password for security)
try:
    safe_url = DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'unknown'
    logger.info(f"Connecting to database: {safe_url}")
except Exception:
    logger.info("Connecting to database...")

# Create database engine with proper connection pooling
# QueuePool (default) reuses connections instead of creating new ones every request.
# This prevents connection exhaustion on Neon PostgreSQL under concurrent load.
engine = create_engine(
    DATABASE_URL,
    pool_size=5,              # Keep 5 connections ready in the pool
    max_overflow=10,          # Allow up to 10 extra connections under burst load
    pool_timeout=30,          # Wait up to 30s for a connection before erroring
    pool_recycle=300,         # Recycle connections every 5 min (prevents stale/closed connections)
    pool_pre_ping=True,       # Verify connections are alive before using (handles Neon idle disconnects)
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    echo=False,
)

# Create SessionLocal class (for database operations)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class (parent class for all models)
Base = declarative_base()

# Dependency function to get database session
def get_db():
    """
    This function provides a database session for API routes.
    It automatically closes the session after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_connection():
    """
    Get a raw database connection for direct SQL operations.
    Caller is responsible for closing the connection.

    PREFER using get_db() / SessionLocal() instead where possible.
    This exists only for legacy code that needs raw psycopg2 cursors.
    """
    return engine.raw_connection()
