import os
import json
import hashlib
import re
from google import genai
from google.genai import types
from services import db_service

# Simple in-memory cache to save API calls
QUERY_CACHE = {}


api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Need API key from environment
    # Using dummy for type-checking, but it will fail on actual API call if not set
    pass

try:
    client = genai.Client(api_key=api_key)
except:
    client = None

# We use the recommended format for Recharts config from the prompt.
SYSTEM_PROMPT = """You are an expert Data Analyst and BI Developer interacting with a DuckDB SQL database.
You are helping a Non-Technical Executive understand their data.

Your job is to take the user's plain-English question and return a valid JSON object containing:
1. `sql`: The DuckDB SQL query to fetch the requested data.
   - ONLY SELECT the required columns.
   - Provide clear aliases (e.g., `SELECT AVG(monthly_income) AS avg_income`).
   - Limit the results to a reasonable amount (e.g. LIMIT 50) if the user asks for non-aggregated lists to avoid crashing the frontend.
   - Do not include markdown formatting (like ```sql) in the sql field itself.
2. `chartConfig`: A JSON configuration for rendering the data using Recharts on the frontend.
   - `type`: The type of chart: "bar", "line", "pie", "area", "composed", "scatter", or "table" (if visualization isn't appropriate). Choose the most Contextual chart.
   - `xAxisKey`: The column name to use for the X-axis (the independent variable or category).
   - `yAxisKeys`: An array of one or more column names to use for the Y-axis (the dependent variables or metrics).
   - `labels`: An object mapping the data column names to human-readable labels for the legend/tooltips. Example: `{{"avg_income": "Average Monthly Income"}}`.
3. `kpis`: An array of exactly 3 Key Performance Indicator objects calculated from the data that summarize the most important high-level numbers.
   - Each object must have a `label` (string) and a `value` (string, formatted nicely with $, % etc).
4. `insight`: A brief, 1-2 sentence text explaining what the data shows, summarizing highlights or answering the core question. Do not hallucinate numbers not in the query. If the query doesn't make sense or the data isn't available, explain that gracefully here and return an empty SQL query and "table" chart type.

Format exactly as follows:
{{
  "sql": "SELECT ...",
  "chartConfig": {{
    "type": "bar",
    "xAxisKey": "category_col",
    "yAxisKeys": ["metric1", "metric2"],
    "labels": {{
      "category_col": "Category",
      "metric1": "First Metric",
      "metric2": "Second Metric"
    }}
  }},
  "kpis": [
    {{"label": "Total Revenue", "value": "$1.2M"}},
    {{"label": "Active Users", "value": "45,200"}},
    {{"label": "Growth Rate", "value": "+12%"}}
  ],
  "insight": "Your text insight here."
}}

Here is the database schema for the table `dataset`:
{schema}

Always return valid strictly-formatted JSON matching the schema above. No markdown code blocks surrounding the final output json.
"""

def generate_dashboard_config(user_prompt: str, chat_history: list = None) -> dict:
    """Uses Gemini API to generate SQL and Chart configuration from user prompt."""
    
    # Anti-Prompt Injection Heuristic
    JAILBREAK_PHRASES = [
        r'ignore previous', r'ignore all', r'forget previous', r'system prompt',
        r'bypass', r'jailbreak', r'print your instructions', r'developer mode'
    ]
    prompt_lower = user_prompt.lower()
    for phrase in JAILBREAK_PHRASES:
        if re.search(phrase, prompt_lower):
            print(f"Jailbreak attempt blocked: {phrase}")
            return {
                "sql": "",
                "chartConfig": {"type": "table", "xAxisKey": "", "yAxisKeys": [], "labels": {}},
                "kpis": [],
                "insight": "Security Policy Violation: I cannot process commands that attempt to alter or reveal my core instructions.",
                "error": True
            }

    if not client:
        raise Exception("Gemini client not initialized. Check your GEMINI_API_KEY environment variable.")
        
    schema = db_service.get_db_schema()
    formatted_system_prompt = SYSTEM_PROMPT.format(schema=schema)
    
    # Simple history string formatting
    history_context = ""
    if chat_history:
        history_context = "Previous Conversation:\n"
        for msg in chat_history:
            role = "User" if msg["role"] == "user" else "Assistant (Data Tool)"
            history_context += f"{role}: {msg['content']}\n"
        history_context += "\n"

    user_input = f"{history_context}Current Request: {user_prompt}"
    
    # Check cache first
    cache_key = hashlib.md5(f"{schema}{user_input}".encode()).hexdigest()
    if cache_key in QUERY_CACHE:
        print("Cache hit! Returning instantly.")
        return QUERY_CACHE[cache_key]

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_input,
            config=types.GenerateContentConfig(
                system_instruction=formatted_system_prompt,
                response_mime_type="application/json",
            )
        )
        
        # Parse output
        response_jsonStr = response.text
        # Sometimes the model still outputs markdown blocks even with response_mime_type (less likely, but safe to strip)
        if response_jsonStr.startswith("```json"):
            response_jsonStr = response_jsonStr.replace("```json\n", "")
            response_jsonStr = response_jsonStr.replace("\n```", "")
            
        config = json.loads(response_jsonStr)
        
        # Save to cache
        if not config.get("error"):
            QUERY_CACHE[cache_key] = config
            
        return config
    
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        # Graceful fallback error handler
        return {
            "sql": "",
            "chartConfig": {
                "type": "table",
                "xAxisKey": "",
                "yAxisKeys": [],
                "labels": {}
            },
            "kpis": [],
            "insight": f"I couldn't process your request due to an error: {str(e)}",
            "error": True
        }
