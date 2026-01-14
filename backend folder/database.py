from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
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

# Create database engine (connection to Neon PostgreSQL)
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Disable connection pooling for serverless
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    echo=False,  # Set to True for SQL debugging
    pool_pre_ping=True,  # Verify connections before using
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