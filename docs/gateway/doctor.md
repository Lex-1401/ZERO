---
summary: "Comando doctor: verificações de saúde, migrações de configuração e etapas de reparo"
read_when:
  - Adicionando ou modificando migrações do doctor
  - Introduzindo mudanças de configuração que quebram a compatibilidade
---

# Doctor

`zero doctor` é a ferramenta de reparo + migração do ZERO. Ela corrige configurações/estados obsoletos, verifica a saúde do sistema e fornece etapas de reparo acionáveis.

## Início rápido

```bash
zero doctor
```

### Headless / automação

```bash
zero doctor --yes
```

Aceita os padrões sem perguntar (incluindo as etapas de reparo de reinicialização/serviço/sandbox quando aplicável).

```bash
zero doctor --repair
```

Aplica os reparos recomendados sem perguntar (reparos + reinicializações onde for seguro).

```bash
zero doctor --repair --force
```

Aplica também reparos agressivos (sobrescreve configurações personalizadas do supervisor).

```bash
zero doctor --non-interactive
```

Executa sem avisos e aplica apenas migrações seguras (normalização de configuração + movimentação de estado no disco). Ignora ações de reinicialização/serviço/sandbox que requerem confirmação humana. As migrações de estado legado são executadas automaticamente quando detectadas.

```bash
zero doctor --deep
```

Verifica os serviços do sistema em busca de instalações extras de gateway (launchd/systemd/schtasks).

Se você quiser revisar as alterações antes de gravar, abra o arquivo de configuração primeiro:

```bash
cat ~/.zero/zero.json
```

## O que ele faz (resumo)

- Atualização pré-voo opcional para instalações via git (apenas interativo).
- Verificação de atualização do protocolo da UI (reconstrói a UI de Controle quando o esquema do protocolo é mais recente).
- Verificação de saúde + aviso de reinicialização.
- Resumo do status das habilidades (Skills) (elegíveis/ausentes/bloqueadas).
- Normalização de configuração para valores legados.
- Avisos de sobrescrita do provedor OpenCode Zen (`models.providers.opencode`).
- Migração de estado no disco legado (sessões/diretório do agente/autenticação do WhatsApp).
- Verificações de integridade e permissões de estado (sessões, transcrições, diretório de estado).
- Verificações de permissão do arquivo de configuração (chmod 600) ao rodar localmente.
- Saúde da autenticação do modelo: verifica a expiração do OAuth, pode renovar tokens que estão expirando e relata estados de cooldown/desativado do perfil de autenticação.
- Detecção de diretórios de espaço de trabalho extras (`~/zero`).
- Reparo da imagem da sandbox quando o sandboxing está habilitado.
- Migração de serviço legado e detecção de gateway extra.
- Verificações de tempo de execução do Gateway (serviço instalado, mas não rodando; rótulo launchd em cache).
- Avisos de status do canal (sondados a partir do gateway em execução).
- Auditoria de configuração do supervisor (launchd/systemd/schtasks) com reparo opcional.
- Verificações de melhores práticas de tempo de execução do Gateway (Node vs Bun, caminhos do gerenciador de versão).
- Diagnóstico de colisão de porta do Gateway (padrão `18789`).
- Avisos de segurança para políticas de DM abertas.
- Avisos de autenticação do gateway quando nenhum `gateway.auth.token` está definido (modo local; oferece geração de token).
- Verificação de persistência (linger) do systemd no Linux.
- Verificações de instalação a partir do código-fonte (incompatibilidade de espaço de trabalho pnpm, ativos de UI ausentes, binário tsx ausente).
- Grava configuração atualizada + metadados do assistente (wizard).

## Comportamento detalhado e justificativa

### 0) Atualização opcional (instalações git)

Se for uma instalação via git e o doctor estiver sendo executado de forma interativa, ele se oferece para atualizar (fetch/rebase/build) antes de prosseguir.

### 1) Normalização de configuração

Se a configuração contiver formatos de valores legados (por exemplo, `messages.ackReaction` sem uma sobrescrita específica por canal), o doctor os normaliza para o esquema atual.

### 2) Migrações de chaves de configuração legadas

Quando a configuração contiver chaves descontinuadas, outros comandos se recusarão a rodar e pedirão para você executar o `zero doctor`.

O Doctor irá:

- Explicar quais chaves legadas foram encontradas.
- Mostrar a migração que aplicou.
- Reescrever o `~/.zero/zero.json` com o esquema atualizado.

O Gateway também executa automaticamente as migrações do doctor ao iniciar quando detecta um formato de configuração legado, para que as configurações obsoletas sejam reparadas sem intervenção manual.

Migrações atuais:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de nível superior
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`

### 2b) Sobrescritas do provedor OpenCode Zen

Se você adicionou `models.providers.opencode` (ou `opencode-zen`) manualmente, isso sobrescreve o catálogo integrado do OpenCode Zen da `@mariozechner/pi-ai`. Isso pode forçar cada modelo em uma única API ou zerar os custos. O doctor avisa para que você possa remover a sobrescrita e restaurar o roteamento de API por modelo + custos.

### 3) Migrações de estado legado (layout do disco)

O doctor pode migrar layouts de disco mais antigos para a estrutura atual:

- Armazenamento de sessões + transcrições:
  - de `~/.zero/sessions/` para `~/.zero/agents/<agentId>/sessions/`
- Diretório do agente:
  - de `~/.zero/agent/` para `~/.zero/agents/<agentId>/agent/`
- Estado de autenticação do WhatsApp (Baileys):
  - de `~/.zero/credentials/*.json` legado (exceto `oauth.json`)
  - para `~/.zero/credentials/whatsapp/<accountId>/...` (id da conta padrão: `default`)

Estas migrações são baseadas em melhor esforço e são idempotentes; o doctor emitirá avisos quando deixar qualquer pasta legada para trás como backup. O Gateway/CLI também migra automaticamente as sessões legadas + diretório do agente ao iniciar, para que o histórico/autenticação/modelos aterrissem no caminho por agente sem uma execução manual do doctor. A autenticação do WhatsApp é intencionalmente migrada apenas via `zero doctor`.

### 4) Verificações de integridade de estado (persistência de sessão, roteamento e segurança)

O diretório de estado é o "tronco cerebral" operacional. Se ele desaparecer, você perderá sessões, credenciais, registros e configurações (a menos que tenha backups em outro lugar).

O Doctor verifica:

- **Diretório de estado ausente**: avisa sobre a perda catastrófica de estado, solicita a recriação do diretório e lembra que não pode recuperar dados perdidos.
- **Permissões do diretório de estado**: verifica a capacidade de gravação; oferece o reparo das permissões (e emite uma dica de `chown` quando uma incompatibilidade de proprietário/grupo é detectada).
- **Diretórios de sessão ausentes**: `sessions/` e o diretório de armazenamento de sessões são necessários para persistir o histórico e evitar falhas `ENOENT`.
- **Incompatibilidade de transcrição**: avisa quando entradas de sessões recentes têm arquivos de transcrição ausentes.
- **Main session “1-line JSONL”**: flags when the main transcript has only one
  - **Sessão principal “JSONL de 1 linha”**: sinaliza quando a transcrição principal tem apenas uma linha (o histórico não está acumulando).
- **Múltiplos diretórios de estado**: avisa quando existem várias pastas `~/.zero` em diretórios de usuários ou quando `ZERO_STATE_DIR` aponta para outro lugar (o histórico pode se dividir entre as instalações).
- **Lembrete do modo remoto**: se `gateway.mode=remote`, o doctor lembra você de executá-lo no host remoto (o estado reside lá).
- **Permissões do arquivo de configuração**: avisa se o `~/.zero/zero.json` for legível por grupo/mundo e oferece restringir para `600`.

### 5) Saúde da autenticação do modelo (expiração do OAuth)

O doctor inspeciona perfis OAuth no armazenamento de autenticação, avisa quando os tokens estão expirando/expirados e pode renová-los quando for seguro. Se o perfil do Anthropic Claude Code estiver obsoleto, ele sugere executar o `claude setup-token` (ou colar um setup-token). As solicitações de renovação só aparecem ao rodar de forma interativa (TTY); `--non-interactive` pula as tentativas de renovação.

O doctor também relata perfis de autenticação que estão temporariamente inutilizáveis devido a:

- curtos períodos de espera (cooldowns) (limites de taxa/timeouts/falhas de auth)
- exclusões mais longas (falhas de faturamento/crédito)

### 6) Validação do modelo de hooks

Se `hooks.gmail.model` estiver definido, o doctor valida a referência do modelo contra o catálogo e a lista de permissão, e avisa quando ele não puder ser resolvido ou não for permitido.

### 7) Reparo da imagem da sandbox

Quando o sandboxing está habilitado, o doctor verifica as imagens do Docker e oferece a construção ou a troca para nomes legados se a imagem atual estiver ausente.

### 8) Migrações de serviço do Gateway e dicas de limpeza

O doctor detecta serviços de gateway legados (launchd/systemd/schtasks) e se oferece para removê-los e instalar o serviço ZERO usando a porta do gateway atual. Ele também pode procurar por serviços extras semelhantes a gateways e imprimir dicas de limpeza. Os serviços de gateway do ZERO nomeados por perfil são considerados de primeira classe e não são sinalizados como "extras".

### 9) Avisos de segurança

O doctor emite avisos quando um provedor está aberto para DMs sem uma lista de permissão ou quando uma política é configurada de forma perigosa.

### 10) Persistência (linger) do systemd (Linux)

Se estiver rodando como um serviço de usuário do systemd, o doctor garante que a persistência (lingering) esteja habilitada para que o gateway permaneça vivo após o logout.

### 11) Status das habilidades (Skills)

O doctor imprime um resumo rápido das habilidades elegíveis/ausentes/bloqueadas para o espaço de trabalho atual.

### 12) Verificações de autenticação do Gateway (token local)

O doctor avisa quando o `gateway.auth` está ausente em um gateway local e oferece a geração de um token. Use `zero doctor --generate-gateway-token` para forçar a criação do token em automação.

### 13) Verificação de saúde do Gateway + reinicialização

O doctor executa uma verificação de saúde e se oferece para reiniciar o gateway quando ele parecer não saudável.

### 14) Avisos de status de canal

Se o gateway estiver saudável, o doctor executa uma sondagem de status de canal e relata avisos com correções sugeridas.

### 15) Auditoria de configuração do supervisor + reparo

O doctor verifica a configuração instalada do supervisor (launchd/systemd/schtasks) em busca de padrões ausentes ou desatualizados (ex: dependências de rede do systemd e atraso de reinicialização). Quando encontra uma incompatibilidade, ele recomenda uma atualização e pode reescrever o arquivo de serviço/tarefa para os padrões atuais.

Notas:

- `zero doctor` pergunta antes de reescrever a configuração do supervisor.
- `zero doctor --yes` aceita os avisos de reparo padrão.
- `zero doctor --repair` aplica as correções recomendadas sem avisos.
- `zero doctor --repair --force` sobrescreve as configurações personalizadas do supervisor.
- Você sempre pode forçar uma reescrita completa via `zero gateway install --force`.

### 16) Diagnóstico de tempo de execução + porta do Gateway

O doctor inspeciona o tempo de execução do serviço (PID, último status de saída) e avisa quando o serviço está instalado, mas na verdade não está rodando. Ele também verifica colisões na porta do gateway (padrão `18789`) e relata causas prováveis (gateway já em execução, túnel SSH).

### 17) Melhores práticas de tempo de execução do Gateway

O doctor avisa quando o serviço do gateway roda no Bun ou em um caminho Node gerenciado por versão (`nvm`, `fnm`, `volta`, `asdf`, etc.). Os canais do WhatsApp + Telegram requerem Node, e os caminhos do gerenciador de versão podem quebrar após atualizações porque o serviço não carrega o seu arquivo de inicialização do shell. O doctor se oferece para migrar para uma instalação de Node do sistema quando disponível (Homebrew/apt/choco).

### 18) Gravação de configuração + metadados do assistente (wizard)

O doctor persiste quaisquer alterações na configuração e marca os metadados do assistente para registrar a execução do doctor.

### 19) Dicas de espaço de trabalho (backup + sistema de memória)

O doctor sugere um sistema de memória de espaço de trabalho quando ausente e imprime uma dica de backup se o espaço de trabalho ainda não estiver sob controle do git.

Consulte [/concepts/agent-workspace](/concepts/agent-workspace) para um guia completo sobre a estrutura do espaço de trabalho e backup via git (recomenda-se GitHub ou GitLab privados).
