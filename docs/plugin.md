---
summary: "Plugins/Extensões do ZERO: descoberta, configuração e segurança"
read_when:
  - Ao adicionar ou modificar plugins/extensões
  - Para documentar regras de instalação ou carregamento de plugins
---

# Plugins (Extensões)

## Início rápido (Novo nos plugins?)

Um plugin é apenas um **pequeno módulo de código** que estende o ZERO com recursos extras (comandos, ferramentas e RPC do Gateway).

Na maioria das vezes, você usará plugins quando quiser um recurso que ainda não faz parte do núcleo (core) do ZERO (ou se quiser manter recursos opcionais fora da sua instalação principal).

Caminho rápido:

1) Veja o que já está carregado:

```bash
zero plugins list
```

1) Instale um plugin oficial (exemplo: Voice Call):

```bash
zero plugins install @zero/voice-call
```

1) Reinicie o Gateway e configure em `plugins.entries.<id>.config`.

Consulte [Voice Call](/plugins/voice-call) para um exemplo concreto de plugin.

## Plugins disponíveis (oficiais)

- O Microsoft Teams é apenas via plugin desde 15/01/2026; instale `@zero/msteams` se você usar o Teams.
- Memory (Core) — plugin de busca em memória integrado (ativado por padrão via `plugins.slots.memory`).
- Memory (LanceDB) — plugin de memória de longo prazo integrado (captura/recuperação automática; ajuste `plugins.slots.memory = "memory-lancedb"`).
- [Voice Call](/plugins/voice-call) — `@zero/voice-call`.
- [Zalo Personal](/plugins/zalouser) — `@zero/zalouser`.
- [Matrix](/channels/matrix) — `@zero/matrix`.
- [Nostr](/channels/nostr) — `@zero/nostr`.
- [Zalo](/channels/zalo) — `@zero/zalo`.
- [Microsoft Teams](/channels/msteams) — `@zero/msteams`.
- Google Google Cloud Auth OAuth (autenticação de provedor) — integrado como `google-cloud-auth-auth` (desativado por padrão).
- Gemini CLI OAuth (autenticação de provedor) — integrado como `google-gemini-cli-auth` (desativado por padrão).
- Qwen OAuth (autenticação de provedor) — integrado como `qwen-portal-auth` (desativado por padrão).
- Copilot Proxy (autenticação de provedor) — ponte local para o VS Code Copilot Proxy; distinto do login de dispositivo integrado `github-copilot` (integrado, desativado por padrão).

Os plugins do ZERO são **módulos TypeScript** carregados em tempo de execução via jiti. **A validação da configuração não executa o código do plugin**; ela utiliza o manifesto do plugin e o Esquema JSON. Consulte [Manifesto do Plugin](/plugins/manifest).

Os plugins podem registrar:

- Métodos RPC do Gateway
- Manipuladores HTTP do Gateway
- Ferramentas do Agente
- Comandos da CLI
- Serviços em segundo plano
- Validação opcional de configuração
- **Habilidades (Skills)** (listando diretórios `skills` no manifesto do plugin)
- **Comandos de auto-resposta** (executam sem invocar o agente de IA)

Os plugins rodam **no mesmo processo** do Gateway, portanto, trate-os como código confiável. Guia de criação de ferramentas: [Ferramentas de agente de plugin](/plugins/agent-tools).

## Auxiliares em tempo de execução

Os plugins podem acessar ajudantes selecionados do núcleo via `api.runtime`. Para TTS de telefonia:

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Olá do ZERO",
  cfg: api.config,
});
```

Notas:

- Usa a configuração central de `messages.tts` (OpenAI ou ElevenLabs).
- Retorna um buffer de áudio PCM + taxa de amostragem. Os plugins devem reamostrar/codificar para os provedores.
- Edge TTS não é suportado para telefonia.

## Descoberta e Precedência

O ZERO escaneia, nesta ordem:

1) Caminhos de configuração

- `plugins.load.paths` (arquivo ou diretório)

1) Extensões do Workspace

- `<workspace>/.zero/extensions/*.ts`
- `<workspace>/.zero/extensions/*/index.ts`

1) Extensões Globais

- `~/.zero/extensions/*.ts`
- `~/.zero/extensions/*/index.ts`

1) Extensões Integradas (enviadas com o ZERO, **desativadas por padrão**)

- `<zero>/extensions/*`

Plugins integrados devem ser ativados explicitamente via `plugins.entries.<id>.enabled` ou `zero plugins enable <id>`. Plugins instalados são ativados por padrão, mas podem ser desativados da mesma forma.

Cada plugin deve incluir um arquivo `zero.plugin.json` em sua raiz. Se um caminho aponta para um arquivo, a raiz do plugin é o diretório desse arquivo e deve conter o manifesto.

Se múltiplos plugins resolverem para o mesmo ID, o primeiro encontrado na ordem acima vence, e as cópias de menor precedência são ignoradas.

### Pacotes de Extensão (Packs)

Um diretório de plugin pode incluir um `package.json` com `zero.extensions`:

```json
{
  "name": "meu-pacote",
  "zero": {
    "extensions": ["./src/seguranca.ts", "./src/ferramentas.ts"]
  }
}
```

Cada entrada se torna um plugin. Se o pacote listar múltiplas extensões, o ID do plugin se torna `nome/nomeDoArquivo`.

Se o seu plugin importa dependências npm, instale-as nesse diretório para que a pasta `node_modules` esteja disponível (`npm install` / `pnpm install`).

### Metadados do Catálogo de Canais

Plugins de canal podem anunciar metadados de integração via `zero.channel` e dicas de instalação via `zero.install`. Isso mantém o núcleo do catálogo livre de dados estáticos excedentes.

Exemplo:

```json
{
  "name": "@zero/nextcloud-talk",
  "zero": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (auto-hospedado)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Chat auto-hospedado via bots de webhook Nextcloud Talk.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@zero/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

O ZERO também pode mesclar **catálogos externos de canais** (por exemplo, uma exportação de registro MPM). Coloque um arquivo JSON em um dos seguintes locais:

- `~/.zero/mpm/plugins.json`
- `~/.zero/mpm/catalog.json`
- `~/.zero/plugins/catalog.json`

Ou aponte `ZERO_PLUGIN_CATALOG_PATHS` (ou `ZERO_MPM_CATALOG_PATHS`) para um ou mais arquivos JSON (delimitados por vírgula/ponto e vírgula/`PATH`). Cada arquivo deve conter `{ "entries": [ { "name": "@escopo/pkg", "zero": { "channel": {...}, "install": {...} } } ] }`.

## IDs de Plugins

IDs padrão de plugins:

- Pacotes de extensão: `name` no `package.json`.
- Arquivo autônomo: nome base do arquivo (`~/.../voice-call.ts` → `voice-call`).

Se um plugin exporta um `id`, o ZERO o utiliza, mas emite um aviso se ele não coincidir com o ID configurado.

## Configuração

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["plugin-nao-confiavel"],
    load: { paths: ["~/Projetos/oss/extensao-voice-call"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } }
    }
  }
}
```

Campos:

- `enabled`: alternador mestre (padrão: true).
- `allow`: lista de permissões (opcional).
- `deny`: lista de bloqueio (opcional; bloqueio tem precedência).
- `load.paths`: arquivos/diretórios extras de plugins.
- `entries.<id>`: alternadores e configurações por plugin.

Alterações de configuração **exigem a reinicialização do gateway**.

Regras de validação (estritas):

- IDs de plugin desconhecidos em `entries`, `allow`, `deny` ou `slots` são considerados **erros**.
- Chaves `channels.<id>` desconhecidas são **erros**, a menos que o manifesto de um plugin declare o ID do canal.
- A configuração do plugin é validada usando o Esquema JSON embutido em `zero.plugin.json` (`configSchema`).
- Se um plugin estiver desativado, sua configuração é preservada e um **aviso** é emitido.

## Slots de Plugin (Categorias Exclusivas)

Algumas categorias de plugin são **exclusivas** (apenas uma ativa por vez). Use `plugins.slots` para selecionar qual plugin assume o slot:

```json5
{
  plugins: {
    slots: {
      memory: "memory-core" // ou "none" para desativar plugins de memória
    }
  }
}
```

Se múltiplos plugins declararem `kind: "memory"`, apenas o selecionado é carregado. Os outros são desativados com informativos de diagnóstico.

## UI de Controle (Esquema + Rótulos)

A UI de Controle usa `config.schema` (Esquema JSON + `uiHints`) para renderizar formulários melhores.

O ZERO amplia as `uiHints` em tempo de execução baseando-se nos plugins descobertos:

- Adiciona rótulos por plugin para `plugins.entries.<id>` / `.enabled` / `.config`.
- Mescla dicas de campos de configuração fornecidas opcionalmente pelo plugin sob: `plugins.entries.<id>.config.<campo>`.

Se você deseja que os campos de configuração do seu plugin exibam rótulos/placeholders adequados (e marque segredos como sensíveis), forneça `uiHints` junto com o seu Esquema JSON no manifesto do plugin.

Exemplo:

```json
{
  "id": "meu-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "Chave de API", "sensitive": true },
    "region": { "label": "Região", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
zero plugins list
zero plugins info <id>
zero plugins install <caminho>                 # copia um arquivo/diretório local para ~/.zero/extensions/<id>
zero plugins install ./extensions/voice-call    # caminho relativo ok
zero plugins install ./plugin.tgz               # instala de um tarball local
zero plugins install ./plugin.zip               # instala de um zip local
zero plugins install -l ./extensions/voice-call # link (sem cópia) para desenvolvimento
zero plugins install @zero/voice-call       # instala via npm
zero plugins update <id>
zero plugins update --all
zero plugins enable <id>
zero plugins disable <id>
zero plugins doctor
```

O comando `plugins update` funciona apenas para instalações npm rastreadas em `plugins.installs`.

Os plugins também podem registrar seus próprios comandos de nível superior (exemplo: `zero voicecall`).

## API do Plugin (Visão Geral)

Plugins exportam:

- Uma função: `(api) => { ... }`
- Um objeto: `{ id, name, configSchema, register(api) { ... } }`

## Hooks de Plugin

Plugins podem incluir hooks e registrá-los em tempo de execução. Isso permite que um plugin ofereça automação baseada em eventos sem a necessidade de instalar um pacote de hooks separado.

### Exemplo

```ts
import { registerPluginHooksFromDir } from "zero/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

Notas:

- Os diretórios de hooks seguem a estrutura normal (`HOOK.md` + `handler.ts`).
- Regras de elegibilidade de hooks ainda se aplicam (requisitos de SO/bins/env/config).
- Hooks gerenciados por plugin aparecem em `zero hooks list` com o prefixo `plugin:<id>`.
- Você não pode ativar/desativar hooks gerenciados por plugin via `zero hooks`; ative ou desative o plugin em si.

## Plugins de Provedor (Autenticação de Modelo)

Plugins podem registrar fluxos de **autenticação de provedor de modelo** para que os usuários possam realizar configurações de OAuth ou chaves de API dentro do ZERO (sem necessidade de scripts externos).

Registre um provedor via `api.registerProvider(...)`. Cada provedor expõe um ou mais métodos de autenticação (OAuth, chave de API, código de dispositivo, etc.). Esses métodos alimentam:

- `zero models auth login --provider <id> [--method <id>]`

Exemplo:

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Executa o fluxo OAuth e retorna os perfis de autenticação
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
});
```

Notas:

- `run` recebe um `ProviderAuthContext` com ajudantes como `prompter`, `runtime`, `openUrl` e `oauth.createVpsAwareHandlers`.
- Retorne `configPatch` quando precisar adicionar modelos padrão ou configurações do provedor.
- Retorne `defaultModel` para que `--set-default` possa atualizar os padrões do agente.

### Registrando um Canal de Mensagens

Plugins podem registrar **plugins de canal** que se comportam como canais integrados (WhatsApp, Telegram, etc.). A configuração do canal fica sob `channels.<id>` e é validada pelo código do plugin do canal.

```ts
const meuCanal = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "Exemplo de plugin de canal.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      (cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? { accountId }),
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: meuCanal });
}
```

Notas:

- Coloque a configuração sob `channels.<id>` (não em `plugins.entries`).
- `meta.label` é usado para rótulos em listas da CLI/UI.
- `meta.aliases` adiciona IDs alternativos para normalização e entradas da CLI.
- `meta.preferOver` lista IDs de canais a serem ignorados na ativação automática quando ambos estão configurados.
- `meta.detailLabel` e `meta.systemImage` permitem que as UIs exibam rótulos/ícones mais detalhados.

### Escrevendo um novo canal de mensagens (passo a passo)

Use isto quando quiser uma **nova superfície de chat** (um “canal de mensagens”), não um provedor de modelos. Documentação de provedores de modelos fica sob `/providers/*`.

1) Escolha um ID + formato de configuração

- Toda a configuração do canal fica sob `channels.<id>`.
- Prefira `channels.<id>.accounts.<accountId>` para configurações multi-conta.

1) Defina os metadados do canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` controlam as listas da CLI/UI.
- `meta.docsPath` deve apontar para uma página de documentação como `/channels/<id>`.
- `meta.preferOver` permite que um plugin substitua outro canal (a ativação automática o preferirá).
- `meta.detailLabel` e `meta.systemImage` são usados pelas UIs para texto/ícones detalhados.

1) Implemente os adaptadores obrigatórios

- `config.listAccountIds` + `config.resolveAccount`.
- `capabilities` (tipos de chat, mídia, tópicos, etc.).
- `outbound.deliveryMode` + `outbound.sendText` (para envio básico).

1) Adicione adaptadores opcionais conforme necessário

- `setup` (assistente), `security` (política de DM), `status` (saúde/diagnósticos).
- `gateway` (iniciar/parar/login), `mentions`, `threading`, `streaming`.
- `actions` (ações de mensagem), `commands` (comportamento de comando nativo).

1) Registre o canal no seu plugin

- `api.registerChannel({ plugin })`.

Exemplo de configuração mínima:

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "TOKEN_ACME", enabled: true }
      }
    }
  }
}
```

Exemplo de plugin de canal mínimo (apenas saída):

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "Canal de mensagens AcmeChat.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      (cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? { accountId }),
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // entrega o `text` para o seu canal aqui
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Carregue o plugin (diretório de extensões ou `plugins.load.paths`), reinicie o gateway e configure `channels.<id>` na sua configuração.

### Ferramentas de Agente

Consulte o guia dedicado: [Ferramentas de agente de plugin](/plugins/agent-tools).

### Registrar um método RPC do gateway

```ts
export default function (api) {
  api.registerGatewayMethod("meuplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Registrar comandos da CLI

```ts
export default function (api) {
  api.registerCli(({ program }) => {
    program.command("meucmd").action(() => {
      console.log("Olá");
    });
  }, { commands: ["meucmd"] });
}
```

### Registrar comandos de auto-resposta

Os plugins podem registrar comandos slash personalizados que executam **sem invocar o agente de IA**. Isso é útil para comandos de alternância, verificações de status ou ações rápidas que não precisam de processamento LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "meustatus",
    description: "Mostra o status do plugin",
    handler: (ctx) => ({
      text: `Plugin em execução! Canal: ${ctx.channel}`,
    }),
  });
}
```

Contexto do manipulador de comandos:

- `senderId`: ID do remetente (se disponível).
- `channel`: O canal onde o comando foi enviado.
- `isAuthorizedSender`: Se o remetente é um usuário autorizado.
- `args`: Argumentos passados após o comando (se `acceptsArgs: true`).
- `commandBody`: O texto completo do comando.
- `config`: A configuração atual do ZERO.

Opções do comando:

- `name`: Nome do comando (sem a barra inicial `/`).
- `description`: Texto de ajuda exibido em listas de comandos.
- `acceptsArgs`: Se o comando aceita argumentos (padrão: false). Se for falso e argumentos forem fornecidos, o comando não corresponderá e a mensagem passará para outros manipuladores.
- `requireAuth`: Se exige remetente autorizado (padrão: true).
- `handler`: Função que retorna `{ text: string }` (pode ser assíncrona).

Exemplo com autorização e argumentos:

```ts
api.registerCommand({
  name: "definirmodo",
  description: "Define o modo do plugin",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const modo = ctx.args?.trim() || "padrao";
    await salvarModo(modo);
    return { text: `Modo definido para: ${modo}` };
  },
});
```

Notas:

- Os comandos de plugin são processados **antes** dos comandos integrados e do agente de IA.
- Comandos são registrados globalmente e funcionam em todos os canais.
- Nomes de comandos não diferenciam maiúsculas de minúsculas (`/MeuStatus` coincide com `/meustatus`).
- Nomes de comandos devem começar com uma letra e conter apenas letras, números, hifens e sublinhados.
- Nomes de comando reservados (como `help`, `status`, `reset`, etc.) não podem ser sobrescritos por plugins.
- O registro de comandos duplicados entre plugins falhará com um erro de diagnóstico.

### Registrar serviços em segundo plano

```ts
export default function (api) {
  api.registerService({
    id: "meu-servico",
    start: () => api.logger.info("pronto"),
    stop: () => api.logger.info("tchau"),
  });
}
```

## Convenções de Nomenclatura

- Métodos do Gateway: `idDoPlugin.acao` (exemplo: `voicecall.status`).
- Ferramentas: `snake_case` (exemplo: `voice_call`).
- Comandos da CLI: kebab ou camel, mas evite conflitos com comandos centrais.

## Habilidades (Skills)

Plugins podem oferecer uma habilidade no repositório (`skills/<nome>/SKILL.md`). Ative-a via `plugins.entries.<id>.enabled` (ou outros meios de configuração) e certifique-se de que ela esteja presente nos locais de habilidades gerenciadas ou do workspace.

## Distribuição (npm)

Empacotamento recomendado:

- Pacote principal: `zero` (este repositório).
- Plugins: pacotes npm separados sob `@zero/*` (exemplo: `@zero/voice-call`).

Contrato de publicação:

- O `package.json` do plugin deve incluir `zero.extensions` com um ou mais arquivos de entrada.
- Arquivos de entrada podem ser `.js` ou `.ts` (jiti carrega TS em tempo de execução).
- `zero plugins install <espec-npm>` usa `npm pack`, extrai para `~/.zero/extensions/<id>/` e ativa na configuração.
- Estabilidade da chave de configuração: pacotes com escopo são normalizados para o ID **sem escopo** em `plugins.entries.*`.

## Exemplo de plugin: Voice Call

Este repositório inclui um plugin de chamada de voz (via Twilio ou logs de fallback):

- Fonte: `extensions/voice-call`.
- Habilidade: `skills/voice-call`.
- CLI: `zero voicecall start|status`.
- Ferramenta: `voice_call`.
- RPC: `voicecall.start`, `voicecall.status`.
- Configuração (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (opcional: `statusCallbackUrl`, `twimlUrl`).
- Configuração (dev): `provider: "log"` (sem conexão com rede).

Consulte [Voice Call](/plugins/voice-call) e o `README.md` em `extensions/voice-call/` para detalhes de configuração e uso.

## Notas de Segurança

Plugins rodam no mesmo processo do Gateway. Trate-os como código confiável:

- Instale apenas plugins nos quais você confia.
- Prefira usar listas de permissões em `plugins.allow`.
- Reinicie o Gateway após mudanças.

## Testando Plugins

Plugins podem (e devem) incluir testes:

- Plugins no repositório podem manter testes Vitest em `src/**` (exemplo: `src/plugins/voice-call.plugin.test.ts`).
- Plugins publicados separadamente devem rodar sua própria CI (lint/build/test) e validar se `zero.extensions` aponta para o ponto de entrada compilado (`dist/index.js`).
