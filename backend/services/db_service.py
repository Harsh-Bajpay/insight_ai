import duckdb
import pandas as pd
import os
import traceback

conn = None

def init_db(csv_path: str):
    global conn
    if conn is None:
        conn = duckdb.connect(database=':memory:')
    
    # Check if table already exists and drop it to reload
    try:
        conn.execute("DROP TABLE IF EXISTS dataset")
    except Exception:
        pass
        
    try:
        # Load CSV into DuckDB memory
        # 'auto_detect=True' helps duckdb infer types
        conn.execute(f"CREATE TABLE dataset AS SELECT * FROM read_csv_auto('{csv_path}')")
    except Exception as e:
        print(f"Error loading CSV {csv_path}: {str(e)}")
        raise e

def get_db_schema() -> str:
    """Returns the schema of the dataset table for the LLM prompt."""
    if conn is None:
        return "Database not initialized."
    
    try:
        schema_df = conn.execute("DESCRIBE dataset").df()
        # Format as string: column_name (type)
        schema_str = "\n".join([f"- {row['column_name']} ({row['column_type']})" for _, row in schema_df.iterrows()])
        return schema_str
    except Exception as e:
        return f"Error fetching schema: {str(e)}"

def execute_query(sql_query: str) -> list[dict]:
    """Execute SQL query and return results as a list of dictionaries."""
    if conn is None:
        raise Exception("Database not initialized")
    
    print(f"Executing SQL: {sql_query}")
    try:
        df = conn.execute(sql_query).df()
        # Sanitize column names (remove extra embedded double quotes from DuckDB aliases)
        df.columns = df.columns.astype(str).str.replace('"', '', regex=False)
        # Handle nan values/etc for JSON serialization
        df = df.fillna("")
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"Query Execution Error: {str(e)}")
        traceback.print_exc()
        raise e
