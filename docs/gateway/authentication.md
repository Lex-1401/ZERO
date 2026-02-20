---
summary: "Autenticação de modelos: OAuth, chaves de API e reutilização de tokens do Claude Code"
read_when:
  - Depurando a autenticação de modelos ou expiração de OAuth
  - Documentando o armazenamento de autenticação ou credenciais
---
# Autenticação

O ZERO suporta OAuth e chaves de API para os provedores de modelos. Para contas da Anthropic, recomendamos o uso de uma **chave de API**. O ZERO também pode reutilizar credenciais do Claude Code, incluindo o token de longa duração criado pelo comando `claude setup-token`.

Veja [/concepts/oauth](/concepts/oauth) para o fluxo OAuth completo e o layout de armazenamento.

## Configuração recomendada para Anthropic (chave de API)

Se você estiver usando a Anthropic diretamente, utilize uma chave de API.

1) Crie uma chave de API no Console da Anthropic.
2) Coloque-a no **host do gateway** (a máquina que executa o `zero gateway`).

```bash
export ANTHROPIC_API_KEY="..."
zero models status
```

1) Se o Gateway rodar sob o systemd/launchd, prefira colocar a chave no arquivo `~/.zero/.env` para que o daemon possa lê-la:

```bash
cat >> ~/.zero/.env <<'EOF'
ANTHROPIC_API_KEY=...
EOF
```

Em seguida, reinicie o daemon (ou o seu processo do Gateway) e verifique novamente:

```bash
zero models status
zero doctor
```

Se você preferir não gerenciar as variáveis de ambiente manualmente, o assistente de integração pode armazenar as chaves de API para uso do daemon: `zero onboard`.

Veja [Ajuda](/help) para detalhes sobre a herança de ambiente (`env.shellEnv`, `~/.zero/.env`, systemd/launchd).

## Anthropic: Configuração do setup-token da CLI do Claude Code (suportado)

Para a Anthropic, o caminho recomendado é uma **chave de API**. Se você já usa a CLI do Claude Code, o fluxo de `setup-token` também é suportado. Execute-o no **host do gateway**:

```bash
claude setup-token
```

Em seguida, verifique e sincronize com o ZERO:

```bash
zero models status
zero doctor
```

Isso deve criar (ou atualizar) um perfil de autenticação como `anthropic:claude-cli` no armazenamento de autenticação do agente.

A configuração do ZERO define o `mode` de `auth.profiles["anthropic:claude-cli"]` como `"oauth"`, para que o perfil aceite credenciais de OAuth e de `setup-token`. Configurações antigas que usavam `"token"` são migradas automaticamente ao carregar.

Se você vir um erro da Anthropic como:

```text
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…utilize uma chave de API da Anthropic em vez disso.

Alternativa: execute o invólucro (também atualiza a configuração do ZERO):

```bash
zero models auth setup-token --provider anthropic
```

Entrada manual de token (qualquer provedor; grava no `auth-profiles.json` + atualiza a configuração):

```bash
zero models auth paste-token --provider anthropic
zero models auth paste-token --provider openrouter
```

Verificação amigável para automação (sai com `1` quando expirado/ausente, `2` quando está expirando):

```bash
zero models status --check
```

Scripts de operações opcionais (systemd/Termux) estão documentados aqui: [/automation/auth-monitoring](/automation/auth-monitoring)

O comando `zero models status` carrega as credenciais do Claude Code no `auth-profiles.json` do ZERO e mostra a expiração (avisa dentro de 24h por padrão). O comando `zero doctor` também realiza a sincronização quando é executado.

> `claude setup-token` requer um terminal interativo (TTY).

## Verificando o status da autenticação de modelos

```bash
zero models status
zero doctor
```

## Controlando qual credencial é usada

### Por sessão (comando de chat)

Use `/model <alias-ou-id>@<profileId>` para fixar uma credencial de provedor específica para a sessão atual (IDs de perfil de exemplo: `anthropic:claude-cli`, `anthropic:default`).

Use `/model` (ou `/model list`) para um seletor compacto; use `/model status` para a visão completa (candidatos + próximo perfil de autenticação, além de detalhes do endpoint do provedor quando configurado).

### Por agente (sobrescrita via CLI)

Defina uma sobrescrita explícita da ordem do perfil de autenticação para um agente (armazenada no `auth-profiles.json` desse agente):

```bash
zero models auth order get --provider anthropic
zero models auth order set --provider anthropic anthropic:claude-cli
zero models auth order clear --provider anthropic
```

Use `--agent <id>` para visar um agente específico; omita-o para usar o agente padrão configurado.

## Como funciona a sincronização

1. O **Claude Code** armazena as credenciais em `~/.claude/.credentials.json` (ou no Keychain no macOS).
2. O **ZERO** as sincroniza para `~/.zero/agents/<agentId>/agent/auth-profiles.json` quando o armazenamento de autenticação é carregado.
3. Perfis OAuth atualizáveis podem ser atualizados automaticamente no momento do uso. Perfis de token estático (incluindo o `setup-token` da CLI do Claude Code) não podem ser atualizados pelo ZERO.

## Solução de problemas

### “No credentials found” (Nenhuma credencial encontrada)

Se o perfil de token da Anthropic estiver ausente, execute `claude setup-token` no **host do gateway** e verifique novamente:

```bash
zero models status
```

### Token expirando/expirado

Execute `zero models status` para confirmar qual perfil está expirando. Se o perfil for `anthropic:claude-cli`, execute novamente o comando `claude setup-token`.

## Requisitos

- Assinatura Claude Max ou Pro (para o `claude setup-token`).
- CLI do Claude Code instalada (comando `claude` disponível).
