# InsightAI: Conversational BI Dashboard 📊🚀

InsightAI is a powerful, instant Business Intelligence dashboard generator. Instead of manually dragging and dropping charts or writing SQL queries, users can simply type questions in plain English (e.g., *"Show me the average online spend by city tier"*). The system automatically writes the SQL, queries the data, selects the best visualization type, and renders a stunning, interactive dashboard in real-time.

## ✨ Key Features
*   **Natural Language to Dashboard**: Ask questions in plain English; get fully-formed Recharts back.
*   **Self-Healing SQL Generation**: If the AI hallucinates an invalid query, the backend automatically catches the DuckDB error and recursively feeds it back to the LLM for instant autonomous correction.
*   **High-Speed In-Memory Analytics**: Utilizes DuckDB for sub-second, lightning-fast analytical queries directly on CSV datasets.
*   **Dynamic Visualizations**: Automatically determines the best chart type (Bar, Line, Area, Pie) based on the context of the data requested.
*   **Instant Export**: One-click download of charts as PNG images and raw query data as CSV files.
*   **Query Caching**: Exact queries are cached in-memory. If a user asks the same question twice, the dashboard loads instantly with zero AI latency.
*   **Robust Data Pre-Processing**: Uploaded CSV files are automatically sanitized via Pandas to strip dangerous characters and spaces from column headers before SQL generation.
*   **Beautiful Glassmorphism UI**: A dark-mode, premium Next.js and Tailwind UI that feels responsive and high-end.

## 🏗️ Architecture Stack
*   **Frontend**: React, Next.js, Vite, TailwindCSS, Recharts, Lucide Icons.
*   **Backend**: Python, FastAPI, DuckDB, Pandas, SlowAPI (Rate Limiting).
*   **AI Engine**: Google Gemini 2.5 Flash API.

## 🚀 Quickstart: Docker

The absolute easiest way to start the application is via Docker Compose.

1.  **Set your Gemini API Key**:
    Open `docker-compose.yml` or create an `.env` file and provide your API Key:
    ```bash
    export GEMINI_API_KEY="your_api_key_here"
    ```

2.  **Start the Cluster**:
    ```bash
    docker-compose up --build
    ```

3.  **Access the App**:
    *   Frontend UI: `http://localhost:5174`
    *   Backend API Docs: `http://localhost:8000/docs`

## 🛠️ Quickstart: Local Development

If you prefer running without Docker:

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY="your_api_key_here"
uvicorn main:app --reload
```
*(Runs on port 8000)*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*(Runs on port 5173/5174)*

## 🧩 How to Use the App
1.  **Boot it up**. The app loads with a default sample dataset.
2.  **Ask a Question**: Click one of the Suggested Prompts or type "Show the total transactions grouped by gender".
3.  **View & Export**: Hover over the interactive charts. Click "PNG" or "CSV" to export the results.
4.  **Upload Custom Data**: Click the "Upload Dataset" button on the left to drag-and-drop your own `.csv` file. InsightAI will instantly learn the new schema!
5.  **Clear Context**: Use the "Trash" icon in the top right of the chat to wipe the AI's conversation memory for fresh queries.
