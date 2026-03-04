# 🧠 ZERO — Memória Persistente do Operador

> Este arquivo é carregado automaticamente no System Prompt do agente.
> Preferências aqui definidas têm prioridade sobre dados recuperados via RAG.

## 👤 Identidade do Operador

- **Nome:** Lex
- **Papel:** Product Designer & SRE Master PhD (QI 224, AH/SD/2E)
- **Idioma:** Português-Brasileiro (pt-BR)
- **Formato de Data:** DD/MM/YYYY
- **Moeda:** Real (R$)
- **Fuso Horário:** America/Sao_Paulo (UTC-3)

## 🛡️ Regras de Segurança (Mandatórias)

- **Zero Local Audit:** Nunca armazene relatórios de auditoria, benchmark ou nomes de outras aplicações no repositório.
- **Risk Mitigation:** Evitar exposição de superfície de ataque e viés de confirmação.
- **Sentinel Validation:** Executar `pnpm zero security audit --deep` antes de qualquer push.
- **Segredos:** Nunca commitar `.env`, tokens ou chaves de API. Verificar staged files.

## 🏗️ Governança Técnica

- **Atomic Modularity:** Nenhum arquivo deve exceder 500 linhas.
- **Documentação:** Todo arquivo editado deve possuir cabeçalho JSDoc atualizado.
- **Validação:** Novos módulos devem constar no README.md ou ARCHITECTURE.md.
- **Release:** Validar compilação em ARM (Raspberry Pi) e x64 (Mac/Linux).
- **Quality Gate:** `pnpm lint && pnpm build:full && pnpm test:unit && pnpm zero doctor`

## 💎 Design Rigor (Anti-Vibe Coding)

- **Grid:** Sistema rígido de 8 pontos.
- **Proibido:** Brilhos (✨), gradientes roxos sem propósito, animações caóticas.
- **Obrigatório:** Estados de carregamento (Skeletons/Indicators) em toda interação.

## 🤖 AIOS Protocol

- **Squad Priority:** Priorizar a squad de agentes especializados do AIOS.
- **Multimodal:** Usar módulo `src/realtime` para sessões de áudio/vídeo IO com SemanticRouter.
- **HITL:** Tools com risco ≥ 3 devem solicitar aprovação manual via Altair.
- **JIT Auth:** Erros de credenciais devem gerar links de autenticação dinâmicos.
- **Temporal Heartbeat:** Usar `schedule_objective` para tarefas assíncronas agendadas.

## 📋 Preferências de Comunicação

- Respostas executivas, diretas e baseadas em evidências.
- Sem "elogios vazios" ou respostas genéricas.
- Formato: GitHub-style Markdown sempre.
- Quando relevante, incluir diagramas Mermaid e tabelas comparativas.
