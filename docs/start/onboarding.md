---
summary: "Fluxo de integração de primeira execução para o ZERO (app macOS)"
read_when:
  - Projetando o assistente de integração do macOS
  - Implementando configuração de autenticação ou identidade
---
# Integração (app macOS)

Este documento descreve o fluxo **atual** de integração da primeira execução. O objetivo é uma
experiência suave no "dia 0": escolher onde o Gateway será executado, conectar a autenticação, executar o
assistente (wizard) e deixar o agente fazer seu próprio bootstrap.

## Ordem das páginas (atual)

1) Boas-vindas + aviso de segurança
2) **Seleção do Gateway** (Local / Remoto / Configurar depois)
3) **Autenticação (OAuth Anthropic)** — apenas local
4) **Assistente de Configuração** (guiado pelo Gateway)
5) **Permissões** (solicitações TCC)
6) **CLI** (opcional)
7) **Chat de Integração** (sessão dedicada)
8) Pronto

## 1) Local vs Remoto

Onde o **Gateway** será executado?

- **Local (neste Mac):** a integração pode executar fluxos OAuth e gravar credenciais
  localmente.
- **Remoto (via SSH/Tailnet):** a integração **não** executa OAuth localmente;
  as credenciais devem existir no host do gateway.
- **Configurar depois:** pula a configuração e deixa o app sem configurar.

Dica de autenticação do Gateway:

- O assistente agora gera um **token** mesmo para loopback, então os clientes WS locais devem se autenticar.
- Se você desativar a autenticação, qualquer processo local poderá se conectar; use isso apenas em máquinas totalmente confiáveis.
- Use um **token** para acesso de múltiplas máquinas ou vínculos (binds) que não sejam de loopback.

## 2) Autenticação apenas local (OAuth Anthropic)

O app macOS suporta OAuth da Anthropic (Claude Pro/Max). O fluxo:

- Abre o navegador para OAuth (PKCE)
- Solicita que o usuário cole o valor `code#state`
- Grava as credenciais em `~/.zero/credentials/oauth.json`

Outros provedores (OpenAI, APIs customizadas) são configurados via variáveis de ambiente
ou arquivos de configuração por enquanto.

## 3) Assistente de Configuração (guiado pelo Gateway)

O app pode executar o mesmo assistente de configuração que a CLI. Isso mantém a integração em sincronia
com o comportamento do lado do Gateway e evita a duplicação de lógica no SwiftUI.

## 4) Permissões

A integração solicita as permissões TCC necessárias para:

- Notificações
- Acessibilidade
- Gravação de Tela
- Microfone / Reconhecimento de Voz
- Automação (AppleScript)

## 5) CLI (opcional)

O app pode instalar a CLI global `zero` via npm/pnpm para que os fluxos de trabalho no terminal
e as tarefas do launchd funcionem imediatamente.

## 6) Chat de Integração (sessão dedicada)

Após a configuração, o app abre uma sessão de chat de integração dedicada para que o agente possa
se apresentar e guiar os próximos passos. Isso mantém as orientações de primeira execução separadas
da sua conversa normal.

## Ritual de bootstrap do agente

Na primeira execução do agente, o ZERO inicializa um espaço de trabalho (padrão `~/zero`):

- Semeia `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`
- Executa um curto ritual de Perguntas e Respostas (uma pergunta por vez)
- Grava identidade + preferências em `IDENTITY.md`, `USER.md`, `SOUL.md`
- Remove `BOOTSTRAP.md` ao finalizar para que ele seja executado apenas uma vez

## Opcional: Ganchos do Gmail (manual)

A configuração do Pub/Sub do Gmail é atualmente uma etapa manual. Use:

```bash
zero webhooks gmail setup --account voce@gmail.com
```

Veja [/automation/gmail-pubsub](/automation/gmail-pubsub) para detalhes.

## Notas sobre o modo remoto

Quando o Gateway é executado em outra máquina, as credenciais e arquivos de espaço de trabalho residem
**naquele host**. Se você precisar de OAuth em modo remoto, crie:

- `~/.zero/credentials/oauth.json`
- `~/.zero/agents/<agentId>/agent/auth-profiles.json`

no host do gateway.
