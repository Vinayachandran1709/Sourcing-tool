from database import engine

try:
    # Try to connect to database
    connection = engine.connect()
    print("Successfully connected to Neon PostgreSQL!")
    print(f"Database URL: {engine.url}")
    connection.close()
except Exception as e:
    print("Connection failed!")
    print(f"Error: {e}")