import { useState } from 'react'
import axios from 'axios'
import { ChatInterface, type ChatMessage } from './components/ChatInterface'
import { DashboardCanvas } from './components/DashboardCanvas'
import { FileUpload } from './components/FileUpload'
import { Activity, Sparkles, Database, TableProperties } from 'lucide-react'

// Allow relative fetching in dev/prod
const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export default function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [insight, setInsight] = useState<string>('');
  const [sql, setSql] = useState<string>('');
  const [dbSchema, setDbSchema] = useState<string | null>(null);

  const handleSearch = async (query: string, history: ChatMessage[]) => {
    setLoading(true);
    try {
      const resp = await api.post('/query', { prompt: query, history });
      const resData = resp.data;

      if (resData.config) setConfig(resData.config);
      if (resData.data) setData(resData.data);
      if (resData.insight) setInsight(resData.insight);
      if (resData.sql) setSql(resData.sql);

    } catch (e) {
      console.error(e);
      setInsight("I'm sorry, I encountered an error connecting to the database engine.");
    } finally {
      setLoading(false);
    }
  }

  const handleUploadSuccess = (schema: string) => {
    setDbSchema(schema);
    // Optional: Reset dashboard state on new dataset
    setData([]);
    setConfig(null);
    setInsight('New dataset loaded. Ask me a question to generate a dashboard!');
    setSql('');
  }

  const handleClearChat = () => {
    setData([]);
    setConfig(null);
    setInsight('');
    setSql('');
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white bg-clip-text">InsightAI</h1>
            <p className="text-xs text-indigo-200/60 font-medium">Conversational BI Dashboard</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <Database className="w-4 h-4 text-emerald-400" />
          {dbSchema ? "Custom Dataset Active" : "Default Dataset Active"}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">

        {/* Left Column: Chat & Upload */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 h-full min-h-[500px]">
          <div className="flex-1 min-h-0">
            <ChatInterface onSearch={handleSearch} loading={loading} onClear={handleClearChat} />
          </div>
          <div className="shrink-0">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>

        {/* Right Column: Dashboard Canvas */}
        <div className="lg:col-span-6 xl:col-span-7 glass-panel rounded-2xl p-6 flex flex-col h-full overflow-hidden relative group">

          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          {/* AI Insight Header */}
          {insight ? (
            <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mt-1 p-2 bg-indigo-500/20 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-300 mb-1">AI Generated Insight</h3>
                <p className="text-sm text-gray-200 leading-relaxed">{insight}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 h-[76px] flex items-center justify-center border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
              Dashboard Canvas Awaiting Query
            </div>
          )}

          {/* Chart Area */}
          <div className="flex-1 min-h-0 w-full relative">
            {loading && !data.length ? (
              <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/5">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin"></div>
                  <p className="text-sm text-indigo-300 font-medium animate-pulse">Synthesizing data visualization...</p>
                </div>
              </div>
            ) : null}

            {config ? (
              <div className="h-full w-full animate-in zoom-in-95 duration-500">
                <DashboardCanvas data={data} config={config} sql={sql} insight={insight} />
              </div>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center opacity-30">
                <Activity className="w-24 h-24 text-gray-500 mb-6" />
                <p className="text-lg">No chart rendered yet.</p>
              </div>
            )}
          </div>

        </div>

        {/* Far Right Column: Data Dictionary Sidebar */}
        <div className="hidden lg:flex lg:col-span-2 xl:col-span-2 flex-col gap-4 h-full">
          <div className="glass-panel p-5 rounded-xl flex-1 flex flex-col border border-white/10 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4 shrink-0 px-1">
              <TableProperties className="w-4 h-4 text-emerald-400" />
              Active Schema
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {dbSchema ? (
                <div className="space-y-3">
                  <p className="text-xs text-indigo-200/50 leading-relaxed px-1">
                    The AI is currently analyzing this structure:
                  </p>
                  <pre className="text-[10px] md:text-xs text-emerald-300 font-mono bg-black/40 p-3 flex-1 rounded-lg border border-emerald-500/20 whitespace-pre-wrap overflow-x-hidden">
                    {dbSchema}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-50 text-center text-xs text-gray-400 p-4">
                  <Database className="w-8 h-8 mb-2 opacity-30" />
                  No specific schema loaded. The default dataset is active behind the scenes.
                </div>
              )}
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
