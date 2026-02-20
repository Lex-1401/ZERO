---
summary: "Status de suporte do bot Microsoft Teams, capacidades e configuração"
read_when:
  - Trabalhando em recursos do canal MS Teams
---

# Microsoft Teams (plugin)

> "Abandon all hope, ye who enter here." (Deixai toda a esperança, vós que entrais aqui.)

Atualizado: 2026-01-21

Status: texto + anexos em DM são suportados; envio de arquivos em canal/grupo requer `sharePointSiteId` + permissões Graph (veja [Enviando arquivos em chats de grupo](#enviando-arquivos-em-chats-de-grupo)). Enquetes são enviadas via Adaptive Cards.

## Plugin necessário

Microsoft Teams é distribuído como um plugin e não é empacotado com a instalação principal.

**Mudança radical (2026.1.15):** MS Teams saiu do núcleo. Se você usá-lo, deve instalar o plugin.

Explicável: mantém as instalações principais mais leves e permite que as dependências do MS Teams sejam atualizadas independentemente.

Instale via CLI (registro npm):

```bash
zero plugins install @zero/msteams
```

Checkout local (ao rodar de um repositório git):

```bash
zero plugins install ./extensions/msteams
```

Se você escolher Teams durante configuração/onboarding e um checkout git for detectado, o ZERO oferecerá o caminho de instalação local automaticamente.

Detalhes: [Plugins](/plugin)

## Configuração rápida (iniciante)

1) Instale o plugin Microsoft Teams.
2) Crie um **Azure Bot** (App ID + segredo do cliente + Tenant ID).
3) Configure o ZERO com essas credenciais.
4) Exponha `/api/messages` (porta 3978 por padrão) via URL pública ou túnel.
5) Instale o pacote do app Teams e inicie o gateway.

Configuração mínima:

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" }
    }
  }
}
```

Nota: chats de grupo são bloqueados por padrão (`channels.msteams.groupPolicy: "allowlist"`). Para permitir respostas de grupo, defina `channels.msteams.groupAllowFrom` (ou use `groupPolicy: "open"` para permitir qualquer membro, bloqueado por menção).

## Objetivos

- Converse com o ZERO via DMs, chats de grupo ou canais do Teams.
- Mantenha o roteamento determinístico: respostas sempre voltam para o canal onde chegaram.
- Padrão para comportamento de canal seguro (menções obrigatórias a menos que configurado de outra forma).

## Gravações de configuração

Por padrão, o Microsoft Teams tem permissão para gravar atualizações de configuração acionadas por `/config set|unset` (requer `commands.config: true`).

Desative com:

```json5
{
  channels: { msteams: { configWrites: false } }
}
```

## Controle de acesso (DMs + grupos)

**Acesso DM**

- Padrão: `channels.msteams.dmPolicy = "pairing"`. Remetentes desconhecidos são ignorados até serem aprovados.
- `channels.msteams.allowFrom` aceita IDs de objeto AAD, UPNs ou nomes de exibição. O assistente resolve nomes para IDs via Microsoft Graph quando as credenciais permitem.

**Acesso de grupo**

- Padrão: `channels.msteams.groupPolicy = "allowlist"` (bloqueado a menos que você adicione `groupAllowFrom`). Use `channels.defaults.groupPolicy` para sobrescrever o padrão quando não definido.
- `channels.msteams.groupAllowFrom` controla quais remetentes podem acionar em chats de grupo/canais (fallback para `channels.msteams.allowFrom`).
- Defina `groupPolicy: "open"` para permitir qualquer membro (ainda bloqueado por menção por padrão).
- Para permitir **nenhum canal**, defina `channels.msteams.groupPolicy: "disabled"`.

Exemplo:

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"]
    }
  }
}
```

**Allowlist de Teams + canal**

- Escopo de respostas de grupo/canal listando equipes e canais sob `channels.msteams.teams`.
- Chaves podem ser IDs de equipe ou nomes; chaves de canal podem ser IDs de conversa ou nomes.
- Quando `groupPolicy="allowlist"` e uma allowlist de teams está presente, apenas equipes/canais listados são aceitos (bloqueados por menção).
- O assistente de configuração aceita entradas `Equipe/Canal` e os armazena para você.
- Na inicialização, o ZERO resolve nomes de equipe/canal e allowlist de usuário para IDs (quando permissões Graph permitem) e loga o mapeamento; entradas não resolvidas são mantidas como digitadas.

Exemplo:

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "Minha Equipe": {
          channels: {
            "Geral": { requireMention: true }
          }
        }
      }
    }
  }
}
```

## Como funciona

1. Instale o plugin Microsoft Teams.
2. Crie um **Azure Bot** (App ID + segredo + tenant ID).
3. Construa um **pacote de app Teams** que referencia o bot e inclui as permissões RSC abaixo.
4. Faça upload/instale o app Teams em uma equipe (ou escopo pessoal para DMs).
5. Configure `msteams` em `~/.zero/zero.json` (ou vars de env) e inicie o gateway.
6. O gateway escuta tráfego webhook do Bot Framework em `/api/messages` por padrão.

## Configuração Azure Bot (Pré-requisitos)

Antes de configurar o ZERO, você precisa criar um recurso Azure Bot.

### Passo 1: Criar Azure Bot

1. Vá para [Criar Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Preencha a aba **Basics**:

   | Campo | Valor |
   | :--- | :--- |
   | **Bot handle** | Nome do seu bot, ex., `zero-msteams` (deve ser único) |
   | **Subscription** | Selecione sua assinatura Azure |
   | **Resource group** | Crie novo ou use existente |
   | **Pricing tier** | **Free** para dev/testes |
   | **Type of App** | **Single Tenant** (recomendado - veja nota abaixo) |
   | **Creation type** | **Create new Microsoft App ID** |

> **Aviso de depreciação:** A criação de novos bots multi-tenant foi depreciada após 2025-07-31. Use **Single Tenant** para novos bots.

1. Clique em **Review + create** → **Create** (espere ~1-2 minutos)

### Passo 2: Obter Credenciais

1. Vá para seu recurso Azure Bot → **Configuration**
2. Copie **Microsoft App ID** → isso é seu `appId`
3. Clique em **Manage Password** → vá para o App Registration
4. Em **Certificates & secrets** → **New client secret** → copie o **Value** → isso é seu `appPassword`
5. Vá para **Overview** → copie **Directory (tenant) ID** → isso é seu `tenantId`

### Passo 3: Configurar Endpoint de Mensagens

1. No Azure Bot → **Configuration**
2. Defina **Messaging endpoint** para sua URL de webhook:
   - Produção: `https://seu-dominio.com/api/messages`
   - Dev local: Use um túnel (veja [Desenvolvimento Local](#desenvolvimento-local-tunelamento) abaixo)

### Passo 4: Ativar Canal Teams

1. No Azure Bot → **Channels**
2. Clique em **Microsoft Teams** → Configure → Save
3. Aceite os Termos de Serviço

## Desenvolvimento Local (Tunelamento)

O Teams não consegue acessar `localhost`. Use um túnel para desenvolvimento local:

**Opção A: ngrok**

```bash
ngrok http 3978
# Copie a URL https, ex., https://abc123.ngrok.io
# Defina o messaging endpoint para: https://abc123.ngrok.io/api/messages
```

**Opção B: Tailscale Funnel**

```bash
tailscale funnel 3978
# Use sua URL do Tailscale funnel como o messaging endpoint
```

## Portal do Desenvolvedor Teams (Alternativa)

Em vez de criar manualmente um ZIP de manifesto, você pode usar o [Portal do Desenvolvedor Teams](https://dev.teams.microsoft.com/apps):

1. Clique em **+ New app**
2. Preencha informações básicas (nome, descrição, info do desenvolvedor)
3. Vá para **App features** → **Bot**
4. Selecione **Enter a bot ID manually** e cole seu App ID do Azure Bot
5. Marque scopes: **Personal**, **Team**, **Group Chat**
6. Clique em **Distribute** → **Download app package**
7. No Teams: **Apps** → **Manage your apps** → **Upload a custom app** → selecione o ZIP

Isso é frequentemente mais fácil do que editar manifestos JSON manualmente.

## Testando o Bot

**Opção A: Azure Web Chat (verificar webhook primeiro)**

1. No Portal Azure → seu recurso Azure Bot → **Test in Web Chat**
2. Envie uma mensagem - você deve ver uma resposta
3. Isso confirma que seu endpoint webhook funciona antes da configuração do Teams

**Opção B: Teams (após instalação do app)**

1. Instale o app Teams (sideload ou catálogo da organização)
2. Encontre o bot no Teams e envie uma DM
3. Verifique logs do gateway para atividade de entrada

## Configuração (mínima apenas texto)

1. **Instale o plugin Microsoft Teams**
   - Do npm: `zero plugins install @zero/msteams`
   - De um checkout local: `zero plugins install ./extensions/msteams`

2. **Registro do Bot**
   - Crie um Azure Bot (veja acima) e guarde:
     - App ID
     - Segredo do cliente (App password)
     - Tenant ID (single-tenant)

3. **Manifesto do app Teams**
   - Inclua uma entrada `bot` com `botId = <App ID>`.
   - Escopos: `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (necessário para manipulação de arquivos no escopo pessoal).
   - Adicione permissões RSC (abaixo).
   - Crie ícones: `outline.png` (32x32) e `color.png` (192x192).
   - Zipe todos os três arquivos juntos: `manifest.json`, `outline.png`, `color.png`.

4. **Configurar ZERO**

   ```json
   {
     "msteams": {
       "enabled": true,
       "appId": "<APP_ID>",
       "appPassword": "<APP_PASSWORD>",
       "tenantId": "<TENANT_ID>",
       "webhook": { "port": 3978, "path": "/api/messages" }
     }
   }
   ```

   Você também pode usar variáveis de ambiente em vez de chaves de configuração:
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Endpoint do Bot**
   - Defina o Azure Bot Messaging Endpoint para:
     - `https://<host>:3978/api/messages` (ou seu caminho/porta escolhido).

6. **Rodar o gateway**
   - O canal Teams inicia automaticamente quando o plugin está instalado e a configuração `msteams` existe com credenciais.

## Contexto histórico

- `channels.msteams.historyLimit` controla quantas mensagens recentes de canal/grupo são incluídas no prompt.
- Fallback para `messages.groupChat.historyLimit`. Defina `0` para desativar (padrão 50).
- Histórico DM pode ser limitado com `channels.msteams.dmHistoryLimit` (turnos de usuário). Sobrescritas por usuário: `channels.msteams.dms["<user_id>"].historyLimit`.

## Permissões RSC do Teams Atuais (Manifesto)

Estas são as permissões **resourceSpecific existentes** no nosso manifesto de app Teams. Elas só se aplicam dentro da equipe/chat onde o app está instalado.

**Para canais (escopo team):**

- `ChannelMessage.Read.Group` (Application) - receber todas as mensagens de canal sem @menção
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Para chats de grupo:**

- `ChatMessage.Read.Chat` (Application) - receber todas as mensagens de chat de grupo sem @menção

## Exemplo de Manifesto Teams (editado)

Exemplo válido e mínimo com os campos obrigatórios. Substitua IDs e URLs.

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  "manifestVersion": "1.23",
  "version": "1.0.0",
  "id": "00000000-0000-0000-0000-000000000000",
  "name": { "short": "ZERO" },
  "developer": {
    "name": "Sua Org",
    "websiteUrl": "https://exemplo.com",
    "privacyUrl": "https://exemplo.com/privacy",
    "termsOfUseUrl": "https://exemplo.com/terms"
  },
  "description": { "short": "ZERO no Teams", "full": "ZERO no Teams" },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#5B6DEF",
  "bots": [
    {
      "botId": "11111111-1111-1111-1111-111111111111",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": true
    }
  ],
  "webApplicationInfo": {
    "id": "11111111-1111-1111-1111-111111111111"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "ChannelMessage.Read.Group", "type": "Application" },
        { "name": "ChannelMessage.Send.Group", "type": "Application" },
        { "name": "Member.Read.Group", "type": "Application" },
        { "name": "Owner.Read.Group", "type": "Application" },
        { "name": "ChannelSettings.Read.Group", "type": "Application" },
        { "name": "TeamMember.Read.Group", "type": "Application" },
        { "name": "TeamSettings.Read.Group", "type": "Application" },
        { "name": "ChatMessage.Read.Chat", "type": "Application" }
      ]
    }
  }
}
```

### Advertências do manifesto (campos obrigatórios)

- `bots[].botId` **deve** corresponder ao ID do App Azure Bot.
- `webApplicationInfo.id` **deve** corresponder ao ID do App Azure Bot.
- `bots[].scopes` deve incluir as superfícies que você planeja usar (`personal`, `team`, `groupChat`).
- `bots[].supportsFiles: true` é obrigatório para manipulação de arquivos no scpo pessoal.
- `authorization.permissions.resourceSpecific` deve incluir read/send de canal se você quiser tráfego de canal.

### Atualizando um app existente

Para atualizar um app Teams já instalado (ex., para adicionar permissões RSC):

1. Atualize seu `manifest.json` com as novas configurações
2. **Incremente o campo `version`** (ex., `1.0.0` → `1.1.0`)
3. **Re-zipe** o manifesto com ícones (`manifest.json`, `outline.png`, `color.png`)
4. Faça upload do novo zip:
   - **Opção A (Teams Admin Center):** Teams Admin Center → Teams apps → Manage apps → encontre seu app → Upload new version
   - **Opção B (Sideload):** No Teams → Apps → Manage your apps → Upload a custom app
5. **Para canais de equipe:** Reinstale o app em cada equipe para as novas permissões terem efeito
6. **Encerre e relance o Teams completamente** (não feche apenas a janela) para limpar metadados de app em cache

## Capacidades: Apenas RSC vs Graph

### Com **Apenas Teams RSC** (app instalado, sem permissões Graph API)

Funciona:

- Ler conteúdo de **texto** de mensagem de canal.
- Enviar conteúdo de **texto** de mensagem de canal.
- Receber anexos de arquivo **pessoais (DM)**.

NÃO funciona:

- Conteúdo de **imagem ou arquivo** de canal/grupo (payload inclui apenas stub HTML).
- Baixar anexos armazenados no SharePoint/OneDrive.
- Ler histórico de mensagem (além do evento webhook ao vivo).

### Com **Teams RSC + Permissões de Aplicativo Microsoft Graph**

Adiciona:

- Baixar conteúdos hospedados (imagens coladas em mensagens).
- Baixar anexos de arquivo armazenados no SharePoint/OneDrive.
- Ler histórico de mensagem de canal/chat via Graph.

### RSC vs Graph API

| Capacidade | Permissões RSC | Graph API |
| :--- | :--- | :--- |
| **Mensagens em tempo real** | Sim (via webhook) | Não (apenas polling) |
| **Mensagens históricas** | Não | Sim (pode consultar histórico) |
| **Complexidade de configuração** | Apenas manifesto de app | Requer consentimento admin + fluxo de token |
| **Funciona offline** | Não (deve estar rodando) | Sim (consulte a qualquer momento) |

**Resumo:** RSC é para escuta em tempo real; Graph API é para acesso histórico. Para recuperar mensagens perdidas enquanto offline, você precisa da Graph API com `ChannelMessage.Read.All` (requer consentimento admin).

## Mídia + histórico habilitados para Graph (necessário para canais)

Se você precisa de imagens/arquivos em **canais** ou quer buscar **histórico de mensagem**, você deve habilitar permissões Microsoft Graph e conceder consentimento de administrador.

1. No Entra ID (Azure AD) **App Registration**, adicione **Permissões de Aplicativo** (Application permissions) Microsoft Graph:
   - `ChannelMessage.Read.All` (anexos de canal + histórico)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (chats de grupo)
2. **Conceda consentimento de administrador** para o tenant.
3. Aumente a **versão de manifesto** do app Teams, reenvie, e **reinstale o app no Teams**.
4. **Encerre e relance o Teams completamente** para limpar metadados de app em cache.

## Limitações Conhecidas

### Timeouts de Webhook

O Teams entrega mensagens via webhook HTTP. Se o processamento demorar muito (ex., respostas LLM lentas), você pode ver:

- Timeouts de gateway
- Teams reenviando a mensagem (causando duplicatas)
- Respostas perdidas

O ZERO lida com isso retornando rapidamente e enviando respostas proativamente, mas respostas muito lentas ainda podem causar problemas.

### Formatação

Markdown do Teams é mais limitado que Slack ou Discord:

- Formatação básica funciona: **negrito**, *itálico*, `código`, links
- Markdown complexo (tabelas, listas aninhadas) pode não renderizar corretamente
- Adaptive Cards são suportados para enquetes e envios de cartões arbitrários (veja abaixo)

## Configuração

Configurações chave (veja `/gateway/configuration` para padrões de canal compartilhados):

- `channels.msteams.enabled`: ativar/desativar o canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: credenciais do bot.
- `channels.msteams.webhook.port` (padrão `3978`)
- `channels.msteams.webhook.path` (padrão `/api/messages`)
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled` (padrão: pairing)
- `channels.msteams.allowFrom`: allowlist para DMs (IDs de objeto AAD, UPNs ou nomes de exibição). O assistente resolve nomes para IDs durante configuração quando acesso Graph está disponível.
- `channels.msteams.textChunkLimit`: tamanho de fragmento de texto de saída.
- `channels.msteams.chunkMode`: `length` (padrão) ou `newline` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- `channels.msteams.mediaAllowHosts`: allowlist para hosts de anexo de entrada (padrão para domínios Microsoft/Teams).
- `channels.msteams.requireMention`: exigir @menção em canais/grupos (padrão true).
- `channels.msteams.replyStyle`: `thread | top-level` (veja [Estilo de Resposta](#estilo-de-resposta-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle`: sobrescrita por equipe.
- `channels.msteams.teams.<teamId>.requireMention`: sobrescrita por equipe.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: sobrescrita por canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: sobrescrita por canal.
- `channels.msteams.sharePointSiteId`: ID do site SharePoint para uploads de arquivo em chats de grupo/canais (veja [Enviando arquivos em chats de grupo](#enviando-arquivos-em-chats-de-grupo)).

## Roteamento e Sessões

- Chaves de sessão seguem o formato padrão de agente (veja [/concepts/session](/concepts/session)):
  - Mensagens diretas compartilham a sessão principal (`agent:<agentId>:<mainKey>`).
  - Mensagens de canal/grupo usam id de conversa:
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Estilo de Resposta: Threads vs Posts

O Teams introduziu recentemente dois estilos de UI de canal sobre o mesmo modelo de dados subjacente:

| Estilo | Descrição | `replyStyle` recomendado |
| :--- | :--- | :--- |
| **Posts** (clássico) | Mensagens aparecem como cartões com respostas encadeadas embaixo | `thread` (padrão) |
| **Threads** (tipo Slack) | Mensagens fluem linearmente, mais como Slack | `top-level` |

**O problema:** A API do Teams não expõe qual estilo de UI um canal usa. Se você usar o `replyStyle` errado:

- `thread` em um canal estilo Threads → respostas aparecem aninhadas de forma estranha
- `top-level` em um canal estilo Posts → respostas aparecem como posts de nível superior separados em vez de na thread

**Solução:** Configure `replyStyle` por canal baseado em como o canal está configurado:

```json
{
  "msteams": {
    "replyStyle": "thread",
    "teams": {
      "19:abc...@thread.tacv2": {
        "channels": {
          "19:xyz...@thread.tacv2": {
            "replyStyle": "top-level"
          }
        }
      }
    }
  }
}
```

## Anexos e Imagens

**Limitações atuais:**

- **DMs:** Imagens e anexos de arquivo funcionam via APIs de arquivo de bot do Teams.
- **Canais/grupos:** Anexos vivem no armazenamento M365 (SharePoint/OneDrive). O payload do webhook inclui apenas um stub HTML, não os bytes reais do arquivo. **Permissões Graph API são necessárias** para baixar anexos de canal.

Sem permissões Graph, mensagens de canal com imagens serão recebidas como apenas texto (o conteúdo da imagem não é acessível ao bot).
Por padrão, o ZERO só baixa mídia de hostnames Microsoft/Teams. Sobrescreva com `channels.msteams.mediaAllowHosts` (use `["*"]` para permitir qualquer host).

## Enviando arquivos em chats de grupo

Bots podem enviar arquivos em DMs usando o fluxo FileConsentCard (integrado). No entanto, **enviar arquivos em chats de grupo/canais** requer configuração adicional:

| Contexto | Como arquivos são enviados | Configuração necessária |
| :--- | :--- | :--- |
| **DMs** | FileConsentCard → usuário aceita → bot faz upload | Funciona de imediato |
| **Chats de grupo/canais** | Upload para SharePoint → link de compartilhamento | Requer `sharePointSiteId` + permissões Graph |
| **Imagens (qualquer contexto)** | Base64-encoded inline | Funciona de imediato |

### Por que chats de grupo precisam de SharePoint

Bots não têm um drive OneDrive pessoal (o endpoint Graph API `/me/drive` não funciona para identidades de aplicativo). Para enviar arquivos em chats de grupo/canais, o bot faz upload para um **site SharePoint** e cria um link de compartilhamento.

### Configuração

1. **Adicione permissões Graph API** no Entra ID (Azure AD) → App Registration:
   - `Sites.ReadWrite.All` (Application) - upload de arquivos para SharePoint
   - `Chat.Read.All` (Application) - opcional, habilita links de compartilhamento por usuário

2. **Conceda consentimento de administrador** para o tenant.

3. **Obtenha seu ID de site SharePoint:**

   ```bash
   # Via Graph Explorer ou curl com um token válido:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Exemplo: para um site em "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Resposta inclui: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **Configure ZERO:**

   ```json5
   {
     channels: {
       msteams: {
         // ... outras configs ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2"
       }
     }
   }
   ```

### Comportamento de compartilhamento

| Permissão | Comportamento de compartilhamento |
| :--- | :--- |
| `Sites.ReadWrite.All` apenas | Link de compartilhamento em toda a organização (qualquer um na org pode acessar) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Link de compartilhamento por usuário (apenas membros do chat podem acessar) |

Compartilhamento por usuário é mais seguro pois apenas os participantes do chat podem acessar o arquivo. Se a permissão `Chat.Read.All` estiver faltando, o bot reverte para compartilhamento em toda a organização.

### Comportamento de fallback

| Cenário | Resultado |
| :--- | :--- |
| Chat de grupo + arquivo + `sharePointSiteId` configurado | Upload para SharePoint, envia link de compartilhamento |
| Chat de grupo + arquivo + sem `sharePointSiteId` | Tenta upload OneDrive (pode falhar), envia apenas texto |
| Chat pessoal + arquivo | Fluxo FileConsentCard (funciona sem SharePoint) |
| Qualquer contexto + imagem | Base64-encoded inline (funciona sem SharePoint) |

### Localização de arquivos armazenados

Arquivos carregados são armazenados em uma pasta `/ZEROShared/` na biblioteca de documentos padrão do site SharePoint configurado.

## Enquetes (Adaptive Cards)

O ZERO envia enquetes do Teams como Adaptive Cards (não há API de enquete Teams nativa).

- CLI: `zero message poll --channel msteams --target conversation:<id> ...`
- Votos são registrados pelo gateway em `~/.zero/msteams-polls.json`.
- O gateway deve permanecer online para registrar votos.
- Enquetes ainda não postam resumos de resultados automaticamente (inspecione o arquivo de armazenamento se necessário).

## Adaptive Cards (arbitrários)

Envie qualquer JSON de Adaptive Card para usuários ou conversas do Teams usando ferramenta `message` ou CLI.

O parâmetro `card` aceita um objeto JSON Adaptive Card. Quando `card` é fornecido, o texto da mensagem é opcional.

**Ferramenta de agente:**

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:<id>",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{"type": "TextBlock", "text": "Hello!"}]
  }
}
```

**CLI:**

```bash
zero message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

Veja [documentação de Adaptive Cards](https://adaptivecards.io/) para esquema e exemplos. Para detalhes de formato de alvo, veja [Formatos de alvo](#formatos-de-alvo) abaixo.

## Formatos de alvo

Alvos MSTeams usam prefixos para distinguir entre usuários e conversas:

| Tipo de alvo | Formato | Exemplo |
| :--- | :--- | :--- |
| Usuário (por ID) | `user:<object-id-aad>` | `user:40a1a0ed-4ff2-4164-a219-55518990c197` |
| Usuário (por nome) | `user:<display-name>` | `user:John Smith` (requer Graph API) |
| Grupo/canal | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2` |
| Grupo/canal (bruto) | `<conversation-id>` | `19:abc123...@thread.tacv2` (se contiver `@thread`) |

**Exemplos CLI:**

```bash
# Enviar para um usuário por ID
zero message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# Enviar para um usuário por nome de exibição (aciona busca Graph API)
zero message send --channel msteams --target "user:John Smith" --message "Hello"

# Enviar para um chat de grupo ou canal
zero message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# Enviar um Adaptive Card para uma conversa
zero message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
```

**Exemplos de ferramenta de agente:**

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:John Smith",
  "message": "Hello!"
}
```

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "conversation:19:abc...@thread.tacv2",
  "card": {"type": "AdaptiveCard", "version": "1.5", "body": [{"type": "TextBlock", "text": "Hello"}]}
}
```

Nota: Sem o prefixo `user:`, nomes padronizam para resolução de grupo/equipe. Sempre use `user:` ao mirar pessoas por nome de exibição.

## Mensagens proativas

- Mensagens proativas só são possíveis **depois** que um usuário interagiu, porque armazenamos referências de conversa nesse ponto.
- Veja `/gateway/configuration` para `dmPolicy` e bloqueio por allowlist.

## IDs de Equipe e Canal (Pegadinha Comum)

O parâmetro de consulta `groupId` em URLs do Teams **NÃO** é o ID de equipe usado para configuração. Extraia IDs do caminho da URL em vez disso:

**Team URL:**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decoded)
```

**Channel URL:**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decoded)
```

**Para config:**

- Team ID = segmento de caminho após `/team/` (URL-decoded, ex., `19:Bk4j...@thread.tacv2`)
- Channel ID = segmento de caminho após `/channel/` (URL-decoded)
- **Ignore** o parâmetro de consulta `groupId`

## Canais Privados

Bots têm suporte limitado em canais privados:

| Recurso | Canais Padrão | Canais Privados |
| :--- | :--- | :--- |
| Instalação de bot | Sim | Limitada |
| Mensagens em tempo real (webhook) | Sim | Pode não funcionar |
| Permissões RSC | Sim | Pode comportar-se diferente |
| @menções | Sim | Se o bot estiver acessível |
| Histórico Graph API | Sim | Sim (com permissões) |

**Soluções alternativas se canais privados não funcionarem:**

1. Use canais padrão para interações de bot
2. Use DMs - usuários sempre podem enviar mensagem direta para o bot
3. Use Graph API para acesso histórico (requer `ChannelMessage.Read.All`)

## Solução de problemas

### Problemas comuns

- **Imagens não mostrando em canais:** Permissões Graph ou consentimento de admin faltando. Reinstale o app Teams e feche/reabra o Teams completamente.
- **Sem respostas no canal:** menções são necessárias por padrão; defina `channels.msteams.requireMention=false` ou configure por equipe/canal.
- **Incompatibilidade de versão (Teams ainda mostra manifesto antigo):** remova + re-adicione o app e feche o Teams completamente para atualizar.
- **401 Unauthorized do webhook:** Esperado ao testar manualmente sem JWT Azure - significa que o endpoint é alcançável mas auth falhou. Use Azure Web Chat para testar corretamente.

### Erros de upload de manifesto

- **"Icon file cannot be empty":** O manifesto referencia arquivos de ícone que têm 0 bytes. Crie ícones PNG válidos (32x32 para `outline.png`, 192x192 para `color.png`).
- **"webApplicationInfo.Id already in use":** O app ainda está instalado em outra equipe/chat. Encontre e desinstale-o primeiro, ou espere 5-10 minutos para propagação.
- **"Something went wrong" no upload:** Faça upload via <https://admin.teams.microsoft.com> em vez disso, abra DevTools do navegador (F12) → Network tab, e verifique o corpo da resposta para o erro real.
- **Sideload falhando:** Tente "Upload an app to your org's app catalog" em vez de "Upload a custom app" - isso frequentemente contorna restrições de sideload.

### Permissões RSC não funcionando

1. Verifique se `webApplicationInfo.id` corresponde exatamente ao App ID do seu bot
2. Re-envie o app e reinstale na equipe/chat
3. Verifique se seu admin de org bloqueou permissões RSC
4. Confirme que está usando o escopo certo: `ChannelMessage.Read.Group` para equipes, `ChatMessage.Read.Chat` para chats de grupo

## Referências

- [Criar Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guia de configuração Azure Bot
- [Portal do Desenvolvedor Teams](https://dev.teams.microsoft.com/apps) - criar/gerenciar apps Teams
- [Esquema de manifesto de app Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receber mensagens de canal com RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Referência de permissões RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Manipulação de arquivo de bot Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/grupo requer Graph)
- [Mensagens proativas](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
