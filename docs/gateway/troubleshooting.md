---
summary: "Guia rápido de solução de problemas para falhas comuns do ZERO"
read_when:
  - Investigando problemas de execução ou falhas
---

# Solução de Problemas 🔧

Quando o ZERO se comporta mal, veja como consertar.

Comece com os "Primeiros 60 segundos" do FAQ ([First 60 seconds](/help/faq#first-60-seconds-if-somethings-broken)) se você quiser apenas uma receita rápida de triagem. Esta página se aprofunda mais em falhas de tempo de execução (runtime) e diagnósticos.

Atalhos específicos do provedor: [/channels/troubleshooting](/channels/troubleshooting)

## Status e Diagnósticos

Comandos de triagem rápida (em ordem):

| Comando | O que ele diz | Quando usá-lo |
| :--- | :--- | :--- |
| `zero status` | Resumo local: SO + atualização, alcance/modo do gateway, serviço, agentes/sessões, estado de config do provedor | Primeira verificação, visão geral rápida |
| `zero status --all` | Diagnóstico local completo (somente leitura, colável, +/- seguro) incl. tail de log | Quando você precisa compartilhar um relatório de debug |
| `zero status --deep` | Executa verificações de saúde do gateway (incl. sondas de provedor; requer gateway alcançável) | Quando "configurado" não significa "funcionando" |
| `zero gateway probe` | Descoberta do gateway + alcance (alvos locais + remotos) | Quando você suspeita que está sondando o gateway errado |
| `zero channels status --probe` | Pede ao gateway em execução o status do canal (e opcionalmente sonda) | Quando o gateway é alcançável mas canais se comportam mal |
| `zero gateway status` | Estado do supervisor (launchd/systemd/schtasks), PID/saída do runtime, último erro do gateway | Quando o serviço "parece carregado" mas nada roda |
| `zero logs --follow` | Logs ao vivo (melhor sinal para problemas de runtime) | Quando você precisa da razão real da falha |

**Compartilhando a saída:** prefira `zero status --all` (ele redige tokens). Se você colar `zero status`, considere definir `ZERO_SHOW_SECRETS=0` primeiro (pré-visualizações de token).

Veja também: [Verificações de saúde](/gateway/health) e [Logging](/logging).

## Problemas Comuns

### Nenhuma chave de API encontrada para o provedor "anthropic"

Isso significa que o **armazenamento de autenticação do agente está vazio** ou faltando credenciais da Anthropic.
A autenticação é **por agente**, então um novo agente não herdará as chaves do agente principal.

Opções de correção:

- Reexecute o onboarding e escolha **Anthropic** para aquele agente.
- Ou cole um token de configuração (setup-token) no **host do gateway**:

  ```bash
  zero models auth setup-token --provider anthropic
  ```

- Ou copie `auth-profiles.json` do diretório do agente principal para o diretório do novo agente.

Verifique:

```bash
zero models status
```

### Falha na atualização do token OAuth (assinatura Anthropic Claude)

Isso significa que o token OAuth da Anthropic armazenado expirou e a atualização falhou.
Se você está em uma assinatura Claude (sem chave de API), a correção mais confiável é alternar para um **setup-token do Claude Code** ou ressincronizar o OAuth da CLI do Claude Code no **host do gateway**.

**Recomendado (setup-token):**

```bash
# Execute no host do gateway (executa Claude Code CLI)
zero models auth setup-token --provider anthropic
zero models status
```

Se você gerou o token em outro lugar:

```bash
zero models auth paste-token --provider anthropic
zero models status
```

**Se você quiser manter a reutilização de OAuth:**
faça login com a CLI do Claude Code no host do gateway e, em seguida, execute `zero models status` para sincronizar o token atualizado no armazenamento de autenticação do ZERO.

Mais detalhes: [Anthropic](/providers/anthropic) e [OAuth](/concepts/oauth).

### Control UI falha em HTTP ("device identity required" / "connect failed")

Se você abrir o dashboard via HTTP simples (ex: `http://<lan-ip>:18789/` ou `http://<tailscale-ip>:18789/`), o navegador roda em um **contexto não seguro** e bloqueia o WebCrypto, então a identidade do dispositivo não pode ser gerada.

**Correção:**

- Prefira HTTPS via [Tailscale Serve](/gateway/tailscale).
- Ou abra localmente no host do gateway: `http://127.0.0.1:18789/`.
- Se tiver que ficar em HTTP, habilite `gateway.controlUi.allowInsecureAuth: true` e use um token de gateway (apenas token; sem identidade de dispositivo/emparelhamento). Veja [Control UI](/web/control-ui#insecure-http).

### Falha na Varredura de Segredos do CI (CI Secrets Scan Failed)

Isso significa que `detect-secrets` encontrou novos candidatos ainda não presentes na baseline.
Siga [Varredura de segredos](/gateway/security#secret-scanning-detect-secrets).

### Serviço Instalado mas Nada está Rodando

Se o serviço de gateway está instalado, mas o processo sai imediatamente, o serviço pode parecer "carregado" enquanto nada está rodando.

**Verifique:**

```bash
zero gateway status
zero doctor
```

Doctor/serviço mostrará o estado de tempo de execução (PID/última saída) e dicas de log.

**Logs:**

- Preferido: `zero logs --follow`
- Logs de arquivo (sempre): `/tmp/zero/zero-YYYY-MM-DD.log` (ou seu `logging.file` configurado)
- macOS LaunchAgent (se instalado): `$ZERO_STATE_DIR/logs/gateway.log` e `gateway.err.log`
- Linux systemd (se instalado): `journalctl --user -u zero-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "ZERO Gateway (<profile>)" /V /FO LIST`

**Habilite mais logging:**

- Aumente o detalhe do log de arquivo (JSONL persistido):

  ```json
  { "logging": { "level": "debug" } }
  ```

- Aumente a verbosidade do console (apenas saída TTY):

  ```json
  { "logging": { "consoleLevel": "debug", "consoleStyle": "pretty" } }
  ```

- Dica rápida: `--verbose` afeta apenas a saída do **console**. Logs de arquivo permanecem controlados por `logging.level`.

Veja [/logging](/logging) para uma visão geral completa de formatos, configuração e acesso.

### "Início do gateway bloqueado: defina gateway.mode=local"

Isso significa que a configuração existe, mas `gateway.mode` não está definido (ou não é `local`), então o Gateway se recusa a iniciar.

**Correção (recomendada):**

- Execute o assistente e defina o modo de execução do Gateway para **Local**:

  ```bash
  zero configure
  ```

- Ou defina diretamente:

  ```bash
  zero config set gateway.mode local
  ```

**Se você pretendia executar um Gateway remoto:**

- Defina uma URL remota e mantenha `gateway.mode=remote`:

  ```bash
  zero config set gateway.mode remote
  zero config set gateway.remote.url "wss://gateway.example.com"
  ```

**Ad-hoc/apenas dev:** passe `--allow-unconfigured` para iniciar o gateway sem `gateway.mode=local`.

**Sem arquivo de configuração ainda?** Execute `zero setup` para criar uma configuração inicial, depois execute o gateway novamente.

### Ambiente de Serviço (PATH + runtime)

O serviço de gateway roda com um **PATH mínimo** para evitar lixo de shell/gerenciadores:

- macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
- Linux: `/usr/local/bin`, `/usr/bin`, `/bin`

Isso exclui intencionalmente gerenciadores de versão (nvm/fnm/volta/asdf) e gerenciadores de pacotes (pnpm/npm) porque o serviço não carrega a inicialização do seu shell. Variáveis de tempo de execução como `DISPLAY` devem viver em `~/.zero/.env` (carregado cedo pelo gateway).
O `exec` roda em `host=gateway` mesclando seu `PATH` de shell de login no ambiente de execução, então ferramentas faltando geralmente significam que a inicialização do seu shell não as está exportando (ou defina `tools.exec.pathPrepend`). Veja [/tools/exec](/tools/exec).

Canais WhatsApp + Telegram requerem **Node**; Bun não é suportado. Se seu serviço foi instalado com Bun ou um caminho de Node gerenciado por versão, execute `zero doctor` para migrar para uma instalação de Node do sistema.

### Habilidade (Skill) faltando chave de API na sandbox

**Sintoma:** Habilidade funciona no host, mas falha na sandbox com chave de API ausente.

**Por que:** exec em sandbox roda dentro do Docker e **não** herda `process.env` do host.

**Correção:**

- defina `agents.defaults.sandbox.docker.env` (ou por agente `agents.list[].sandbox.docker.env`)
- ou incorpore a chave em sua imagem de sandbox personalizada
- então execute `zero sandbox recreate --agent <id>` (ou `--all`)

### Serviço Rodando mas Porta Não Escutando

Se o serviço reporta **running** (rodando) mas nada está escutando na porta do gateway, o Gateway provavelmente recusou o vínculo (bind).

#### O que "running" significa aqui

- `Runtime: running` significa que seu supervisor (launchd/systemd/schtasks) acha que o processo está vivo.
- `RPC probe` significa que a CLI pôde realmente conectar ao WebSocket do gateway e chamar `status`.
- Sempre confie em `Probe target:` + `Config (service):` como as linhas de "o que realmente tentamos?".

**Verifique:**

- `gateway.mode` deve ser `local` para `zero gateway` e o serviço.
- Se você definir `gateway.mode=remote`, a **CLI padroniza** para uma URL remota. O serviço ainda pode estar rodando localmente, mas sua CLI pode estar sondando o lugar errado. Use `zero gateway status` para ver a porta resolvida do serviço + alvo da sonda (ou passe `--url`).
- `zero gateway status` e `zero doctor` mostram o **último erro do gateway** dos logs quando o serviço parece rodar, mas a porta está fechada.
- Vínculos não-loopback (`lan`/`tailnet`/`custom`, ou `auto` quando loopback está indisponível) requerem autenticação:
  `gateway.auth.token` (ou `ZERO_GATEWAY_TOKEN`).
- `gateway.remote.token` é apenas para chamadas CLI remotas; ele **não** habilita autenticação local.
- `gateway.token` é ignorado; use `gateway.auth.token`.

**Se `zero gateway status` mostrar incompatibilidade de configuração**

- `Config (cli): ...` e `Config (service): ...` devem normalmente coincidir.
- Se não coincidirem, você quase certamente está editando uma configuração enquanto o serviço executa outra.
- Correção: reexecute `zero gateway install --force` do mesmo `--profile` / `ZERO_STATE_DIR` que você quer que o serviço use.

**Se `zero gateway status` relatar problemas de configuração de serviço**

- A configuração do supervisor (launchd/systemd/schtasks) está faltando padrões atuais.
- Correção: execute `zero doctor` para atualizá-la (ou `zero gateway install --force` para uma reescrita completa).

**Se `Last gateway error:` mencionar "refusing to bind ... without auth"**

- Você definiu `gateway.bind` para um modo não-loopback (`lan`/`tailnet`/`custom`, ou `auto` quando loopback indisponível) mas deixou a auth desligada.
- Correção: defina `gateway.auth.mode` + `gateway.auth.token` (ou exporte `ZERO_GATEWAY_TOKEN`) e reinicie o serviço.

**Se `zero gateway status` diz `bind=tailnet` mas nenhuma interface tailnet foi encontrada**

- O gateway tentou vincular a um IP Tailscale (100.64.0.0/10) mas nenhum foi detectado no host.
- Correção: suba o Tailscale nessa máquina (ou altere `gateway.bind` para `loopback`/`lan`).

**Se `Probe note:` diz que a sonda usa loopback**

- Isso é esperado para `bind=lan`: o gateway escuta em `0.0.0.0` (todas as interfaces), e loopback ainda deve conectar localmente.
- Para clientes remotos, use um IP LAN real (não `0.0.0.0`) mais a porta, e garanta que a auth esteja configurada.

### Endereço Já em Uso (Porta 18789)

Isso significa que algo já está escutando na porta do gateway.

**Verifique:**

```bash
zero gateway status
```

Ele mostrará o(s) ouvinte(s) e prováveis causas (gateway já rodando, túnel SSH).
Se necessário, pare o serviço ou escolha uma porta diferente.

### Pastas de Workspace Extras Detectadas

Se você atualizou de instalações mais antigas, ainda pode ter `~/zero` no disco.
Múltiplos diretórios de workspace podem causar confusão de autenticação ou desvio de estado porque apenas um workspace é ativo.

**Correção:** mantenha um único workspace ativo e arquive/remova o restante. Veja [Workspace do Agente](/concepts/agent-workspace#extra-workspace-folders).

### Chat principal rodando em um workspace de sandbox

Sintomas: `pwd` ou ferramentas de arquivo mostram `~/.zero/sandboxes/...` mesmo que você esperasse o workspace do host.

**Por que:** `agents.defaults.sandbox.mode: "non-main"` se baseia em `session.mainKey` (padrão `"main"`).
Sessões de grupo/canal usam suas próprias chaves, então são tratadas como non-main e recebem workspaces de sandbox.

**Opções de correção:**

- Se você quer workspaces do host para um agente: defina `agents.list[].sandbox.mode: "off"`.
- Se você quer acesso ao workspace do host dentro da sandbox: defina `workspaceAccess: "rw"` para aquele agente.

### "Agente foi abortado"

O agente foi interrompido no meio da resposta.

**Causas:**

- Usuário enviou `stop`, `abort`, `esc`, `wait` ou `exit`
- Tempo limite excedido
- Processo travou

**Correção:** Apenas envie outra mensagem. A sessão continua.

### "Agente falhou antes da resposta: Modelo desconhecido: anthropic/claude-haiku-3-5"

O ZERO rejeita intencionalmente **modelos mais antigos/inseguros** (especialmente aqueles mais vulneráveis a injeção de prompt). Se você vir este erro, o nome do modelo não é mais suportado.

**Correção:**

- Escolha um modelo **mais recente** para o provedor e atualize sua configuração ou alias de modelo.
- Se não tiver certeza de quais modelos estão disponíveis, execute `zero models list` ou `zero models scan` e escolha um suportado.
- Verifique logs do gateway para a razão detalhada da falha.

Veja também: [Models CLI](/cli/models) e [Provedores de modelo](/concepts/model-providers).

### Mensagens Não Acionando (Triggering)

**Verificação 1:** O remetente está na lista de permissão?

```bash
zero status
```

Procure por `AllowFrom: ...` na saída.

**Verificação 2:** Para chats em grupo, menção é exigida?

```bash
# A mensagem deve corresponder a mentionPatterns ou menções explícitas; padrões vivem em grupos de canal/guildas.
# Multi-agente: `agents.list[].groupChat.mentionPatterns` sobrescreve padrões globais.
grep -n "agents\\|groupChat\\|mentionPatterns\\|channels\\.whatsapp\\.groups\\|channels\\.telegram\\.groups\\|channels\\.imessage\\.groups\\|channels\\.discord\\.guilds" \
  "${ZERO_CONFIG_PATH:-$HOME/.zero/zero.json}"
```

**Verificação 3:** Verifique os logs

```bash
zero logs --follow
# ou se quiser filtros rápidos:
tail -f "$(ls -t /tmp/zero/zero-*.log | head -1)" | grep "blocked\\|skip\\|unauthorized"
```

### Código de Emparelhamento Não Chegando

Se `dmPolicy` for `pairing`, remetentes desconhecidos devem receber um código e sua mensagem é ignorada até ser aprovada.

**Verificação 1:** Já existe uma solicitação pendente esperando?

```bash
zero pairing list <channel>
```

Solicitações de emparelhamento de DM pendentes são limitadas a **3 por canal** por padrão. Se a lista estiver cheia, novas solicitações não gerarão um código até que uma seja aprovada ou expire.

**Verificação 2:** A solicitação foi criada, mas nenhuma resposta foi enviada?

```bash
zero logs --follow | grep "pairing request"
```

**Verificação 3:** Confirme se `dmPolicy` não é `open`/`allowlist` para aquele canal.

### Imagem + Menção Não Funcionando

Problema conhecido: Quando você envia uma imagem com APENAS uma menção (sem outro texto), o WhatsApp às vezes não inclui os metadados da menção.

**Solução alternativa:** Adicione algum texto com a menção:

- ❌ `@zero` + imagem
- ✅ `@zero veja isso` + imagem

### Sessão Não Retomando

**Verificação 1:** O arquivo de sessão está lá?

```bash
ls -la ~/.zero/agents/<agentId>/sessions/
```

**Verificação 2:** A janela de reset é muito curta?

```json
{
  "session": {
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 10080  // 7 dias
    }
  }
}
```

**Verificação 3:** Alguém enviou `/new`, `/reset` ou um gatilho de reset?

### Agente Excedendo Tempo Limite (Timing Out)

O tempo limite padrão é 30 minutos. Para tarefas longas:

```json
{
  "reply": {
    "timeoutSeconds": 3600  // 1 hora
  }
}
```

Ou use a ferramenta `process` para colocar comandos longos em segundo plano.

### WhatsApp Desconectado

```bash
# Verifique status local (creds, sessões, eventos enfileirados)
zero status
# Sonde o gateway em execução + canais (WA connect + APIs Telegram + Discord)
zero status --deep

# Veja eventos de conexão recentes
zero logs --limit 200 | grep "connection\\|disconnect\\|logout"
```

**Correção:** Geralmente reconecta automaticamente assim que o Gateway está rodando. Se estiver travado, reinicie o processo do Gateway (como quer que você o superviosione), ou execute manualmente com saída verbosa:

```bash
zero gateway --verbose
```

Se você estiver deslogado / desvinculado:

```bash
zero channels logout
trash "${ZERO_STATE_DIR:-$HOME/.zero}/credentials" # se logout não puder remover tudo limpamente
zero channels login --verbose       # re-escaneie o QR
```

### Falha no Envio de Mídia

**Verificação 1:** O caminho do arquivo é válido?

```bash
ls -la /caminho/para/sua/imagem.jpg
```

**Verificação 2:** É muito grande?

- Imagens: máx 6MB
- Áudio/Vídeo: máx 16MB
- Documentos: máx 100MB

**Verificação 3:** Verifique logs de mídia

```bash
grep "media\\|fetch\\|download" "$(ls -t /tmp/zero/zero-*.log | head -1)" | tail -20
```

### Alto Uso de Memória

O ZERO mantém o histórico de conversação na memória.

**Correção:** Reinicie periodicamente ou defina limites de sessão:

```json
{
  "session": {
    "historyLimit": 100  // Máx mensagens para manter
  }
}
```

## Solução de problemas comuns

### "Gateway não inicia — configuração inválida"

O ZERO agora se recusa a iniciar quando a configuração contém chaves desconhecidas, valores malformados ou tipos inválidos.
Isso é intencional para segurança.

Corrija com Doctor:

```bash
zero doctor
zero doctor --fix
```

Notas:

- `zero doctor` reporta cada entrada inválida.
- `zero doctor --fix` aplica migrações/reparos e reescreve a configuração.
- Comandos de diagnóstico como `zero logs`, `zero health`, `zero status`, `zero gateway status`, e `zero gateway probe` ainda rodam mesmo se a configuração for inválida.

### "Todos os modelos falharam" — o que devo verificar primeiro?

- **Credenciais** presentes para o(s) provedor(es) sendo tentado(s) (perfis de auth + env vars).
- **Roteamento de modelo**: confirme se `agents.defaults.model.primary` e fallbacks são modelos que você pode acessar.
- **Logs do Gateway** em `/tmp/zero/…` para o erro exato do provedor.
- **Status do modelo**: use `/model status` (chat) ou `zero models status` (CLI).

### Estou rodando no meu número pessoal do WhatsApp — por que o self-chat está estranho?

Habilite o modo self-chat e coloque seu próprio número na lista de permissão:

```json5
{
  channels: {
    whatsapp: {
      selfChatMode: true,
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"]
    }
  }
}
```

Veja [Configuração do WhatsApp](/channels/whatsapp).

### WhatsApp me deslogou. Como re-autentico?

Execute o comando de login novamente e escaneie o código QR:

```bash
zero channels login
```

### Erros de build na `main` — qual o caminho de correção padrão?

1) `git pull origin main && pnpm install`
2) `zero doctor`
3) Verifique issues no GitHub ou Discord
4) Solução alternativa temporária: faça checkout de um commit mais antigo

### npm install falha (allow-build-scripts / missing tar or yargs). E agora?

Se você está rodando a partir da fonte, use o gerenciador de pacotes do repositório: **pnpm** (preferido).
O repositório declara `packageManager: "pnpm@…"`.

Recuperação típica:

```bash
git status   # garanta que está na raiz do repo
pnpm install
pnpm build
zero doctor
zero gateway restart
```

Por que: pnpm é o gerenciador de pacotes configurado para este repo.

### Como alterno entre instalações git e npm?

Use o **instalador do site** e selecione o método de instalação com uma flag. Ele atualiza no local (in-place) e reescreve o serviço de gateway para apontar para a nova instalação.

Alternar **para instalação git**:

```bash
curl -fsSL https://zero.local/install.sh | bash -s -- --install-method git --no-onboard
```

Alternar **para npm global**:

```bash
curl -fsSL https://zero.local/install.sh | bash
```

Notas:

- O fluxo git apenas faz rebase se o repo estiver limpo. Commite ou guarde (stash) alterações primeiro.
- Após alternar, execute:

  ```bash
  zero doctor
  zero gateway restart
  ```

### Streaming de bloco do Telegram não está dividindo texto entre chamadas de ferramenta. Por quê?

Streaming de blocos envia apenas **blocos de texto completos**. Razões comuns para você ver uma única mensagem:

- `agents.defaults.blockStreamingDefault` ainda é `"off"`.
- `channels.telegram.blockStreaming` está definido como `false`.
- `channels.telegram.streamMode` é `partial` ou `block` **e o streaming de rascunho está ativo** (chat privado + tópicos). Streaming de rascunho desativa streaming de bloco nesse caso.
- Suas configurações de `minChars` / coalesce são muito altas, então os pedaços são fundidos.
- O modelo emite um grande bloco de texto (sem pontos de descarga no meio da resposta).

Checklist de correção:

1) Coloque configurações de streaming de bloco sob `agents.defaults`, não na raiz.
2) Defina `channels.telegram.streamMode: "off"` se quiser respostas reais de múltiplos blocos de mensagem.
3) Use limites menores de chunk/coalesce enquanto depura.

Veja [Streaming](/concepts/streaming).

### Discord não responde no meu servidor mesmo com `requireMention: false`. Por quê?

`requireMention` controla apenas o bloqueio por menção **após** o canal passar pelas listas de permissão.
Por padrão `channels.discord.groupPolicy` é **allowlist**, então guildas devem ser explicitamente habilitadas.
Se você definir `channels.discord.guilds.<guildId>.channels`, apenas os canais listados são permitidos; omita para permitir todos os canais na guilda.

Checklist de correção:

1) Defina `channels.discord.groupPolicy: "open"` **ou** adicione uma entrada de lista de permissão de guilda (e opcionalmente uma lista de permissão de canal).
2) Use **IDs de canal numéricos** em `channels.discord.guilds.<guildId>.channels`.
3) Coloque `requireMention: false` **sob** `channels.discord.guilds` (global ou por canal).
   Top-level `channels.discord.requireMention` não é uma chave suportada.
4) Garanta que o bot tenha **Message Content Intent** e permissões de canal.
5) Execute `zero channels status --probe` para dicas de auditoria.

Docs: [Discord](/channels/discord), [Solução de problemas de canais](/channels/troubleshooting).

### Erro da API Cloud Code Assist: esquema de ferramenta inválido (400). E agora?

Isso é quase sempre um problema de **compatibilidade de esquema de ferramenta**. O endpoint Cloud Code Assist aceita um subconjunto estrito do JSON Schema. O ZERO limpa/normaliza esquemas de ferramentas na `main` atual, mas a correção ainda não está no último release (em 13 de Janeiro de 2026).

Checklist de correção:

1) **Atualize o ZERO**:
   - Se puder rodar da fonte, puxe a `main` e reinicie o gateway.
   - Caso contrário, aguarde o próximo release que inclui o limpador de esquema.
2) Evite palavras-chave não suportadas como `anyOf/oneOf/allOf`, `patternProperties`, `additionalProperties`, `minLength`, `maxLength`, `format`, etc.
3) Se você define ferramentas personalizadas, mantenha o esquema de nível superior como `type: "object"` com `properties` e enums simples.

Veja [Ferramentas](/tools) e [Esquemas TypeBox](/concepts/typebox).

## Problemas Específicos do macOS

### App falha ao conceder permissões (Fala/Mic)

Se o app desaparece ou mostra "Abort trap 6" quando você clica em "Permitir" em um aviso de privacidade:

#### Correção 1: Resetar Cache TCC

```bash
tccutil reset All com.zero.mac.debug
```

#### Correção 2: Forçar Novo Bundle ID

Se resetar não funcionar, altere o `BUNDLE_ID` em [`scripts/package-mac-app.sh`](https://github.com/zero/zero/blob/main/scripts/package-mac-app.sh) (ex: adicione um sufixo `.test`) e reconstrua. Isso força o macOS a tratá-lo como um novo app.

### Gateway travado em "Starting..."

O app conecta a um gateway local na porta `18789`. Se ele ficar travado:

#### Correção 1: Pare o supervisor (preferido)

Se o gateway é supervisionado pelo launchd, matar o PID apenas o reiniciará. Pare o supervisor primeiro:

```bash
zero gateway status
zero gateway stop
# Ou: launchctl bootout gui/$UID/com.zero.gateway (substitua por com.zero.<profile> se necessário)
```

#### Correção 2: Porta está ocupada (encontre o ouvinte)

```bash
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

Se for um processo não supervisionado, tente uma parada graciosa primeiro, depois escale:

```bash
kill -TERM <PID>
sleep 1
kill -9 <PID> # último recurso
```

#### Correção 3: Verifique a instalação da CLI

Garanta que a CLI global `zero` está instalada e corresponde à versão do app:

```bash
zero --version
npm install -g zero@<versão>
```

## Modo de Depuração (Debug Mode)

Obtenha log verboso:

```bash
# Ligue o log de rastreamento (trace) na config:
#   ${ZERO_CONFIG_PATH:-$HOME/.zero/zero.json} -> { logging: { level: "trace" } }
#
# Então execute comandos verbosos para espelhar a saída de debug para stdout:
zero gateway --verbose
zero channels login --verbose
```

## Locais de Log

| Log | Localização |
| :--- | :--- |
| Logs de arquivo do Gateway (estruturados) | `/tmp/zero/zero-YYYY-MM-DD.log` (ou `logging.file`) |
| Logs de serviço do Gateway (supervisor) | macOS: `$ZERO_STATE_DIR/logs/gateway.log` + `gateway.err.log` (padrão: `~/.zero/logs/...`; perfis usam `~/.zero-<profile>/logs/...`)<br>Linux: `journalctl --user -u zero-gateway[-<profile>].service -n 200 --no-pager`<br>Windows: `schtasks /Query /TN "ZERO Gateway (<profile>)" /V /FO LIST` |
| Arquivos de sessão | `$ZERO_STATE_DIR/agents/<agentId>/sessions/` |
| Cache de mídia | `$ZERO_STATE_DIR/media/` |
| Credenciais | `$ZERO_STATE_DIR/credentials/` |

## Verificação de Saúde (Health Check)

```bash
# Supervisor + alvo da sonda + caminhos de config
zero gateway status
# Inclui varreduras de nível de sistema (serviços legados/extras, ouvintes de porta)
zero gateway status --deep

# O gateway é alcançável?
zero health --json
# Se falhar, reexecute com detalhes de conexão:
zero health --verbose

# Algo está escutando na porta padrão?
lsof -nP -iTCP:18789 -sTCP:LISTEN

# Atividade recente (tail de log RPC)
zero logs --follow
# Fallback se RPC estiver fora do ar
tail -20 /tmp/zero/zero-*.log
```

## Resetar Tudo

Opção nuclear:

```bash
zero gateway stop
# Se você instalou um serviço e quer uma instalação limpa:
# zero gateway uninstall

trash "${ZERO_STATE_DIR:-$HOME/.zero}"
zero channels login         # re-parear WhatsApp
zero gateway restart           # ou: zero gateway
```

⚠️ Isso perde todas as sessões e requer re-emparelhamento do WhatsApp.

## Obtendo Ajuda

1. Verifique logs primeiro: `/tmp/zero/` (padrão: `zero-YYYY-MM-DD.log`, ou seu `logging.file` configurado)
2. Pesquise issues existentes no GitHub
3. Abra uma nova issue com:
   - Versão do ZERO
   - Trechos de log relevantes
   - Passos para reproduzir
   - Sua configuração (redija segredos!)

---

*"Você tentou desligar e ligar de novo?"* — Toda pessoa de TI, sempre

∅🔧

### Navegador Não Iniciando (Linux)

Se você vir `"Failed to start Chrome CDP on port 18800"`:

**Causa mais provável:** Chromium empacotado via Snap no Ubuntu.

**Correção rápida:** Instale o Google Chrome:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

Então defina na config:

```json
{
  "browser": {
    "executablePath": "/usr/bin/google-chrome-stable"
  }
}
```

**Guia completo:** Veja [solução de problemas de navegador linux](/tools/browser-linux-troubleshooting)
