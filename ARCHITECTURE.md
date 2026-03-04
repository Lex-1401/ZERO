# ∅ ZERO — Agentic Operating System (A-POS)

## Master Architecture & Subsystem Layout

O sistema ZERO não é apenas uma aplicação monolítica; é um sistema operacional híbrido desenhado para orquestrar agentes autônomos locais, garantir soberania de dados e integrar segurança de nível militar através do seu núcleo nativo.

Este documento detalha o "Blueprint" arquitetural do projeto, organizando as responsabilidades dos módulos principais e fluxos de dados.

---

### 1. Visão Geral da Arquitetura (A-POS)

A arquitetura se divide em **Quatro Camadas Principais**:

1. **Kernel Nativo (Rust-Core)**: O coração performático do sistema, focado em segurança, telemetria e tarefas de altíssima latência-zero. Inclui os motores **Sentinel** (Segurança) e **D2LEngine** (Internalização de Contexto via LoRA).
2. **Gateway (Orquestrador Central)**: O cérebro RPC escrito em TypeScript que roteia mensagens, gerencia sessões ativas e interage com os clientes (UI e Terminais).
3. **Sensores e Canais (Adapters)**: Interfaces para os mundos externo e físico (WhatsApp, Slack, Telegram, Audio VAD).
4. **Agentes e Córtex Cognitivo**: As instâncias LLM, injetores de memória (RAG local) e interpretadores de ferramentas.

---

### 2. Mapa dos Subsistemas

| Componente | Localização | Responsabilidade Técnica |
| --- | --- | --- |
| **Gateway RPC** | `src/gateway/` | Servidor WebSocket de transporte. Atua como o barramento principal de eventos do A-POS. Conecta UI local, terminal e dispositivos externos. |
| **Sentinel (Segurança)** | `src/security/` | Firewall IA e proteção PII injetada do `rust-core`. Faz sanitização anti-Prompt Injection e auditoria CoT (Chain of Thought). |
| **Node Registry** | `src/node-host/` | Orquestra "nós" remotos (outras máquinas na LAN/WAN) permitindo execução distribuída (SSH/Docker exec) controlada. |
| **Channels** | `src/channels/`, `src/web/`, `src/slack/` | Adaptadores de comunicação bi-direcionais para mensageria. Normalizam as interações dos usuários para o padrão de Sessão Interna do ZERO. |
| **Agent Core** | `src/agents/` | Lógica de governança do modelo de IA. Resolução de ferramentas (TUI/Bash/Web/Memory) baseada nos Escopos de Identidade (`agent-scope.ts`). |
| **Graph-RAG** | `src/memory/` | Motor de Memória Semântica baseado em Grafos (SQLite). Realiza extração automática de entidades/relações e injeção de contexto associativo. |
| **D2L (Context)** | `src/memory/` | Dynamic Document-to-LoRA. Gerencia Context Caching via fingerprinting e internalização de documentos via adapters LoRA dinâmicos. |
| **Realtime Engine** | `src/realtime/` | Cliente WebRTC/WebSocket para interfaces multimodais contínuas de latência mínima (Gemini/OpenAI realtime APIs). |
| **Quantum Altair (UI)** | `ui/` | Interface visual premium. Oferece controle mestre e telemetria (dashboards, chat, marketplace interno). |

---

### 3. Anatomia de uma Requisição (Data Flow)

O caminho de uma mensagem originada do canal de mensageria até a resposta do Agente:

1. **Recepção**: O Webhook ou Long-Polling de um Adapter (ex: `src/telegram/bot.ts`) recebe a mensagem em texto plano ou áudio.
2. **Sessão Mapeada**: O `session-key.ts` cruza a chave da mensagem para abrir o contexto persistido ou criar um novo (`src/routing/`).
3. **Escudo de Entrada (Sentinel)**: A mensagem entra no `guard.ts` onde é limpa de padrões maliciosos PII e injeções de prompt.
4. **Resolução de RAG & D2L**: O sistema de memória (`src/memory/`) busca instâncias passadas (vetores) e aciona o **D2LEngine** para internalizar contextos extensos na hora, otimizando o uso do KV-cache.
5. **Inferência**: A engine aciona o modelo configurado (via LiteLLM, OpenAI ou Bedrock local).
6. **Tool-Loop**: Se o assistente evoca uma ferramenta (ex: `bash-tools`), a execução é interceptada pelo `exec-approvals.js` (exigirá ou não confirmação por interface). A ferramenta é executada e seu log retorna ao "Córtex".
7. **Escudo de Saída**: Validação na saída (o modelo omitiu PII? Gerou `CoT` correto?). Se o Sentinel aprova, a mensagem é devolvida ao canal (text to speech ou text).

---

### 4. Segurança de Nível "Master Tier"

O ZERO impõe:

- **Modularidade Atômica**: Máximo de 500 linhas recomendadas por script para manter pureza ciclomática e responsabilidades limitadas.
- **Isolamento de Estado**: Cada execução e agent prompt é containerizado mentalmente.
- **Zero-Trust Tools**: Nenhuma ferramenta perigosa no Terminal atua sem aprovação manual do Sentinel ou da CLI de intervenção.

---

### 5. Compilação e Distribuição

A infraestrutura `cross-platform` permite compilar o ZERO localmente e gerar dependências nativas integradas via `napi-rs`:

- `pnpm build:full` - Montará as bindings C++/Rust.
- `quickstart.sh` - Automatiza containers de sandbox (Docker) ou Node.js Daemon no plano nativo do usuário (macOS/Linux).

> *Este documento evolui com a base de código e reflete as políticas técnicas inegociáveis arquitetadas no padrão Master Tier.*
