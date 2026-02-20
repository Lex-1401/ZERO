import React, { useState } from 'react';

interface MemoryResult {
  id: string;
  snippet: string;
  score: number;
  source: string;
  path?: string;
  startLine?: number;
  endLine?: number;
}

import { gatewayClient } from './lib/gateway';

export default function MemoryView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const stats = { totalFiles: 0, totalChunks: 0 };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      console.log('Buscando por:', query);
      const res = await gatewayClient.call('memory.search', { query, limit: 10 });
      setResults(res.results || []);
    } catch (err) {
      console.error('Falha na busca:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="memory-view">
      <div className="view-header">
        <h2 className="title-gradient">Grafo de Conhecimento</h2>
        <div className="stats-pills">
          <span className="pill">Arquivos: {stats.totalFiles}</span>
          <span className="pill">Fragmentos: {stats.totalChunks}</span>
        </div>
      </div>

      <form className="search-bar-container" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Busca semântica através de suas memórias..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? '...' : 'Buscar'}
        </button>
      </form>

      <div className="results-container">
        {results.length > 0 ? (
          results.map((res) => (
            <div key={res.id} className="memory-card glass-morphism">
              <div className="card-header">
                <span className="source-tag">{res.source}</span>
                <span className="score-tag">{(res.score * 100).toFixed(0)}% de correspondência</span>
              </div>
              <p className="memory-snippet">{res.snippet}</p>
              <div className="card-footer">
                <span className="path-info">
                  {res.path}:{res.startLine}
                </span>
                <div className="card-actions">
                  <button className="action-btn">Editar</button>
                  <button className="action-btn">Lembrar</button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <p>Nenhuma memória corresponde à sua consulta. Tente pesquisar por fatos ou preferências específicos.</p>
          </div>
        )}
      </div>

      <style>{`
        .memory-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 20px;
          padding: 10px;
        }
        .title-gradient {
            background: linear-gradient(90deg, #fff, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            font-size: 1.8rem;
        }
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stats-pills {
          display: flex;
          gap: 8px;
        }
        .pill {
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          color: #888;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .search-bar-container {
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          padding: 8px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 10px 16px;
          color: white;
          font-size: 1rem;
          outline: none;
        }
        .search-button {
          padding: 0 28px;
          background: #6366f1;
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .search-button:hover {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .results-container {
          flex: 1;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          padding-bottom: 20px;
        }
        .memory-card {
          padding: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.01);
          backdrop-filter: blur(10px);
          animation: cardSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .source-tag {
          color: #818cf8;
          font-weight: 700;
        }
        .score-tag {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .memory-snippet {
          color: #d1d5db;
          line-height: 1.6;
          font-size: 1rem;
          flex: 1;
        }
        .card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .path-info {
          font-size: 0.7rem;
          color: #4b5563;
          font-family: 'JetBrains Mono', monospace;
        }
        .card-actions {
            display: flex;
            gap: 8px;
        }
        .action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #9ca3af;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          opacity: 0.4;
          text-align: center;
          padding: 60px 0;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          filter: grayscale(1);
        }
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
