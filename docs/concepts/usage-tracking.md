---
summary: "Superfícies de rastreamento de uso e requisitos de credenciais"
read_when:
  - Você está conectando superfícies de uso/cota de provedores
  - Você precisa explicar o comportamento de rastreamento de uso ou os requisitos de autenticação
---
# Rastreamento de uso

## O que é

- Extrai o uso/cota diretamente dos endpoints dos provedores.
- Sem estimativas de custo próprias; apenas os períodos reportados pelos provedores.

## Onde ele aparece

- `/status` nos chats: cartão de status rico em emojis com os tokens da sessão + custo estimado (apenas para chave de API). O uso do provedor é mostrado para o **provedor do modelo atual** quando disponível.
- `/usage off|tokens|full` nos chats: rodapé de uso por resposta (OAuth mostra apenas tokens).
- `/usage cost` nos chats: resumo de custo local agregado a partir dos registros de sessão do ZERO.
- CLI: `zero status --usage` imprime o detalhamento completo por provedor.
- CLI: `zero channels list` imprime o mesmo snapshot de uso ao lado da configuração do provedor (use `--no-usage` para ignorar).
- Barra de menus do macOS: seção “Uso” (Usage) sob Contexto (apenas se disponível).

## Provedores + Credenciais

- **Anthropic (Claude)**: tokens OAuth nos perfis de autenticação.
- **GitHub Copilot**: tokens OAuth nos perfis de autenticação.
- **Gemini CLI**: tokens OAuth nos perfis de autenticação.
- **Google Cloud Auth**: tokens OAuth nos perfis de autenticação.
- **OpenAI Codex**: tokens OAuth nos perfis de autenticação (accountId usado quando presente).
- **MiniMax**: chave de API (chave do plano de codificação; `MINIMAX_CODE_PLAN_KEY` ou `MINIMAX_API_KEY`); usa o período de 5 horas do plano de codificação.
- **z.ai**: chave de API via env/config/armazenamento de autenticação.

O uso é ocultado se não existirem credenciais OAuth/API correspondentes.
