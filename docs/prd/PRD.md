# PRD — ∅ ZERO (Agentic Operating System)

**Documento de Requisitos do Produto (Consolidado)**
**Status:** Aprovado e Auditado (Release Candidate)
**Soberania:** Inegociável (Local-First Priority)

---

## 1. Definição do Produto

O **ZERO** é um Sistema Operacional Pessoal Agêntico (A-POS). Diferente de assistentes de chat tradicionais, o ZERO é projetado para ser a camada de inteligência soberana do usuário, operando diretamente no hardware local, unificando canais de comunicação e executando tarefas complexas através de ferramentas agênticas seguras.

## 2. Pilares Técnicos e Funcionais

### 2.1. Gateway Shield & Conectividade

- **Autenticação Padrão Zero-Trust**: Implementação de tokens JWT, senhas dinâmicas e integração nativa com Tailscale para acesso remoto seguro via VPN.
- **Proteção de Rede**: Validação estrita de IPs via `trustedProxies`. Bloqueio de ataques de personificação (Spoofing) e personificação de loopback.
- **Rate Limiting Global**: Limite de 120 requisições/minuto para proteção contra ataques de negação de serviço e força bruta.

### 2.2. Sentinel Engine (Segurança Ativa)

- **Firewall de LLM**: Sanitização de entradas em tempo real para mitigar Injeção de Prompt (Direta e Indireta).
- **Proteção de Dados (PII)**: Redação automática de informações sensíveis (CPFs, E-mails, Cartões) na saída dos modelos.
- **Vigilância de Entropia**: Detecção de chaves privadas e segredos ofuscados baseada na Entropia de Shannon (Motor nativo Rust).

### 2.3. Córtex Cognitivo & Execução

- **RAG Local e Híbrido**: Indexação de arquivos e memórias pessoais em base vetorial local (`sqlite-vec`).
- **Tool-Loop Seguro**: Execução de scripts Bash, acesso a navegador e controle de dispositivos periféricos (Nós) com fluxo de aprovação obrigatório para comandos de risco 3.
- **Performance Nativa**: Operação de baixa latência através do `ratchet` (Rust-core) para telemetria, segurança e o motor **Doc-to-LoRA (D2L)** para internalização instantânea de contexto.

## 3. Interfaces e Experiência do Usuário (Altair Experience)

### 3.1. Quantum Altair (Interface Web)

- Estética Glassmorphism futurista com suporte a temas dinâmicos.
- Hub de telemetria em tempo real (uso de tokens, latência, saúde do sistema).
- Playground de desenvolvimento e marketplace de skills locais.

### 3.2. CLI Master (Terminais)

- Controle granular de serviços e diagnósticos via comando `zero`.

## 4. Requisitos de Conformidade

- **LGPD/GDPR by Design**: Dados nunca saem do território do usuário para treinamento ou análise de terceiros.
- **Modularidade Estrutural**: Código fonte com limite de 500 linhas por arquivo para garantir auditabilidade e rapidez de manutenção.

---
*Relatório gerado automaticamente pela squad Antigravity em conformidade com o Protocolo Master Tier.*
