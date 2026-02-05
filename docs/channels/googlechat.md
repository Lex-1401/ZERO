---
summary: "Status de suporte do app Google Chat, capacidades e configuração"
read_when:
  - Trabalhando em recursos do canal Google Chat
---

# Google Chat (Chat API)

Status: pronto para DMs + spaces via webhooks da API do Google Chat (apenas HTTP).

## Configuração rápida (iniciante)

1) Crie um projeto Google Cloud e ative a **Google Chat API**.
   - Vá para: [Credenciais da API Google Chat](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - Ative a API se ela ainda não estiver ativada.
2) Crie uma **Conta de Serviço** (Service Account):
   - Pressione **Create Credentials** > **Service Account**.
   - Nomeie como quiser (ex., `zero-chat`).
   - Deixe as permissões em branco (pressione **Continue**).
   - Deixe os principais com acesso em branco (pressione **Done**).
3) Crie e baixe a **Chave JSON**:
   - Na lista de contas de serviço, clique na que você acabou de criar.
   - Vá para a aba **Keys**.
   - Clique em **Add Key** > **Create new key**.
   - Selecione **JSON** e pressione **Create**.
4) Armazene o arquivo JSON baixado no host do seu gateway (ex., `~/.zero/googlechat-service-account.json`).
5) Crie um app Google Chat na [Configuração de Chat do Console Google Cloud](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat):
   - Preencha as **Informações do aplicativo** (Application info):
     - **Nome do app**: (ex. `ZERO`)
     - **URL do Avatar**: (ex. `https://raw.githubusercontent.com/Lex-1401/ZERO/main/logo.png`)
     - **Descrição**: (ex. `Assistente Pessoal de IA`)
   - Ative **Recursos interativos** (Interactive features).
   - Em **Funcionalidade** (Functionality), marque **Participar de espaços e conversas em grupo** (Join spaces and group conversations).
   - Em **Configurações de conexão** (Connection settings), selecione **URL de endpoint HTTP**.
   - Em **Gatilhos** (Triggers), selecione **Usar uma URL de endpoint HTTP comum para todos os gatilhos** e defina-a para a URL pública do seu gateway seguida de `/googlechat`.
     - *Dica: Execute `zero status` para encontrar a URL pública do seu gateway.*
   - Em **Visibilidade**, marque **Disponibilizar este app de Chat para pessoas e grupos específicos em &lt;Seu Domínio&gt;**.
   - Insira seu endereço de email (ex. `user@example.com`) na caixa de texto.
   - Clique em **Salvar** na parte inferior.
6) **Ative o status do app**:
   - Após salvar, **atualize a página**.
   - Procure a seção **Status do app** (geralmente perto do topo ou fundo após salvar).
   - Altere o status para **Ao vivo - disponível para usuários** (Live - available to users).
   - Clique em **Salvar** novamente.
7) Configure o ZERO com o caminho da conta de serviço + audiência do webhook:
   - Env: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/caminho/para/service-account.json`
   - Ou config: `channels.googlechat.serviceAccountFile: "/caminho/para/service-account.json"`.
8) Defina o tipo de audiência do webhook + valor (corresponde à configuração do seu app de Chat).
9) Inicie o gateway. O Google Chat fará POST para o caminho do seu webhook.

## Adicionar ao Google Chat

Uma vez que o gateway esteja rodando e seu email adicionado à lista de visibilidade:

1) Vá para o [Google Chat](https://chat.google.com/).
2) Clique no ícone **+** (mais) ao lado de **Mensagens Diretas**.
3) Na barra de pesquisa (onde você geralmente adiciona pessoas), digite o **Nome do app** que você configurou no Console Google Cloud.
   - **Nota**: O bot *não* aparecerá na lista de navegação do "Marketplace" pois é um app privado. Você deve procurá-lo pelo nome.
4) Selecione seu bot nos resultados.
5) Clique em **Adicionar** ou **Chat** para iniciar uma conversa 1:1.
6) Envie "Olá" para acionar o assistente!

## URL Pública (Apenas Webhook)

Webhooks do Google Chat requerem um endpoint HTTPS público. Por segurança, **exponha apenas o caminho `/googlechat`** para a internet. Mantenha o dashboard do ZERO e outros endpoints sensíveis na sua rede privada.

### Opção A: Tailscale Funnel (Recomendado)

Use Tailscale Serve para o dashboard privado e Funnel para o caminho público do webhook. Isso mantém `/` privado enquanto expõe apenas `/googlechat`.

1. **Verifique em qual endereço seu gateway está vinculado:**

   ```bash
   ss -tlnp | grep 18789
   ```

   Note o endereço IP (ex., `127.0.0.1`, `0.0.0.0`, ou seu IP Tailscale como `100.x.x.x`).

2. **Exponha o dashboard apenas para a tailnet (porta 8443):**

   ```bash
   # Se vinculado ao localhost (127.0.0.1 ou 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # Se vinculado apenas ao IP Tailscale (ex., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **Exponha apenas o caminho do webhook publicamente:**

   ```bash
   # Se vinculado ao localhost (127.0.0.1 ou 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # Se vinculado apenas ao IP Tailscale (ex., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **Autorize o nó para acesso ao Funnel:**
   Se solicitado, visite a URL de autorização mostrada na saída para habilitar o Funnel para este nó na sua política de tailnet.

5. **Verifique a configuração:**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

A URL pública do seu webhook será:
`https://<nome-do-no>.<tailnet>.ts.net/googlechat`

Seu dashboard privado permanece apenas na tailnet:
`https://<nome-do-no>.<tailnet>.ts.net:8443/`

Use a URL pública (sem `:8443`) na configuração do app Google Chat.

> Nota: Esta configuração persiste após reinicializações. Para removê-la mais tarde, execute `tailscale funnel reset` e `tailscale serve reset`.

### Opção B: Proxy Reverso (Caddy)

Se você usa um proxy reverso como Caddy, faça proxy apenas do caminho específico:

```caddy
seu-dominio.com {
    reverse_proxy /googlechat* localhost:18789
}
```

Com esta configuração, qualquer requisição para `seu-dominio.com/` será ignorada ou retornada como 404, enquanto `seu-dominio.com/googlechat` é roteada com segurança para o ZERO.

### Opção C: Túnel Cloudflare

Configure as regras de entrada (ingress) do seu túnel para rotear apenas o caminho do webhook:

- **Caminho**: `/googlechat` -> `http://localhost:18789/googlechat`
- **Regra Padrão**: HTTP 404 (Not Found)

## Como funciona

1. O Google Chat envia POSTs de webhook para o gateway. Cada requisição inclui um cabeçalho `Authorization: Bearer <token>`.
2. O ZERO verifica o token contra o `audienceType` + `audience` configurados:
   - `audienceType: "app-url"` → audiência é a URL HTTPS do webhook.
   - `audienceType: "project-number"` → audiência é o número do projeto Cloud.
3. Mensagens são roteadas por espaço (space):
   - DMs usam chave de sessão `agent:<agentId>:googlechat:dm:<spaceId>`.
   - Espaços usam chave de sessão `agent:<agentId>:googlechat:group:<spaceId>`.
4. O acesso via DM é pairing (emparelhamento) por padrão. Remetentes desconhecidos recebem um código de emparelhamento; aprove com:
   - `zero pairing approve googlechat <code>`
5. Espaços de grupo exigem @-menção por padrão. Use `botUser` se a detecção de menção precisar do nome de usuário do app.

## Alvos

Use estes identificadores para entrega e allowlists:

- Mensagens diretas: `users/<userId>` ou `users/<email>` (endereços de email são aceitos).
- Espaços: `spaces/<spaceId>`.

## Destaques de configuração

```json5
{
  channels: {
    "googlechat": {
      enabled: true,
      serviceAccountFile: "/caminho/para/service-account.json",
      audienceType: "app-url",
      audience: "https://gateway.exemplo.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // opcional; ajuda na detecção de menção
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890", "nome@exemplo.com"]
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          allow: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Apenas respostas curtas."
        }
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20
    }
  }
}
```

Notas:

- Credenciais de conta de serviço também podem ser passadas inline com `serviceAccount` (string JSON).
- O caminho padrão do webhook é `/googlechat` se `webhookPath` não for definido.
- Reações estão disponíveis via ferramenta `reactions` e `channels action` quando `actions.reactions` está ativado.
- `typingIndicator` suporta `none`, `message` (padrão), e `reaction` (reação requer OAuth de usuário).
- Anexos são baixados através da API de Chat e armazenados no pipeline de mídia (tamanho limitado por `mediaMaxMb`).

## Solução de problemas

### 405 Method Not Allowed

Se o Google Cloud Logs Explorer mostrar erros como:

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

Isso significa que o manipulador do webhook não está registrado. Causas comuns:

1. **Canal não configurado**: A seção `channels.googlechat` está faltando na sua configuração. Verifique com:

   ```bash
   zero config get channels.googlechat
   ```

   Se retornar "Config path not found", adicione a configuração (veja [Destaques de configuração](#destaques-de-configuracao)).

2. **Plugin não ativado**: Verifique o status do plugin:

   ```bash
   zero plugins list | grep googlechat
   ```

   Se mostrar "disabled", adicione `plugins.entries.googlechat.enabled: true` à sua configuração.

3. **Gateway não reiniciado**: Após adicionar a configuração, reinicie o gateway:

   ```bash
   zero gateway restart
   ```

Verifique se o canal está rodando:

```bash
zero channels status
# Deve mostrar: Google Chat default: enabled, configured, ...
```

### Outros problemas

- Verifique `zero channels status --probe` para erros de auth ou configuração de audiência ausente.
- Se nenhuma mensagem chegar, confirme a URL do webhook do app de Chat + assinaturas de evento.
- Se o bloqueio por menção impedir respostas, defina `botUser` para o nome de recurso do usuário do app e verifique `requireMention`.
- Use `zero logs --follow` enquanto envia uma mensagem de teste para ver se as requisições chegam ao gateway.

Docs relacionados:

- [Configuração do Gateway](/gateway/configuration)
- [Segurança](/gateway/security)
- [Reações](/tools/reactions)
