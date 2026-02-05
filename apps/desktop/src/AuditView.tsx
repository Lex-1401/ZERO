import { useEffect, useState, useRef } from 'react';
import { gatewayClient } from './lib/gateway';

interface LogResponse {
    lines: string[];
    cursor: number;
    size: number;
    reset: boolean;
    truncated: boolean;
    file: string;
}

export default function AuditView() {
    const [logs, setLogs] = useState<string[]>([]);
    const [cursor, setCursor] = useState<number>(0);
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [filter, setFilter] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<number | undefined>(undefined);

    const fetchLogs = async () => {
        try {
            const result = await gatewayClient.call('logs.tail', {
                cursor: cursor || undefined,
                limit: 100
            }) as LogResponse;

            if (result && result.lines.length > 0) {
                setLogs(prev => [...prev.slice(-900), ...result.lines]); // Keep last 1000 lines
                setCursor(result.cursor);
            }
        } catch (err) {
            console.error('Falha ao buscar registros', err);
        }
    };

    useEffect(() => {
        fetchLogs();
        pollingRef.current = window.setInterval(fetchLogs, 2000);
        return () => window.clearInterval(pollingRef.current);
    }, [cursor]);

    useEffect(() => {
        if (isAutoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isAutoScroll]);

    const filteredLogs = logs.filter(line =>
        line.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="audit-view">
            <div className="audit-header glass-morphism">
                <h2>🛡️ Auditoria de Segurança e Registros</h2>
                <div className="audit-controls">
                    <input
                        type="text"
                        placeholder="Filtrar registros..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="search-input"
                    />
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={isAutoScroll}
                            onChange={(e) => setIsAutoScroll(e.target.checked)}
                        />
                        Rolagem automática
                    </label>
                    <button className="refresh-btn" onClick={fetchLogs}>🔄</button>
                </div>
            </div>

            <div className="terminal-window">
                {filteredLogs.map((line, idx) => {
                    let colorClass = 'log-info';
                    if (line.includes('WARN')) colorClass = 'log-warn';
                    if (line.includes('ERROR') || line.includes('fail') || line.includes('unauthorized')) colorClass = 'log-error';
                    if (line.includes('device')) colorClass = 'log-device';

                    return (
                        <div key={idx} className={`log-line ${colorClass}`}>
                            <span className="line-number">{idx + 1}</span>
                            <span className="line-content">{line}</span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <style>{`
                .audit-view {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 20px;
                    gap: 20px;
                }
                .audit-header {
                    padding: 15px 25px;
                    border-radius: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(13, 17, 23, 0.8);
                    border: 1px solid rgba(48, 54, 61, 0.8);
                }
                .audit-controls {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                }
                .search-input {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid #30363d;
                    padding: 8px 12px;
                    border-radius: 6px;
                    color: #c9d1d9;
                    min-width: 200px;
                }
                .terminal-window {
                    flex: 1;
                    background: #0d1117;
                    border: 1px solid #30363d;
                    border-radius: 8px;
                    padding: 10px;
                    overflow-y: auto;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 13px;
                    box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
                }
                .log-line {
                    display: flex;
                    gap: 10px;
                    padding: 2px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                }
                .line-number {
                    color: #484f58;
                    user-select: none;
                    min-width: 30px;
                    text-align: right;
                }
                .line-content {
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                .log-info { color: #8b949e; }
                .log-warn { color: #d29922; }
                .log-error { color: #f85149; font-weight: bold; background: rgba(248, 81, 73, 0.1); }
                .log-device { color: #58a6ff; }
                
                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    user-select: none;
                    color: #8b949e;
                }
                .refresh-btn {
                    background: none;
                    border: 1px solid #30363d;
                    border-radius: 6px;
                    padding: 5px 10px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .refresh-btn:hover {
                    background: rgba(255,255,255,0.1);
                }
            `}</style>
        </div>
    );
}
