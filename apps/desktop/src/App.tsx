// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ChatView from './ChatView';
import AgentsView from './AgentsView';
import MemoryView from './MemoryView';
import VoiceView from './VoiceView';
import AuditView from './AuditView';
import SettingsView from './SettingsView';
import { useGateway } from './lib/gateway';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const { isConnected } = useGateway();

  const handleDispatch = (agentId: string) => {
    setActiveAgentId(agentId);
    setActiveTab('chat');
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo-area">
          <h1>Zero</h1>
        </div>
        <div className="nav-items">
          <button
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Conversa
          </button>
          <button
            className={`nav-item ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            Agentes
          </button>
          <button
            className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            Voz 2.0
          </button>
          <button
            className={`nav-item ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            Memória
          </button>
          <button
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Auditoria
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Ajustes
          </button>
        </div>
        <div className="connection-status">
          <div className="status-indicator-container">
            <div className={`indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          </div>
          <div className="status-label">
            <span className="status-title">{isConnected ? 'Sistema Ativo' : 'Sistema Offline'}</span>
            <span className="status-subtitle">{isConnected ? 'Gateway Conectado' : 'Aguardando conexão...'}</span>
          </div>
        </div>
      </nav>

      <main className="content-area">
        {activeTab === 'chat' && <ChatView preselectAgentId={activeAgentId} />}
        {activeTab === 'agents' && <AgentsView onDispatch={handleDispatch} />}
        {activeTab === 'voice' && <VoiceView />}
        {activeTab === 'memory' && <MemoryView />}
        {activeTab === 'audit' && <AuditView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
