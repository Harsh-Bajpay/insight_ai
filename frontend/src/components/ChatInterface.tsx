import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, Trash2, Lightbulb, Mic, MicOff } from 'lucide-react';
import { Button, Input } from './ui/core';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    onSearch: (query: string, history: ChatMessage[]) => Promise<void>;
    loading: boolean;
    onClear: () => void;
}

export function ChatInterface({ onSearch, loading, onClear }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Setup Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = useRef<any>(null);

    useEffect(() => {
        if (SpeechRecognition) {
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = false;
            recognition.current.interimResults = false;
            recognition.current.lang = 'en-US';

            recognition.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue((prev) => prev ? prev + ' ' + transcript : transcript);
                setIsListening(false);
            };

            recognition.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [SpeechRecognition]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognition.current?.stop();
            setIsListening(false);
        } else {
            recognition.current?.start();
            setIsListening(true);
        }
    }, [isListening]);

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || loading) return;

        const newQuery = inputValue.trim();
        const newMessages = [...messages, { role: 'user', content: newQuery } as ChatMessage];
        setMessages(newMessages);
        setInputValue('');

        // the callback is responsible for generating the AI reply and updating external state
        await onSearch(newQuery, newMessages);

        // We append a generic "Here is the dashboard" message
        setMessages(prev => [...prev, { role: 'assistant', content: 'I generated the dashboard based on your query.' }]);
    };

    const handleSuggestionClick = (query: string) => {
        setInputValue(query);
    };

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/10 overflow-hidden relative">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-400" /> BI Assistant
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setMessages([]); onClear(); }}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Clear Conversation"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5 status-indicator">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Online
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                        <Bot className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm max-w-[250px] mb-6">Ask a question about your data in plain English to generate a dashboard.</p>

                        <div className="w-full max-w-sm space-y-2">
                            <p className="text-xs font-semibold text-indigo-400/60 uppercase tracking-wider mb-3 flex items-center justify-center gap-1">
                                <Lightbulb className="w-3 h-3" /> Suggestions
                            </p>
                            {[
                                "Show me the average online spend by gender",
                                "What is the total monthly income split by city tier?",
                                "Show the distribution of age across different professions"
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="w-full text-left text-xs bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 text-gray-300 py-2.5 px-4 rounded-xl transition-all block truncate"
                                    title={suggestion}
                                >
                                    "{suggestion}"
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 outline outline-1 outline-indigo-500 rounded-tr-sm text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white/10 rounded-tl-sm text-gray-200 border border-white/5'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 rounded-2xl border border-white/5 rounded-tl-sm px-4 py-2.5 text-sm flex items-center gap-2 text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            Analyzing data...
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            <div className="p-3 bg-white/5 border-t border-white/10 backdrop-blur-md">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about your data in plain English..."
                        className="flex-1 bg-black/40 border-white/10 text-white rounded-full px-5 py-5 disabled:opacity-50"
                        disabled={loading}
                    />
                    {SpeechRecognition && (
                        <Button
                            type="button"
                            onClick={toggleListening}
                            disabled={loading}
                            size="icon"
                            className={`rounded-full w-10 h-10 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                            title="Voice Input"
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={!inputValue.trim() || loading}
                        size="icon"
                        className="rounded-full w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
