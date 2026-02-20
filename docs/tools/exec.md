---
summary: "Uso da ferramenta exec, modos stdin e suporte a TTY"
read_when:
  - Usando ou modificando a ferramenta exec
  - Depurando comportamento de stdin ou TTY
---

# Ferramenta Exec

Execute comandos shell no espaço de trabalho. Suporta execução em primeiro plano + segundo plano via `process`.
Se `process` for proibido, `exec` roda de forma síncrona e ignora `yieldMs`/`background`.
Sessões em segundo plano são escopadas por agente; `process` vê apenas sessões do mesmo agente.

## Parâmetros

- `command` (obrigatório)
- `workdir` (padroniza para cwd)
- `env` (substituições de chave/valor)
- `yieldMs` (padrão 10000): background automático após atraso
- `background` (bool): background imediatamente
- `timeout` (segundos, padrão 1800): matar ao expirar
- `pty` (bool): rodar em um pseudo-terminal quando disponível (CLIs somente TTY, agentes de código, UIs de terminal)
- `host` (`sandbox | gateway | node`): onde executar
- `security` (`deny | allowlist | full`): modo de imposição para `gateway`/`node`
- `ask` (`off | on-miss | always`): prompts de aprovação para `gateway`/`node`
- `node` (string): id/nome do nó para `host=node`
- `elevated` (bool): solicitar modo elevado (host gateway); `security=full` só é forçado quando elevado resolve para `full`

Notas:

- `host` padroniza para `sandbox`.
- `elevated` é ignorado quando sandboxing está desligado (exec já roda no host).
- Aprovações de `gateway`/`node` são controladas por `~/.zero/exec-approvals.json`.
- `node` requer um nó pareado (app companheiro ou host de nó headless).
- Se múltiplos nós estiverem disponíveis, defina `exec.node` ou `tools.exec.node` para selecionar um.
- Em hosts não-Windows, exec usa `SHELL` quando definido; se `SHELL` for `fish`, prefere `bash` (ou `sh`)
  do `PATH` para evitar scripts incompatíveis com fish, então recorre a `SHELL` se nenhum existir.

## Configuração

- `tools.exec.notifyOnExit` (padrão: true): quando true, sessões exec em segundo plano enfileiram um evento de sistema e solicitam um heartbeat ao sair.
- `tools.exec.approvalRunningNoticeMs` (padrão: 10000): emitir um único aviso “running” quando um exec controlado por aprovação rodar por mais tempo que isso (0 desativa).
- `tools.exec.host` (padrão: `sandbox`)
- `tools.exec.security` (padrão: `deny` para sandbox, `allowlist` para gateway + nó quando não definido)
- `tools.exec.ask` (padrão: `on-miss`)
- `tools.exec.node` (padrão: não definido)
- `tools.exec.pathPrepend`: lista de diretórios para anexar ao início do `PATH` para execuções exec.
- `tools.exec.safeBins`: binários seguros somente-stdin que podem rodar sem entradas explícitas na lista de permissão.

Exemplo:

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"]
    }
  }
}
```

### Tratamento de PATH

- `host=gateway`: mescla seu `PATH` de shell de login no ambiente exec (a menos que a chamada exec
  já defina `env.PATH`). O daemon em si ainda roda com um `PATH` mínimo:
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: roda `sh -lc` (shell de login) dentro do contêiner, então `/etc/profile` pode redefinir `PATH`.
  ZERO anexa `env.PATH` ao início após sourcing do perfil; `tools.exec.pathPrepend` aplica-se aqui também.
- `host=node`: apenas substituições de env que você passa são enviadas para o nó. `tools.exec.pathPrepend` só se aplica
  se a chamada exec já definir `env.PATH`. Hosts de nó headless aceitam `PATH` apenas quando ele anexa ao início
  do PATH do host de nó (sem substituição). Nós macOS descartam substituições de `PATH` inteiramente.

Vínculo de nó por agente (use o índice da lista de agentes na configuração):

```bash
zero config get agents.list
zero config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI: a aba Nodes inclui um pequeno painel “Exec node binding” para as mesmas configurações.

## Substituições de sessão (`/exec`)

Use `/exec` para definir padrões **por sessão** para `host`, `security`, `ask` e `node`.
Envie `/exec` sem argumentos para mostrar os valores atuais.

Exemplo:

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## Aprovações de Exec (app companheiro / host de nó)

Agentes em sandbox podem exigir aprovação por solicitação antes que `exec` rode no gateway ou host de nó.
Veja [Exec approvals](/tools/exec-approvals) para a política, lista de permissão e fluxo de UI.

Quando aprovações são necessárias, a ferramenta exec retorna imediatamente com
`status: "approval-pending"` e um id de aprovação. Uma vez aprovado (ou negado / tempo esgotado),
o Gateway emite eventos de sistema (`Exec finished` / `Exec denied`). Se o comando ainda estiver
rodando após `tools.exec.approvalRunningNoticeMs`, um único aviso `Exec running` é emitido.

## Lista de permissão + binários seguros

A imposição de lista de permissão corresponde a **caminhos de binários resolvidos apenas** (sem correspondências de nome base). Quando
`security=allowlist`, comandos shell são auto-permitidos apenas se cada segmento do pipeline for
permitido ou um binário seguro. Encadeamento (`;`, `&&`, `||`) e redirecionamentos são rejeitados no
modo lista de permissão.

## Exemplos

Primeiro plano:

```json
{"tool":"exec","command":"ls -la"}
```

Segundo plano + poll:

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

Enviar teclas (estilo tmux):

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

Enviar (enviar apenas CR):

```json
{"tool":"process","action":"submit","sessionId":"<id>"}
```

Colar (entre colchetes por padrão):

```json
{"tool":"process","action":"paste","sessionId":"<id>","text":"line1\nline2\n"}
```

## apply_patch (experimental)

`apply_patch` é uma subferramenta de `exec` para edições multi-arquivo estruturadas.
Ative-a explicitamente:

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, allowModels: ["gpt-5.2"] }
    }
  }
}
```

Notas:

- Apenas disponível para modelos OpenAI/OpenAI Codex.
- A política de ferramenta ainda se aplica; `allow: ["exec"]` permite implicitamente `apply_patch`.
- Configuração reside em `tools.exec.applyPatch`.
