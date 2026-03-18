import { useRef } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface DashboardCanvasProps {
    data: any[];
    config: {
        type: string;
        xAxisKey: string;
        yAxisKeys: string[];
        labels: Record<string, string>;
        kpis?: { label: string; value: string }[];
    };
    sql?: string;
    insight?: string;
}

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function DashboardCanvas({ data, config, sql, insight }: DashboardCanvasProps) {
    const chartRef = useRef<HTMLDivElement>(null);

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 glass-panel rounded-xl h-full">
                <p>No data available to visualize.</p>
                <p className="text-xs mt-2 opacity-50">Query returned 0 results.</p>
            </div>
        );
    }

    const renderChart = () => {
        const { type, xAxisKey, yAxisKeys, labels } = config;

        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                            <XAxis dataKey={xAxisKey} stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#a1a1aa" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(15, 15, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            {yAxisKeys.map((key, index) => (
                                <Bar key={key} dataKey={key} name={labels[key] || key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                            <XAxis dataKey={xAxisKey} stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#a1a1aa" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(15, 15, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            {yAxisKeys.map((key, index) => (
                                <Line type="monotone" key={key} dataKey={key} name={labels[key] || key} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                            <XAxis dataKey={xAxisKey} stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#a1a1aa" />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 15, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            {yAxisKeys.map((key, index) => (
                                <Area type="monotone" key={key} dataKey={key} name={labels[key] || key} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.3} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                // Pie chart typically uses the first yAxisKey as the value
                const valKey = yAxisKeys[0];
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 15, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            <Legend />
                            <Pie
                                data={data}
                                nameKey={xAxisKey}
                                dataKey={valKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={130}
                                fill="#8884d8"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'table':
            default:
                // Render a basic HTML table if the visualization isn't a chart
                const cols = Object.keys(data[0] || {});
                return (
                    <div className="overflow-x-auto w-full max-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-white/5 sticky top-0">
                                <tr>
                                    {cols.map(col => <th key={col} className="px-6 py-3">{config.labels[col] || col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                                        {cols.map(col => <td key={`${i}-${col}`} className="px-6 py-4">{row[col]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
        }
    };

    const handleExportPNG = async () => {
        if (!chartRef.current) return;
        const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#0a0a0f' // Match background color for context
        });
        const link = document.createElement('a');
        link.download = 'insight-ai-chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleExportCSV = () => {
        if (!data || !data.length) return;
        const headers = Object.keys(data[0]).join(',');
        const csvContent = data.map(row =>
            Object.values(row).map(val => `"${val}"`).join(',')
        ).join('\n');

        const stringCSV = `${headers}\n${csvContent}`;
        const blob = new Blob([stringCSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'insight-ai-data.csv';
        link.click();
    };

    const handleExportPDF = async () => {
        if (!chartRef.current) return;
        const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#0a0a0f',
            scale: 2 // High-res
        });
        const imgData = canvas.toDataURL('image/png');

        // landscape, mm, a4
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.text("InsightAI - Analytics Report", 14, 15);
        pdf.addImage(imgData, 'PNG', 14, 25, pdfWidth - 28, pdfHeight - 20);

        if (insight) {
            pdf.setFontSize(10);
            const splitText = pdf.splitTextToSize(insight, pdfWidth - 28);
            pdf.text(splitText, 14, 30 + pdfHeight - 15);
        }

        pdf.save('insight-ai-report.pdf');
    };

    return (
        <div className="w-full h-full flex flex-col space-y-4">
            {config.kpis && config.kpis.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    {config.kpis.map((kpi, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center shadow-lg hover:shadow-indigo-500/10 transition-shadow">
                            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">{kpi.label}</span>
                            <span className="text-2xl font-bold text-white tracking-tight">{kpi.value}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-end gap-2 pr-2">
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-white/10"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                    onClick={handleExportPNG}
                    className="flex items-center gap-1.5 text-xs bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-full transition-colors border border-indigo-500/30"
                >
                    <Download className="w-3.5 h-3.5" /> PNG
                </button>
                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 text-xs bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-3 py-1.5 rounded-full transition-colors border border-rose-500/30"
                >
                    <FileText className="w-3.5 h-3.5" /> PDF
                </button>
            </div>

            <div className="flex-1 min-h-[400px]" ref={chartRef}>
                {renderChart()}
            </div>

            {sql && (
                <details className="text-xs text-gray-500 mt-4 cursor-pointer">
                    <summary className="font-mono hover:text-gray-300">View SQL Details</summary>
                    <pre className="mt-2 p-3 bg-black/40 rounded-md overflow-x-auto border border-white/5">
                        {sql}
                    </pre>
                </details>
            )}
        </div>
    );
}
