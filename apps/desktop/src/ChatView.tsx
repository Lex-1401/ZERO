import React, { useState, useEffect, useRef } from 'react';
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

  const [currentModel, setCurrentModel] = useState<string>('');
  const [thinking, setThinking] = useState<string>('low');
  const [planMode, setPlanMode] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [preselectAgentId]);

  useEffect(() => {
    if (sessionKey) {
      loadHistory(sessionKey);
      syncSessionState(sessionKey);

      const unsub = gatewayClient.subscribe((evt) => {
        if (evt.event === 'chat') {
          const payload = evt.payload as any;
          if (payload.sessionKey === sessionKey && payload.message) {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const syncSessionState = async (key: string) => {
    try {
      const res: any = await gatewayClient.call('chat.history', { sessionKey: key, limit: 1 });
      if (res.thinkingLevel) setThinking(res.thinkingLevel);
    } catch (err) {
      console.error('Falha ao sincronizar estado da sessão', err);
    }
  };

  const loadSessions = async () => {
    try {
      const res: any = await gatewayClient.call('sessions.list', {});
      const sessions = res.items || [];
      let targetSession = null;

      if (preselectAgentId) {
        targetSession = sessions.find((s: any) => s.key.includes(`agent:${preselectAgentId}`));
        if (!targetSession) {
          const newKey = `agent:${preselectAgentId}:${Math.random().toString(36).substring(7)}`;
          setSessionKey(newKey);
          setMessages([]);
          return;
        }
      }

      if (targetSession) {
        setSessionKey(targetSession.key);
      } else if (sessions.length > 0) {
        setSessionKey(sessions[0].key);
      }
    } catch (err) {
      console.error('Falha ao listar sessões', err);
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

  const extractText = (content: any): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((c: any) => c.text || '').join('');
    }
    return '';
  };

  const addMessage = (msg: Message) => {
    setMessages((prev: Message[]) => {
      if (prev.find((p: Message) => p.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionKey) return;

    let userText = input;
    if (planMode) {
      userText = "[System: Explicitly PLAN your response in <plan> tags before answering.]\n\n" + userText;
    }
    setInput('');

    const tempId = Math.random().toString(36).substring(2, 11);
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
    }
  };

  const changeModelPreset = async (modelRef: string, level: string) => {
    if (!sessionKey) return;
    try {
      await gatewayClient.call('sessions.patch', {
        key: sessionKey,
        model: modelRef,
        thinkingLevel: level
      });
      setCurrentModel(modelRef);
      setThinking(level);
    } catch (err) {
      console.error('Falha ao mudar modelo', err);
    }
  };

  const presets = [
    { label: 'Gemini 3 Pro (Alto)', model: 'google/gemini-3-pro', level: 'high' },
    { label: 'Gemini 3 Pro (Baixo)', model: 'google/gemini-3-pro', level: 'low' },
    { label: 'Claude Opus 4.5', model: 'anthropic/claude-opus-4-5', level: 'low' },
    { label: 'GPT-5.2 Codex', model: 'openai/gpt-5.2', level: 'low' },
    { label: 'Llama 3.3 70B (Local)', model: 'ollama/llama3.3', level: 'off' },
  ];

  const renderContent = (content: string) => {
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
          <select
            className="model-picker"
            value={`${currentModel}|${thinking}`}
            onChange={(e) => {
              const [m, l] = e.target.value.split('|');
              changeModelPreset(m, l);
            }}
          >
            <option value="|">Selecionar Modelo...</option>
            {presets.map(p => (
              <option key={`${p.model}|${p.level}`} value={`${p.model}|${p.level}`}>
                {p.label}
              </option>
            ))}
          </select>

          <label className={`toggle-btn ${planMode ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={planMode}
              onChange={(e) => setPlanMode(e.target.checked)}
              style={{ display: 'none' }}
            />
            🧠 Planejamento
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
          background: transparent;
        }
        .loading-bar {
            padding: 8px;
            text-align: center;
            font-size: 0.75rem;
            background: linear-gradient(to right, #fff, #aaa);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: var(--text-secondary);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px;
        }
        .message-row {
          display: flex;
          width: 100%;
        }
        .message-row.user { justify-content: flex-end; }
        .message-row.assistant { justify-content: flex-start; }
        
        .message-bubble {
          max-width: 85%;
          padding: 10px 16px;
          border-radius: 18px;
          font-size: 0.88rem;
          line-height: 1.45;
          letter-spacing: -0.01em;
          white-space: pre-wrap;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .message-bubble.user {
          background: var(--user-bubble);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.assistant {
          background: var(--assistant-bubble);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          width: fit-content;
        }
        
        .reasoning-block {
            margin: 10px 0;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-md);
            background: rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }
        .reasoning-block summary {
            padding: 10px 14px;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.03);
            list-style: none;
        }
        .reasoning-block summary::-webkit-details-marker { display: none; }
        
        .reasoning-block.planning summary { color: #a78bfa; }
        .reasoning-block.thinking summary { color: #34d399; }
        
        .reasoning-content {
            padding: 12px;
            font-size: 0.82rem;
            color: var(--text-secondary);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
        }

        .chat-input-area {
          display: flex;
          gap: 12px;
          padding: 16px 24px;
          background: rgba(20, 20, 25, 0.5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--glass-border);
          align-items: center;
        }
        .toolbar {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .model-picker {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--glass-border);
            color: var(--text-secondary);
            font-size: 0.75rem;
            padding: 4px 8px;
            border-radius: 12px;
            outline: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .model-picker:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
        }
        .toggle-btn {
            cursor: pointer;
            padding: 4px 12px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            font-size: 0.75rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .toggle-btn:hover { background: rgba(255, 255, 255, 0.05); }
        .toggle-btn.active {
            background: rgba(167, 139, 250, 0.1);
            border-color: rgba(167, 139, 250, 0.3);
            color: #a78bfa;
        }
        
        .chat-input-area input[type="text"] {
          flex: 1;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 16px;
          border-radius: var(--radius-md);
          color: var(--text-primary);
          outline: none;
          font-size: 0.9rem;
        }
        .chat-input-area input[type="text"]:focus {
            border-color: var(--accent-color);
            background: rgba(255, 255, 255, 0.08);
        }
        .chat-input-area button {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0 16px;
          height: 36px;
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-input-area button:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.18);
        }
        .chat-input-area button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
