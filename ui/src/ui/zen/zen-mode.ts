import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icons } from "../icons";

@customElement("zero-zen-mode")
export class ZeroZenMode extends LitElement {
  @property({ type: Object }) app: any;

  @state() view: "welcome" | "library" = "welcome";
  @state() searchQuery = "";

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: var(--bg-main);
      color: var(--text-main);
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      position: relative;
    }

    .zen-container {
      max-width: 1200px;
      margin: 0 auto;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 var(--s-6);
    }

    /* Header */
    .zen-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--s-6) 0;
    }

    .zen-brand {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      display: flex;
      align-items: center;
      gap: var(--s-2);
      cursor: pointer;
    }
    
    .zen-brand svg {
        width: 24px;
        height: 24px;
    }

    .zen-nav {
      display: flex;
      gap: var(--s-4);
    }

    .zen-nav-btn {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      padding: var(--s-2) var(--s-4);
      border-radius: var(--radius-full);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--s-2);
      transition: all var(--duration-fast) var(--ease-out);
      font-size: var(--font-size-sm);
    }

    .zen-nav-btn:hover, .zen-nav-btn.active {
      background: var(--bg-surface);
      color: var(--text-main);
      border-color: var(--border-main);
    }

    /* Welcome View */
    .welcome-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      animation: fade-in var(--duration-normal) var(--ease-out);
    }

    .greeting {
      font-size: 48px;
      font-weight: var(--font-weight-bold);
      margin-bottom: var(--s-10);
      text-align: center;
      background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }

    .search-container {
      width: 100%;
      max-width: 680px;
      position: relative;
      margin-bottom: var(--s-12);
    }

    .search-input {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-main);
      color: var(--text-main);
      font-size: var(--font-size-lg);
      padding: var(--s-5) var(--s-6);
      padding-right: var(--s-12);
      border-radius: var(--radius-xl);
      outline: none;
      transition: all var(--duration-fast) var(--ease-out);
      box-shadow: var(--shadow-card);
    }

    .search-input:focus {
      border-color: var(--accent-main);
      box-shadow: 0 0 0 4px var(--accent-subtle);
      background: var(--bg-surface-raised);
    }

    .search-icon {
      position: absolute;
      right: var(--s-5);
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--s-4);
      width: 100%;
      max-width: 900px;
    }

    .suggestion-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--s-6);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-premium);
      display: flex;
      flex-direction: column;
      gap: var(--s-3);
      position: relative;
      overflow: hidden;
    }

    .suggestion-card:hover {
      background: var(--bg-surface-raised);
      border-color: var(--border-main);
      transform: translateY(-4px);
      box-shadow: var(--shadow-floating);
    }

    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--bg-input);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-main);
    }

    .card-title {
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-md);
    }

    .card-desc {
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      line-height: 1.4;
    }

    /* Library View */
    .library-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-top: var(--s-8);
      animation: fade-in var(--duration-normal) var(--ease-out);
    }

    .active-push:active {
        transform: scale(0.97);
        transition: transform 50ms var(--ease-out);
    }

    .session-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--s-4);
        padding-bottom: var(--s-12);
        width: 100%;
    }

    .session-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--s-4);
        display: flex;
        align-items: center;
        gap: var(--s-4);
        cursor: pointer;
        transition: all var(--duration-fast);
    }

    .session-card:hover {
        background: var(--bg-surface-raised);
        border-color: var(--border-main);
        transform: translateY(-2px);
    }

    .session-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
        background: var(--bg-input);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }
    
    .session-info {
        flex: 1;
        overflow: hidden;
    }

    .session-title {
        font-weight: var(--font-weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-main);
    }

    .session-date {
        font-size: var(--font-size-xs);
        color: var(--text-muted);
        margin-top: 4px;
    }

    .session-arrow {
        color: var(--text-dim);
        opacity: 0;
        transition: opacity var(--duration-fast);
        transform: translateX(-4px);
    }

    .session-card:hover .session-arrow {
        opacity: 1;
        transform: translateX(0);
    }

    .spinner {
        border: 2px solid rgba(255,255,255,0.1);
        border-top: 2px solid var(--accent-main);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .chat-entry {
        animation: chat-entry var(--duration-normal) var(--ease-out) forwards;
    }
    
    .library-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--s-8);
    }

    .library-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
    }

    .library-search {
        width: 300px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        padding: var(--s-2) var(--s-4);
        border-radius: var(--radius-md);
        color: var(--text-main);
        outline: none;
    }
    
    .library-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        gap: var(--s-4);
    }
    
    .library-empty svg {
        width: 64px;
        height: 64px;
        opacity: 0.5;
    }
    
    .cta-button {
        background: var(--text-main);
        color: var(--bg-main);
        border: none;
        padding: var(--s-3) var(--s-6);
        border-radius: var(--radius-md);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--s-2);
        transition: opacity var(--duration-fast);
        margin-top: var(--s-4);
    }
    
    .cta-button:hover {
        opacity: 0.9;
    }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  render() {
    return html`
      <div class="zen-container">
        <!-- Header -->
        <header class="zen-header">
          <div class="zen-brand" @click=${() => this.view = "welcome"}>
            <div style="background: var(--text-main); border-radius: 50%; width: 24px; height: 24px;"></div>
            <span>Biblioteca</span>
          </div>
          <nav class="zen-nav">
            <button class="zen-nav-btn ${this.view === 'welcome' ? 'active' : ''}" @click=${() => this.view = 'welcome'}>
              ${icons.sparkles}
              <span>Novo</span>
            </button>
            <button class="zen-nav-btn ${this.view === 'library' ? 'active' : ''}" @click=${() => this.view = 'library'}>
              ${icons.folder}
              <span>Meus Arquivos</span>
            </button>
            <button class="zen-nav-btn" @click=${() => this.app.toggleZenMode(false)}>
                ${icons.terminal}
                <span>Sair do Zen</span>
            </button>
          </nav>
        </header>

        <!-- Main Content -->
        ${this.view === "welcome" ? this.renderWelcome() : this.renderLibrary()}
      </div>
    `;
  }

  renderWelcome() {
    return html`
      <div class="welcome-view">
        <h1 class="greeting">O que vamos criar hoje?</h1>
        
        <div class="search-container">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Descreva seu objetivo..."
            .value=${this.searchQuery}
            @input=${(e: any) => this.searchQuery = e.target.value}
            @keydown=${this.handleSearchKeydown}
          />
          <div class="search-icon">${icons.arrowRight}</div>
        </div>

        <div class="suggestions-grid">
          <div class="suggestion-card" @click=${() => this.startAction("Escrever Código")}>
            <div class="card-icon" style="color: var(--accent-blue)">${icons.code}</div>
            <div>
              <div class="card-title">Codificar</div>
              <div class="card-desc">Criar, refatorar ou explicar código de forma eficiente.</div>
            </div>
          </div>

          <div class="suggestion-card" @click=${() => this.startAction("Pesquisa Profunda")}>
            <div class="card-icon" style="color: var(--accent-purple)">${icons.globe}</div>
            <div>
              <div class="card-title">Pesquisar</div>
              <div class="card-desc">Investigação profunda sobre qualquer tópico.</div>
            </div>
          </div>

          <div class="suggestion-card" @click=${() => this.startAction("Brainstorm")}>
            <div class="card-icon" style="color: var(--accent-yellow)">${icons.sparkles}</div>
            <div>
              <div class="card-title">Ideação</div>
              <div class="card-desc">Brainstorming criativo e planejamento de projetos.</div>
            </div>
          </div>

          <div class="suggestion-card" @click=${() => this.startAction("Análise de Dados")}>
            <div class="card-icon" style="color: var(--accent-green)">${icons.barChart}</div>
            <div>
              <div class="card-title">Analisar</div>
              <div class="card-desc">Insights a partir de dados complexos e arquivos.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  firstUpdated() {
    // Carregar sessões ao iniciar
    this.app.handleSessionsLoad();
  }

  renderLibrary() {
    const sessions = this.app.sessionsResult?.sessions || [];
    const isLoading = this.app.sessionsLoading;

    return html`
      <div class="library-view">
        <div class="library-header">
            <h2 class="library-title">Meus Arquivos</h2>
            <div style="position: relative;">
                <input type="text" class="library-search" placeholder="Buscar arquivos..." 
                  .value=${this.searchQuery}
                  @input=${(e: any) => this.searchQuery = e.target.value}
                />
                 <div class="search-icon" style="right: 12px; font-size: 14px;">${icons.search}</div>
            </div>
        </div>
        
        ${isLoading && sessions.length === 0 ? html`
            <div class="library-empty">
                <div class="spinner"></div>
                <span>Carregando biblioteca...</span>
            </div>
        ` : sessions.length === 0 ? html`
            <div class="library-empty">
                <div style="opacity: 0.3; transform: scale(1.5); margin-bottom: 12px;">${icons.folderOpen}</div>
                <div style="font-size: var(--font-size-lg); font-weight: 500;">Nada na biblioteca</div>
                <div style="font-size: var(--font-size-sm); opacity: 0.7;">Construa sua própria base de conhecimento criando novas tarefas.</div>
                
                <button class="cta-button" @click=${() => this.view = 'welcome'}>
                    ${icons.plus}
                    <span>Nova tarefa</span>
                </button>
            </div>
        ` : this.renderSessionList(sessions)}
      </div>
    `;
  }

  renderSessionList(sessions: any[]) {
    // Filtrar sessões
    const filtered = sessions.filter(s =>
      s.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      s.id.includes(this.searchQuery)
    );

    return html`
        <div class="session-grid">
            ${filtered.map(session => html`
                <div class="session-card" @click=${() => this.openSession(session.id)}>
                    <div class="session-icon">
                        ${icons.messageSquare}
                    </div>
                    <div class="session-info">
                        <div class="session-title">${session.title || "Sem título"}</div>
                        <div class="session-date">${new Date(session.updatedAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                    <div class="session-arrow">${icons.arrowRight}</div>
                </div>
            `)}
        </div>
      `;
  }

  openSession(id: string) {
    if (this.app.setSessionKey) {
      this.app.setSessionKey(id);
    }
    this.app.toggleZenMode(false);
    this.app.setTab("chat");
  }

  handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.startAction(this.searchQuery);
    }
  }

  startAction(prompt: string) {
    this.app.toggleZenMode(false);
    // Switch to Chat tab and pre-fill prompt
    this.app.setTab("chat");
    this.app.chatMessage = prompt;
    // Optional: Auto-send
    // this.app.handleSendChat(prompt);
  }
}
