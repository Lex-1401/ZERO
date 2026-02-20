
import { useState, useEffect } from 'react';
import { gatewayClient } from './lib/gateway';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
}

interface AgentsViewProps {
  onDispatch?: (agentId: string) => void;
}

export default function AgentsView({ onDispatch }: AgentsViewProps) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res: any = await gatewayClient.call('agents.list', {});
      const mapped = (res.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name || a.id,
        role: a.role || 'Agente de Uso Geral',
        status: 'idle', // Placeholder status for now
        capabilities: a.capabilities || ['Raciocínio', 'Conversa'],
      }));
      setAgents(mapped);
    } catch (err) {
      console.error('Falha ao carregar agentes', err);
    }
  };

  return (
    <div className="agents-view">
      <div className="view-header">
        <h2 className="title-gradient">Enxame de Agentes</h2>
        <button className="add-agent-btn" onClick={loadAgents}>Atualizar Enxame</button>
      </div>

      <div className="agents-grid">
        {agents.length > 0 ? agents.map((agent) => (
          <div key={agent.id} className="agent-card glass-morphism">
            <div className={`status-indicator ${agent.status}`} />
            <div className="agent-info">
              <h3>{agent.name}</h3>
              <p className="agent-role">{agent.role}</p>
              <div className="capabilities-tags">
                {agent.capabilities.map((cap) => (
                  <span key={cap} className="cap-tag">{cap}</span>
                ))}
              </div>
            </div>
            <div className="agent-actions">
              <button className="control-btn">Configurar</button>
              <button className="control-btn primary" onClick={() => onDispatch && onDispatch(agent.id)}>Despachar</button>
            </div>
          </div>
        )) : (
          <div className="empty-state">
            <p>Nenhum agente configurado no seu enxame.</p>
          </div>
        )}
      </div>

      <style>{`
        .agents-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: 100%;
          padding: 10px;
        }
        .title-gradient {
            background: linear-gradient(90deg, #fff, #a78bfa);
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
        .add-agent-btn {
          background: rgba(167, 139, 250, 0.1);
          color: #a78bfa;
          border: 1px solid rgba(167, 139, 250, 0.2);
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-agent-btn:hover {
          background: rgba(167, 139, 250, 0.2);
          transform: scale(1.02);
        }
        .agents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .agent-card {
          padding: 24px;
          border-radius: 20px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          background: rgba(255, 255, 255, 0.02);
        }
        .agent-card:hover {
            border-color: rgba(167, 139, 250, 0.3);
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
            background: rgba(167, 139, 250, 0.05);
        }
        .status-indicator {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-indicator.idle { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .status-indicator.busy { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
        .status-indicator.offline { background: #6b7280; }
        
        .agent-info h3 { margin: 0; font-size: 1.2rem; color: white; }
        .agent-role { font-size: 0.85rem; color: #9ca3af; margin-top: 4px; }
        
        .capabilities-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }
        .cap-tag {
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          color: #aaa;
        }
        .agent-actions {
          display: flex;
          gap: 10px;
          margin-top: auto;
        }
        .control-btn {
          flex: 1;
          padding: 8px 0;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .control-btn:not(.primary) {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #9ca3af;
        }
        .control-btn.primary {
          background: #a78bfa;
          border: none;
          color: white;
        }
        .control-btn.primary:hover {
          background: #8b5cf6;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .empty-state {
            grid-column: 1 / -1;
            text-align: center;
            opacity: 0.5;
            padding: 40px;
        }
      `}</style>
    </div>
  );
}
