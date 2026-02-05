import { useState, useEffect, useRef } from 'react';
import { gatewayClient } from './lib/gateway';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}


interface ChatViewProps {
  preselectAgentId?: string | null;
}

export default function ChatView({ preselectAgentId }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, [preselectAgentId]);

  useEffect(() => {
    if (sessionKey) {
      loadHistory(sessionKey);
      const unsub = gatewayClient.subscribe((evt) => {
        if (evt.event === 'chat') {
          const payload = evt.payload as any;
          if (payload.sessionKey === sessionKey && payload.message) {
            // Incoming message (final or partial? The helper usually sends final blocks or updates)
            // The backend sends 'state': 'final' with the full message object
            if (payload.state === 'final') {
              addMessage({
                id: payload.runId || Math.random().toString(36),
                role: payload.message.role,
                content: extractText(payload.message.content),
                timestamp: payload.message.timestamp
              });
            }
          }
        }
      });
      return () => { unsub(); };
    }
  }, [sessionKey]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const res: any = await gatewayClient.call('sessions.list', {});
      // Just pick the first one for now, or find one with 'default'
      const sessions = res.items || [];

      let targetSession = null;

      if (preselectAgentId) {
        // Look for an existing empty session or just the most recent one for this agent?
        // For now, let's try to find a session that belongs to this agent
        targetSession = sessions.find((s: any) => s.key.includes(`agent:${preselectAgentId}`));

        if (!targetSession) {
          // We can just rely on the user sending a message to a new key to create it,
          // but we need to generate a key client-side for "ChatView" to bind to.
          // We'll set a proposed key.
          const newKey = `agent:${preselectAgentId}:${Math.random().toString(36).substring(7)}`;
          setSessionKey(newKey);
          setMessages([]); // Clear history for new session
          return;
        }
      }

      if (targetSession) {
        setSessionKey(targetSession.key);
      } else if (sessions.length > 0) {
        setSessionKey(sessions[0].key);
      }
    } catch (err) {
      console.error('Failed to list sessions', err);
    }
  };

  const loadHistory = async (key: string) => {
    setLoading(true);
    try {
      const res: any = await gatewayClient.call('chat.history', { sessionKey: key, limit: 50 });
      const msgs = (res.messages || []).map((m: any) => ({
        id: m.id || Math.random().toString(),
        role: m.role,
        content: extractText(m.content),
        timestamp: m.timestamp
      }));
      setMessages(msgs);
    } catch (err) {
      console.error('Falha ao carregar histórico', err);
    } finally {
      setLoading(false);
    }
  };

  const extractText = (content: any) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(c => c.text || '').join('');
    }
    return '';
  };

  const addMessage = (msg: Message) => {
    setMessages(prev => {
      if (prev.find(p => p.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const [planMode, setPlanMode] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionKey) return;

    let userText = input;
    if (planMode) {
      userText = "[System: Explicitly PLAN your response in <plan> tags before answering.]\n\n" + userText;
    }

    setInput('');

    // Optimistic add
    const tempId = Math.random().toString(36).substr(2, 9);
    addMessage({
      id: tempId,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    });

    try {
      await gatewayClient.call('chat.send', {
        sessionKey,
        message: userText,
        idempotencyKey: tempId
      });
    } catch (err) {
      console.error('Falha ao enviar', err);
      // Could mark error state on message
    }
  };

  const renderContent = (content: string) => {
    // Simple parser for <think> and <plan> blocks
    const parts = content.split(/(<(?:think|plan)>[\s\S]*?<\/(?:think|plan)>)/g);

    return parts.map((part, i) => {
      if (part.startsWith('<think>') || part.startsWith('<plan>')) {
        const info = part.startsWith('<plan>') ? { label: 'Planejamento', class: 'planning' } : { label: 'Processo de Raciocínio', class: 'thinking' };
        const inner = part.replace(/<\/?(?:think|plan)>/g, '').trim();
        return (
          <details key={i} className={`reasoning-block ${info.class}`} open>
            <summary>{info.label}</summary>
            <div className="reasoning-content">{inner}</div>
          </details>
        );
      }
      if (!part.trim()) return null;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="chat-view">
      {loading && <div className="loading-bar">Carregando histórico...</div>}
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`message-row ${m.role}`}>
            <div className={`message-bubble ${m.role}`}>
              {m.role === 'assistant' ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <div className="toolbar">
          <label className={`toggle-btn ${planMode ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={planMode}
              onChange={(e) => setPlanMode(e.target.checked)}
              style={{ display: 'none' }}
            />
            🧠 Plano
          </label>
        </div>
        <input
          type="text"
          placeholder={sessionKey ? "Digite uma mensagem..." : "Nenhuma sessão ativa..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!sessionKey}
        />
        <button type="submit" disabled={!sessionKey}>Enviar</button>
      </form>

      <style>{`
        .chat-view {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .loading-bar {
            padding: 4px;
            text-align: center;
            font-size: 0.8rem;
            background: rgba(255,255,255,0.05);
            color: #aaa;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
        }
        .message-row {
          display: flex;
          width: 100%;
        }
        .message-row.user { justify-content: flex-end; }
        .message-row.assistant { justify-content: flex-start; }
        
        .message-bubble {
          max-width: 80%;
          padding: 12px 18px;
          border-radius: 18px;
          font-size: 0.95rem;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .message-bubble.user {
          background: #6366f1;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.assistant {
          background: rgba(255, 255, 255, 0.05);
          color: #e5e7eb;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%; /* allows details to expand */
        }
        
        .reasoning-block {
            margin: 8px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        .reasoning-block summary {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.8rem;
            font-weight: 600;
            color: #aaa;
            user-select: none;
            background: rgba(255, 255, 255, 0.05);
        }
        .reasoning-block.planning summary {
            color: #a78bfa;
            border-left: 3px solid #a78bfa;
        }
        .reasoning-block.thinking summary {
            color: #34d399;
            border-left: 3px solid #34d399;
        }
        .reasoning-content {
            padding: 12px;
            font-size: 0.9rem;
            color: #d1d5db;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-family: monospace;
            white-space: pre-wrap;
        }

        .chat-input-area {
          display: flex;
          gap: 12px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          align-items: center;
        }
        .toolbar {
            display: flex;
            align-items: center;
        }
        .toggle-btn {
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #aaa;
            font-size: 0.8rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .toggle-btn.active {
            background: rgba(167, 139, 250, 0.2);
            border-color: #a78bfa;
            color: #a78bfa;
        }
        
        .chat-input-area input[type="text"] {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 20px;
          border-radius: 12px;
          color: white;
          outline: none;
        }
        .chat-input-area button {
          background: #6366f1;
          color: white;
          border: none;
          padding: 0 24px;
          height: 42px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .chat-input-area button:disabled {
            background: #4b5563;
            cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
