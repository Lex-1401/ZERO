---
summary: "Status de suporte Matrix, capacidades e configuração"
read_when:
  - Trabalhando em recursos do canal Matrix
---

# Matrix (plugin)

Matrix é um protocolo de mensagens aberto e descentralizado. O ZERO se conecta como um **usuário** Matrix em qualquer homeserver, então você precisa de uma conta Matrix para o bot. Uma vez logado, você pode enviar DM para o bot diretamente ou convidá-lo para salas ("grupos" Matrix). Beeper é uma opção de cliente válida também, mas requer que E2EE esteja ativado.

Status: suportado via plugin (matrix-bot-sdk). Mensagens diretas, salas, threads, mídia, reações, enquetes (envio + início de enquete como texto), localização e E2EE (com suporte a criptografia).

## Plugin necessário

Matrix é distribuído como um plugin e não é empacotado com a instalação principal.

Instale via CLI (registro npm):

```bash
zero plugins install @zero/matrix
```

Checkout local (ao rodar de um repositório git):

```bash
zero plugins install ./extensions/matrix
```

Se você escolher Matrix durante configuração/onboarding e um checkout git for detectado, o ZERO oferecerá o caminho de instalação local automaticamente.

Detalhes: [Plugins](/plugin)

## Configuração

1) Instale o plugin Matrix:
   - Do npm: `zero plugins install @zero/matrix`
   - De um checkout local: `zero plugins install ./extensions/matrix`
2) Crie uma conta Matrix em um homeserver:
   - Navegue por opções de hospedagem em [https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/)
   - Ou hospede você mesmo.
3) Obtenha um token de acesso para a conta do bot:
   - Use a API de login do Matrix com `curl` no seu servidor doméstico:

   ```bash
   curl --request POST \
     --url https://matrix.exemplo.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "seu-nome-de-usuario"
     },
     "password": "sua-senha"
   }'
   ```

   - Substitua `matrix.exemplo.org` com a URL do seu homeserver.
   - Ou defina `channels.matrix.userId` + `channels.matrix.password`: O ZERO chama o mesmo endpoint de login, armazena o token de acesso em `~/.zero/credentials/matrix/credentials.json`, e o reutiliza na próxima inicialização.
4) Configure as credenciais:
   - Env: `MATRIX_HOMESERVER`, `MATRIX_ACCESS_TOKEN` (ou `MATRIX_USER_ID` + `MATRIX_PASSWORD`)
   - Ou config: `channels.matrix.*`
   - Se ambos estiverem definidos, a config tem precedência.
   - Com token de acesso: ID de usuário é buscado automaticamente via `/whoami`.
   - Quando definido, `channels.matrix.userId` deve ser o ID Matrix completo (exemplo: `@bot:exemplo.org`).
5) Reinicie o gateway (ou termine o onboarding).
6) Inicie uma DM com o bot ou convide-o para uma sala de qualquer cliente Matrix (Element, Beeper, etc.; veja <https://matrix.org/ecosystem/clients/>). Beeper requer E2EE, então defina `channels.matrix.encryption: true` e verifique o dispositivo.

Configuração mínima (token de acesso, ID de usuário auto-buscado):

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.exemplo.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" }
    }
  }
}
```

Configuração E2EE (criptografia ponta-a-ponta ativada):

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.exemplo.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" }
    }
  }
}
```

## Criptografia (E2EE)

Criptografia ponta-a-ponta é **suportada** via SDK de criptografia Rust.

Ative com `channels.matrix.encryption: true`:

- Se o módulo de criptografia carregar, salas criptografadas são descriptografadas automaticamente.
- Mídia de saída é criptografada ao enviar para salas criptografadas.
- Na primeira conexão, o ZERO solicita verificação de dispositivo das suas outras sessões.
- Verifique o dispositivo em outro cliente Matrix (Element, etc.) para habilitar o compartilhamento de chaves.
- Se o módulo de criptografia não puder ser carregado, E2EE é desativado e salas criptografadas não descodificarão; o ZERO registra um aviso.
- Se você vir erros de módulo de criptografia ausente (por exemplo, `@matrix-org/matrix-sdk-crypto-nodejs-*`), permita scripts de build para `@matrix-org/matrix-sdk-crypto-nodejs` e execute `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` ou baixe o binário com `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js`.

Estado de criptografia é armazenado por conta + token de acesso em
`~/.zero/matrix/accounts/<conta>/<homeserver>__<usuario>/<hash-token>/crypto/`
(banco de dados SQLite). Estado de sincronização vive ao lado dele em `bot-storage.json`.
Se o token de acesso (dispositivo) mudar, um novo armazenamento é criado e o bot deve ser re-verificado para salas criptografadas.

**Verificação de dispositivo:**
Quando E2EE está ativado, o bot solicitará verificação das suas outras sessões na inicialização.
Abra o Element (ou outro cliente) e aprove a solicitação de verificação para estabelecer confiança.
Uma vez verificado, o bot pode descriptografar mensagens em salas criptografadas.

## Modelo de roteamento

- Respostas sempre voltam para o Matrix.
- DMs compartilham a sessão principal do agente; salas mapeiam para sessões de grupo.

## Controle de acesso (DMs)

- Padrão: `channels.matrix.dm.policy = "pairing"`. Remetentes desconhecidos recebem um código de emparelhamento.
- Aprove via:
  - `zero pairing list matrix`
  - `zero pairing approve matrix <CODIGO>`
- DMs Públicas: `channels.matrix.dm.policy="open"` mais `channels.matrix.dm.allowFrom=["*"]`.
- `channels.matrix.dm.allowFrom` aceita IDs de usuário ou nomes de exibição. O assistente resolve nomes de exibição para IDs de usuário quando a busca de diretório está disponível.

## Salas (grupos)

- Padrão: `channels.matrix.groupPolicy = "allowlist"` (bloqueado por menção). Use `channels.defaults.groupPolicy` para sobrescrever o padrão quando não definido.
- Salas na allowlist com `channels.matrix.groups` (IDs de sala, aliases ou nomes):

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:exemplo.org": { allow: true },
        "#alias:exemplo.org": { allow: true }
      },
      groupAllowFrom: ["@dono:exemplo.org"]
    }
  }
}
```

- `requireMention: false` habilita auto-resposta naquela sala.
- `groups."*"` pode definir padrões para bloqueio por menção através das salas.
- `groupAllowFrom` restringe quais remetentes podem acionar o bot em salas (opcional).
- Allowlists `users` por sala podem restringir ainda mais remetentes dentro de uma sala específica.
- O assistente de configuração solicita allowlists de sala (IDs de sala, aliases ou nomes) e resolve nomes quando possível.
- Na inicialização, o ZERO resolve nomes de sala/usuário em allowlists para IDs e loga o mapeamento; entradas não resolvidas são mantidas como digitadas.
- Convites são aceitos automaticamente por padrão; controle com `channels.matrix.autoJoin` e `channels.matrix.autoJoinAllowlist`.
- Para permitir **nenhuma sala**, defina `channels.matrix.groupPolicy: "disabled"` (ou mantenha uma allowlist vazia).
- Chave legada: `channels.matrix.rooms` (mesmo formato que `groups`).

## Threads

- Encadeamento de resposta (threading) é suportado.
- `channels.matrix.threadReplies` controla se respostas ficam em threads:
  - `off`, `inbound` (padrão), `always`
- `channels.matrix.replyToMode` controla metadados reply-to quando não respondendo em uma thread:
  - `off` (padrão), `first`, `all`

## Capacidades

| Recurso | Status |
| :--- | :--- |
| Mensagens diretas | ✅ Suportado |
| Salas | ✅ Suportado |
| Threads | ✅ Suportado |
| Mídia | ✅ Suportado |
| E2EE | ✅ Suportado (módulo crypto necessário) |
| Reações | ✅ Suportado (enviar/ler via ferramentas) |
| Enquetes | ✅ Envio suportado; inícios de enquete de entrada convertidos para texto (respostas/finais ignorados) |
| Localização | ✅ Suportado (geo URI; altitude ignorada) |
| Comandos nativos | ✅ Suportado |

## Referência de configuração (Matrix)

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.matrix.enabled`: ativar/desativar inicialização do canal.
- `channels.matrix.homeserver`: URL do homeserver.
- `channels.matrix.userId`: ID de usuário Matrix (opcional com token de acesso).
- `channels.matrix.accessToken`: token de acesso.
- `channels.matrix.password`: senha para login (token armazenado).
- `channels.matrix.deviceName`: nome de exibição do dispositivo.
- `channels.matrix.encryption`: ativar E2EE (padrão: false).
- `channels.matrix.initialSyncLimit`: limite de sincronização inicial.
- `channels.matrix.threadReplies`: `off | inbound | always` (padrão: inbound).
- `channels.matrix.textChunkLimit`: tamanho de fragmento de texto de saída (chars).
- `channels.matrix.chunkMode`: `length` (padrão) ou `newline` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- `channels.matrix.dm.policy`: `pairing | allowlist | open | disabled` (padrão: pairing).
- `channels.matrix.dm.allowFrom`: allowlist de DM (IDs de usuário ou nomes de exibição). `open` requer `"*"`. O assistente resolve nomes para IDs quando possível.
- `channels.matrix.groupPolicy`: `allowlist | open | disabled` (padrão: allowlist).
- `channels.matrix.groupAllowFrom`: remetentes na allowlist para mensagens de grupo.
- `channels.matrix.allowlistOnly`: forçar regras de allowlist para DMs + salas.
- `channels.matrix.groups`: allowlist de grupo + mapa de configurações por sala.
- `channels.matrix.rooms`: allowlist/config de grupo legado.
- `channels.matrix.replyToMode`: modo reply-to para threads/tags.
- `channels.matrix.mediaMaxMb`: limite de mídia de entrada/saída (MB).
- `channels.matrix.autoJoin`: tratamento de convite (`always | allowlist | off`, padrão: always).
- `channels.matrix.autoJoinAllowlist`: IDs/aliases de sala permitidos para auto-join.
- `channels.matrix.actions`: bloqueio por ferramenta por ação (reactions/messages/pins/memberInfo/channelInfo).
