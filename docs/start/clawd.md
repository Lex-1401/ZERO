---
summary: "Guia ponta a ponta para rodar o ZERO como um assistente pessoal com precauções de segurança"
read_when:
  - Integrando uma nova instância de assistente
  - Revisando implicações de segurança/permissão
---
# Construindo um assistente pessoal com o ZERO (estilo Zero)

O ZERO é um gateway de WhatsApp + Telegram + Discord + iMessage para agentes **Pi**. Plugins adicionam Mattermost. Este guia é para a configuração de "assistente pessoal": um número de WhatsApp dedicado que se comporta como seu agente sempre ativo.

## ⚠️ Segurança primeiro

Você está colocando um agente em uma posição para:

- executar comandos em sua máquina (dependendo da sua configuração de ferramentas Pi)
- ler/escrever arquivos em seu espaço de trabalho
- enviar mensagens de volta via WhatsApp/Telegram/Discord/Mattermost (via plugin)

Comece de forma conservadora:

- Sempre configure `channels.whatsapp.allowFrom` (nunca rode aberto ao mundo em seu Mac pessoal).
- Use um número de WhatsApp dedicado para o assistente.
- Os batimentos cardíacos (heartbeats) agora são padrão a cada 30 minutos. Desative até que você confie na configuração definindo `agents.defaults.heartbeat.every: "0m"`.

## Pré-requisitos

- Node **22+**
- ZERO disponível no PATH (recomendado: instalação global)
- Um segundo número de telefone (SIM/eSIM/pré-pago) para o assistente

```bash
npm install -g zero@latest
# ou: pnpm add -g zero@latest
```

A partir da fonte (desenvolvimento):

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm ui:build # instala as dependências da UI automaticamente na primeira execução
pnpm build
pnpm link --global
```

## A configuração de dois telefones (recomendado)

Você deseja isto:

```text
Seu Telefone (pessoal)          Segundo Telefone (assistente)
┌─────────────────┐           ┌─────────────────┐
│  Seu WhatsApp   │  ──────▶  │  WhatsApp Assis.│
│  +1-555-VOCÊ    │ mensagem  │  +1-555-CLAWD   │
└─────────────────┘           └────────┬────────┘
                                       │ vinculado via QR
                                       ▼
                              ┌─────────────────┐
                              │  Seu Mac        │
                              │  (zero)      │
                              │    Agente Pi    │
                              └─────────────────┘
```

Se você vincular seu WhatsApp pessoal ao ZERO, cada mensagem enviada para você se torna uma "entrada do agente". Isso raramente é o que você deseja.

## Início rápido em 5 minutos

1) Emparelhe o WhatsApp Web (mostra o QR; escaneie com o telefone do assistente):

```bash
zero channels login
```

1) Inicie o Gateway (deixe-o rodando):

```bash
zero gateway --port 18789
```

1) Coloque uma configuração mínima em `~/.zero/zero.json`:

```json5
{
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

Agora envie uma mensagem para o número do assistente a partir do seu telefone na lista de permissões.

Quando a integração termina, abrimos automaticamente o painel (dashboard) com seu token de gateway e imprimimos o link tokenizado. Para reabrir mais tarde: `zero dashboard`.

## Dê ao agente um espaço de trabalho (AGENTS)

O Zero lê instruções de operação e "memória" de seu diretório de espaço de trabalho (workspace).

Por padrão, o ZERO usa `~/zero` como o espaço de trabalho do agente e o criará (além dos arquivos iniciais `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`) automaticamente na configuração/primeira execução do agente. `BOOTSTRAP.md` é criado apenas quando o espaço de trabalho é novo (ele não deve voltar depois que você o deletar).

Dica: trate esta pasta como a "memória" do Zero e torne-a um repositório git (idealmente privado) para que seus arquivos `AGENTS.md` + memória sejam salvos. Se o git estiver instalado, novos espaços de trabalho são inicializados automaticamente.

```bash
zero setup
```

Layout completo do espaço de trabalho + guia de backup: [Espaço de trabalho do Agente](/concepts/agent-workspace)
Fluxo de trabalho de memória: [Memória](/concepts/memory)

Opcional: escolha um espaço de trabalho diferente com `agents.defaults.workspace` (suporta `~`).

```json5
{
  agent: {
    workspace: "~/zero"
  }
}
```

Se você já fornece seus próprios arquivos de espaço de trabalho a partir de um repositório, pode desativar totalmente a criação do arquivo bootstrap:

```json5
{
  agent: {
    skipBootstrap: true
  }
}
```

## A configuração que o torna "um assistente"

O ZERO tem como padrão uma boa configuração de assistente, mas você geralmente vai querer ajustar:

- persona/instruções em `SOUL.md`
- padrões de pensamento (se desejado)
- batimentos cardíacos (uma vez que você confie)

Exemplo:

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-5",
    workspace: "~/zero",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    // Comece com 0; habilite depois.
    heartbeat: { every: "0m" }
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }
      }
    }
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@zero", "zero"]
    }
  },
  session: {
    scope: "per-sender",
    resetTriggers: ["/new", "/reset"],
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080
    }
  }
}
```

## Sessões e memória

- Arquivos de sessão: `~/.zero/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- Metadados da sessão (uso de tokens, última rota, etc): `~/.zero/agents/<agentId>/sessions/sessions.json` (legado: `~/.zero/sessions/sessions.json`)
- `/new` ou `/reset` inicia uma sessão nova para aquele chat (configurável via `resetTriggers`). Se enviado sozinho, o agente responde com um breve olá para confirmar o reset.
- `/compact [instruções]` compacta o contexto da sessão e informa o orçamento de contexto restante.

## Batimentos cardíacos (modo proativo)

Por padrão, o ZERO executa um batimento cardíaco (heartbeat) a cada 30 minutos com o prompt:
`Leia HEARTBEAT.md se existir (contexto do espaço de trabalho). Siga rigorosamente. Não infira ou repita tarefas antigas de chats anteriores. Se nada precisar de atenção, responda HEARTBEAT_OK.`
Defina `agents.defaults.heartbeat.every: "0m"` para desativar.

- Se `HEARTBEAT.md` existir, mas estiver efetivamente vazio (apenas linhas em branco e cabeçalhos markdown como `# Heading`), o ZERO pula a execução do heartbeat para economizar chamadas de API.
- Se o arquivo estiver ausente, o heartbeat ainda roda e o modelo decide o que fazer.
- Se o agente responder com `HEARTBEAT_OK` (opcionalmente com preenchimento curto; veja `agents.defaults.heartbeat.ackMaxChars`), o ZERO suprime a entrega externa para esse heartbeat.
- Heartbeats executam turnos completos do agente — intervalos curtos queimam mais tokens.

```json5
{
  agent: {
    heartbeat: { every: "30m" }
  }
}
```

## Mídia entrando e saindo

Anexos recebidos (imagens/áudio/docs) podem ser expostos ao seu comando via templates:

- `{{MediaPath}}` (caminho do arquivo temporário local)
- `{{MediaUrl}}` (pseudo-URL)
- `{{Transcript}}` (se a transcrição de áudio estiver habilitada)

Anexos enviados pelo agente: inclua `MEDIA:<caminho-ou-url>` em sua própria linha (sem espaços). Exemplo:

```text
Aqui está o print.
MEDIA:/tmp/screenshot.png
```

O ZERO extrai estes e os envia como mídia junto com o texto.

## Checklist de operações

```bash
zero status          # status local (creds, sessões, eventos na fila)
zero status --all    # diagnóstico completo (somente leitura, colável)
zero status --deep   # adiciona verificações de saúde do gateway (Telegram + Discord)
zero health --json   # snapshot de saúde do gateway (WS)
```

Os logs vivem sob `/tmp/zero/` (padrão: `zero-YYYY-MM-DD.log`).

## Próximos passos

- WebChat: [WebChat](/web/webchat)
- Ops de Gateway: [Manual do Gateway](/gateway)
- Cron + despertares: [Tarefas Cron](/automation/cron-jobs)
- Companheiro da barra de menu macOS: [App ZERO macOS](/platforms/macos)
- App de nó iOS: [App iOS](/platforms/ios)
- App de nó Android: [App Android](/platforms/android)
- Status no Windows: [Windows (WSL2)](/platforms/windows)
- Status no Linux: [App Linux](/platforms/linux)
- Segurança: [Segurança](/gateway/security)
