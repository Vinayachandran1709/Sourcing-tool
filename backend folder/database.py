from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Create database engine (connection to Neon PostgreSQL)
engine = create_engine(DATABASE_URL)

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
