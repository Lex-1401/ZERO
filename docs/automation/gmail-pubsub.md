---
summary: "Push do Gmail Pub/Sub conectado aos webhooks do ZERO via gogcli"
read_when:
  - Conectando gatilhos da caixa de entrada do Gmail ao ZERO
  - Configurando o push do Pub/Sub para despertar o agente
---

# Gmail Pub/Sub -> ZERO

Objetivo: Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> ZERO webhook.

## Pré-requisitos

- `gcloud` instalado e logado ([guia de instalação](https://docs.cloud.google.com/sdk/docs/install-sdk)).
- `gog` (gogcli) instalado e autorizado para a conta do Gmail ([gogcli.sh](https://gogcli.sh/)).
- Webhooks do ZERO habilitados (veja [Webhooks](/automation/webhook)).
- `tailscale` logado ([tailscale.com](https://tailscale.com/)). A configuração suportada usa Tailscale Funnel para o endpoint HTTPS público.
  Outros serviços de túnel podem funcionar, mas são "faça-você-mesmo", não suportados e exigem configuração manual.
  No momento, Tailscale é o que suportamos.

Exemplo de configuração de hook (habilita o mapeamento pré-definido do Gmail):

```json5
{
  hooks: {
    enabled: true,
    token: "ZERO_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"]
  }
}
```

Para entregar o resumo do Gmail em uma superfície de chat, sobrescreva a pré-definição (preset) com um mapeamento que define `deliver` + `channel`/`to` opcional:

```json5
{
  hooks: {
    enabled: true,
    token: "ZERO_HOOK_TOKEN",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate:
          "Novo e-mail de {{messages[0].from}}\nAssunto: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last"
        // to: "+15551234567"
      }
    ]
  }
}
```

Se você quiser um canal fixo, configure `channel` + `to`. Caso contrário, `channel: "last"` usa a última rota de entrega (recorrendo ao WhatsApp como fallback).

Para forçar um modelo mais barato para as execuções do Gmail, configure `model` no mapeamento (`provedor/modelo` ou alias). Se você impuser `agents.defaults.models`, inclua-o lá.

Para configurar um modelo padrão e um nível de pensamento especificamente para hooks do Gmail, adicione `hooks.gmail.model` / `hooks.gmail.thinking` na sua configuração:

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off"
    }
  }
}
```

Notas:

- `model`/`thinking` por hook no mapeamento ainda sobrescrevem esses padrões.
- Ordem de fallback: `hooks.gmail.model` → `agents.defaults.model.fallbacks` → primário (auth/limite de taxa/timeouts).
- Se `agents.defaults.models` estiver configurado, o modelo do Gmail deve estar na lista permitida.

Para personalizar ainda mais o tratamento do payload, adicione `hooks.mappings` ou um módulo de transformação JS/TS em `hooks.transformsDir` (veja [Webhooks](/automation/webhook)).

## Assistente/Wizard (recomendado)

Use o utilitário do ZERO para conectar tudo (instala as dependências no macOS via brew):

```bash
zero webhooks gmail setup \
  --account zero@gmail.com
```

Padrões:

- Usa Tailscale Funnel para o endpoint de push público.
- Escreve a configuração `hooks.gmail` para `zero webhooks gmail run`.
- Habilita o preset de hook do Gmail (`hooks.presets: ["gmail"]`).

Nota sobre o caminho: quando o modo `tailscale` está habilitado, o ZERO configura automaticamente `hooks.gmail.serve.path` para `/` e mantém o caminho público em `hooks.gmail.tailscale.path` (padrão `/gmail-pubsub`) porque o Tailscale remove o prefixo do caminho configurado antes do proxying.
Se você precisar que o backend receba o caminho com prefixo, configure `hooks.gmail.tailscale.target` (ou `--tailscale-target`) para uma URL completa como `http://127.0.0.1:8788/gmail-pubsub` e coincida com `hooks.gmail.serve.path`.

Quer um endpoint personalizado? Use `--push-endpoint <url>` ou `--tailscale off`.

Nota da plataforma: no macOS, o assistente instala `gcloud`, `gogcli` e `tailscale` via Homebrew; no Linux, instale-os manualmente primeiro.

Início automático do Gateway (recomendado):

- Quando `hooks.enabled=true` e `hooks.gmail.account` está configurado, o Gateway inicia o `gog gmail watch serve` no boot e renova o watch automaticamente.
- Configure `ZERO_SKIP_GMAIL_WATCHER=1` para desativar (útil se você mesmo rodar o daemon).
- Não execute o daemon manual ao mesmo tempo, ou você encontrará o erro `listen tcp 127.0.0.1:8788: bind: address already in use`.

Daemon manual (inicia `gog gmail watch serve` + renovação automática):

```bash
zero webhooks gmail run
```

## Configuração única

1) Selecione o projeto GCP **que possui o cliente OAuth** usado pelo `gog`.

```bash
gcloud auth login
gcloud config set project <id-do-projeto>
```

Nota: O watch do Gmail exige que o tópico do Pub/Sub resida no mesmo projeto que o cliente OAuth.

1) Habilite as APIs:

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

1) Crie um tópico:

```bash
gcloud pubsub topics create gog-gmail-watch
```

1) Permita que o push do Gmail publique:

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## Inicie o watch

```bash
gog gmail watch start \
  --account zero@gmail.com \
  --label INBOX \
  --topic projects/<id-do-projeto>/topics/gog-gmail-watch
```

Salve o `history_id` da saída (para depuração).

## Execute o manipulador de push

Exemplo local (autenticação por token compartilhado):

```bash
gog gmail watch serve \
  --account zero@gmail.com \
  --bind 127.0.0.1 \
  --port 8788 \
  --path /gmail-pubsub \
  --token <segredo> \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token ZERO_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

Notas:

- `--token` protege o endpoint de push (`x-gog-token` ou `?token=`).
- `--hook-url` aponta para ZERO `/hooks/gmail` (mapeado; execução isolada + resumo no principal).
- `--include-body` e `--max-bytes` controlam o snippet do corpo enviado ao ZERO.

Recomendado: `zero webhooks gmail run` envolve o mesmo fluxo e renova o watch automaticamente.

## Exponha o manipulador (avançado, não suportado)

Se você precisar de um túnel que não seja Tailscale, configure-o manualmente e use a URL pública na inscrição do push (não suportado, sem proteções):

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

Use a URL gerada como o endpoint de push:

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<url-publica>/gmail-pubsub?token=<segredo>"
```

Produção: use um endpoint HTTPS estável e configure o Pub/Sub OIDC JWT, então execute:

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## Teste

Envie uma mensagem para a caixa de entrada monitorada:

```bash
gog gmail send \
  --account zero@gmail.com \
  --to zero@gmail.com \
  --subject "teste de monitoramento" \
  --body "ping"
```

Verifique o estado e o histórico do monitoramento:

```bash
gog gmail watch status --account zero@gmail.com
gog gmail history --account zero@gmail.com --since <historyId>
```

## Resolução de Problemas

- `Invalid topicName`: incompatibilidade de projeto (o tópico não está no projeto do cliente OAuth).
- `User not authorized`: falta `roles/pubsub.publisher` no tópico.
- Mensagens vazias: o push do Gmail fornece apenas `historyId`; busque via `gog gmail history`.

## Limpeza

```bash
gog gmail watch stop --account zero@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```
