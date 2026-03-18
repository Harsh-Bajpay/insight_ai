from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import shutil
import pandas as pd
import re

from services import gemini_service, db_service
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str
    
class QueryRequest(BaseModel):
    prompt: str
    history: Optional[List[ChatMessage]] = None

def validate_sql(sql_query: str):
    """Anti-SQL Injection: Ensure query is safe to execute."""
    query_upper = sql_query.upper().strip()
    
    # Must start with SELECT
    if not query_upper.startswith("SELECT") and not query_upper.startswith("WITH"):
        raise ValueError("Only SELECT or WITH queries are allowed.")
        
    # Block destructive commands
    destructive_keywords = [
        r'\bDROP\b', r'\bDELETE\b', r'\bUPDATE\b', r'\bINSERT\b', 
        r'\bALTER\b', r'\bCREATE\b', r'\bTRUNCATE\b', r'\bCOPY\b',
        r'\bINSTALL\b', r'\bLOAD\b', r'\bPRAGMA\b', r'\bATTACH\b', r'\bDETACH\b'
    ]
    for pattern in destructive_keywords:
        if re.search(pattern, query_upper):
            raise ValueError(f"Security Alert: Destructive SQL keyword detected ({pattern}).")

@router.post("/query")
@limiter.limit("15/minute")
def process_query(request: Request, req: QueryRequest):
    try:
        # Step 1: LLM translates prompt to JSON Config
        # Ensure dict conversion for history if provided
        history_dict = [msg.model_dump() for msg in req.history] if req.history else []
        config = gemini_service.generate_dashboard_config(req.prompt, history_dict)
        
        if config.get("error"):
            # The LLM caught an error or graceful handling
            return {
                "data": [],
                "config": config.get("chartConfig"),
                "insight": config.get("insight")
            }

        sql_query = config.get("sql", "")
        if not sql_query:
             return {
                "data": [],
                "config": config.get("chartConfig"),
                "insight": config.get("insight")
            }

        # Step 2: Execute SQL Query against DuckDB, with Self-Healing Error Loop
        try:
            validate_sql(sql_query)
            results = db_service.execute_query(sql_query)
        except Exception as db_err:
            print(f"SQL Execution/Validation Error: {db_err}")
            # Self-Healing Retry (1 attempt)
            retry_history = history_dict + [
                {"role": "user", "content": req.prompt},
                {"role": "assistant", "content": f"Here is the config: {json.dumps(config)}"},
            ]
            retry_prompt = f"The SQL query you generated failed with this error from DuckDB: {str(db_err)}. Please generate a corrected SQL query and JSON configuration."
            
            print("Initiating Self-Healing Retry...")
            retry_config = gemini_service.generate_dashboard_config(retry_prompt, retry_history)
            
            if retry_config.get("error") or not retry_config.get("sql"):
                return {
                    "data": [],
                    "config": retry_config.get("chartConfig", config.get("chartConfig")),
                    "insight": "I tried to fix the query, but encountered another error: " + str(db_err),
                    "error": True
                }
                
            retry_sql = retry_config.get("sql", "")
            try:
                validate_sql(retry_sql)
                results = db_service.execute_query(retry_sql)
                config = retry_config
                sql_query = retry_sql
            except Exception as final_err:
                return {
                    "data": [],
                    "config": retry_config.get("chartConfig"),
                    "insight": f"Query failed after self-healing attempt: {str(final_err)}",
                    "error": True
                }

        # Step 3: Return payload to Frontend
        return {
            "data": results,
            "config": config.get("chartConfig"),
            "insight": config.get("insight"),
            "sql": sql_query # Include for transparency / debugging
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Uploads a new CSV and re-initializes DuckDB"""
    
    # 1. MIME Type Validation
    if not file.filename.endswith('.csv') or file.content_type not in ['text/csv', 'application/vnd.ms-excel']:
        raise HTTPException(status_code=400, detail="Security Error: Only valid CSV files are allowed.")
    
    upload_dir = "../uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    # 2. File Size Validation (Max 5MB)
    MAX_FILE_SIZE = 5 * 1024 * 1024 # 5MB
    
    try:
        with open(file_path, "wb") as buffer:
            size = 0
            while chunk := await file.read(1024 * 1024): # Read in 1MB chunks
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
                buffer.write(chunk)
            
        # Pre-process the CSV to clean headers for robust SQL parsing
        try:
            df = pd.read_csv(file_path)
            # Strip whitespace, lowercase, replace spaces with underscores, and remove special chars
            df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^a-z0-9_]', '', regex=True)
            df.to_csv(file_path, index=False)
        except Exception as preprocess_err:
            print(f"Failed to preprocess CSV headers: {preprocess_err}")
            # Non-fatal error; continue with original if pandas fails on a weird encoding.

        # Re-initialize DB with new dataset
        db_service.init_db(file_path)
        return {"message": f"Successfully loaded {file.filename}", "schema": db_service.get_db_schema()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
