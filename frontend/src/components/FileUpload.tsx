import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/core';

interface FileUploadProps {
    onUploadSuccess: (schema: string) => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                onUploadSuccess(data.schema);
            } else {
                setStatus('error');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center space-y-4 text-center border-dashed border-2 border-white/20">
            <div className="p-4 bg-white/5 rounded-full">
                <UploadCloud className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
                <h3 className="text-lg font-medium text-white mb-1">Upload Custom Dataset</h3>
                <p className="text-sm text-gray-400">CSV format only. Schema will be automatically inferred.</p>
            </div>

            <div className="flex items-center space-x-2 w-full max-w-xs">
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="flex-1 cursor-pointer bg-white/10 hover:bg-white/20 transition-colors text-sm rounded-md py-2 px-3 border border-white/10 truncate">
                    {file ? file.name : "Choose file..."}
                </label>
                <Button onClick={handleUpload} disabled={!file || loading} size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white border-0">
                    {loading ? "Uploading..." : "Upload"}
                </Button>
            </div>

            {status === 'success' && <div className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Dataset ready for queries</div>}
            {status === 'error' && <div className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Failed to upload dataset</div>}
        </div>
    )
}
