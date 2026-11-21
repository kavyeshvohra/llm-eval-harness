from fastapi import Depends, FastAPI
from app.db import engine
from sqlalchemy import text
from app.routers import datasets, prompts
app = FastAPI(title="LLM Eval Harness")


@app.get("/health")
def health():
    return {
        "status": "ok"
    }

@app.get("/db-test")
def db_test():
    # Test the database connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        return {"status": "Database connection successful"}