---
summary: "Como funciona o sandboxing do ZERO: modos, escopos, acesso ao workspace e imagens"
read_when: "Você deseja uma explicação dedicada sobre sandboxing ou precisa ajustar agents.defaults.sandbox."
status: active
---

# Sandboxing

O ZERO pode executar **ferramentas dentro de contêineres Docker** para reduzir o raio de alcance (blast radius) de possíveis danos. Isso é **opcional** e controlado pela configuração (`agents.defaults.sandbox` ou `agents.list[].sandbox`). Se o sandboxing estiver desligado, as ferramentas rodam no host.

O Gateway permanece no host; a execução das ferramentas ocorre em uma sandbox isolada quando habilitada.

Este não é um limite de segurança perfeito, mas limita materialmente o acesso ao sistema de arquivos e aos processos quando o modelo faz algo inesperado.

## O que entra em sandbox

- Execução de ferramentas (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navegador em sandbox opcional (`agents.defaults.sandbox.browser`).
  - Por padrão, o navegador da sandbox inicia automaticamente (garantindo que o CDP esteja acessível) quando a ferramenta de navegador precisa dele.
    Configure via `agents.defaults.sandbox.browser.autoStart` e `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
  - `agents.defaults.sandbox.browser.allowHostControl` permite que sessões em sandbox controlem explicitamente o navegador do host.
  - Listas de permissão (allowlists) opcionais controlam o `target: "custom"`: `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

Não entra em sandbox:

- O próprio processo do Gateway.
- Qualquer ferramenta explicitamente permitida para rodar no host (ex: `tools.elevated`).
  - **A execução elevada (elevated exec) roda no host e ignora o sandboxing.**
  - Se o sandboxing estiver desligado, `tools.elevated` não altera a execução (já está no host). Veja [Modo Elevated](/tools/elevated).

## Modos

`agents.defaults.sandbox.mode` controla **quando** o sandboxing é utilizado:

- `"off"`: sem sandboxing.
- `"non-main"`: sandbox apenas para sessões que **não sejam a principal (non-main)** (padrão se você deseja chats normais no host).
- `"all"`: cada sessão roda em uma sandbox.
Nota: `"non-main"` baseia-se na chave `session.mainKey` (padrão `"main"`), não no ID do agente. Sessões de grupos/canais usam suas próprias chaves, portanto contam como non-main e entrarão em sandbox.

## Escopo

`agents.defaults.sandbox.scope` controla **quantos contêineres** são criados:

- `"session"` (padrão): um contêiner por sessão.
- `"agent"`: um contêiner por agente.
- `"shared"`: um contêiner compartilhado por todas as sessões em sandbox.

## Acesso ao workspace

`agents.defaults.sandbox.workspaceAccess` controla **o que a sandbox pode ver**:

- `"none"` (padrão): as ferramentas veem um workspace de sandbox em `~/.zero/sandboxes`.
- `"ro"`: monta o workspace do agente como somente leitura em `/agent` (desativa `write`/`edit`/`apply_patch`).
- `"rw"`: monta o workspace do agente como leitura/escrita em `/workspace`.

Mídias recebidas são copiadas para o workspace da sandbox ativa (`media/inbound/*`).
Nota sobre habilidades (skills): a ferramenta `read` tem sua raiz na sandbox. Com `workspaceAccess: "none"`, o ZERO espelha habilidades elegíveis no workspace da sandbox (`.../skills`) para que possam ser lidas. Com `"rw"`, as habilidades do workspace são legíveis em `/workspace/skills`.

## Montagens de vínculo (bind mounts) personalizadas

`agents.defaults.sandbox.docker.binds` monta diretórios adicionais do host dentro do contêiner.
Formato: `host:container:mode` (ex: `"/home/user/source:/source:rw"`).

Vínculos globais e por agente são **mesclados** (não substituídos). Sob o escopo `"shared"`, os vínculos por agente são ignorados.

Exemplo (código-fonte somente leitura + socket do docker):

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: [
            "/home/user/source:/source:ro",
            "/var/run/docker.sock:/var/run/docker.sock"
          ]
        }
      }
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"]
          }
        }
      }
    ]
  }
}
```

Notas de segurança:

- Os vínculos (binds) ignoram o sistema de arquivos da sandbox: eles expõem caminhos do host com o modo que você definir (`:ro` ou `:rw`).
- Montagens sensíveis (ex: `docker.sock`, segredos, chaves SSH) devem ser `:ro`, a menos que estritamente necessário.
- Combine com `workspaceAccess: "ro"` se precisar apenas de acesso de leitura ao workspace; os modos de vínculo permanecem independentes.
- Veja [Sandbox vs Política de Ferramentas vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) para entender como os vínculos interagem com a política de ferramentas e a execução elevada.

## Imagens + configuração (setup)

Imagem padrão: `zero-sandbox:bookworm-slim`

Construa a imagem uma vez:

```bash
scripts/sandbox-setup.sh
```

Nota: a imagem padrão **não** inclui o Node. Se uma habilidade precisar de Node (ou outros runtimes), você deve criar uma imagem personalizada ou instalar via `sandbox.docker.setupCommand` (requer saída de rede + raiz gravável + usuário root).

Imagem do navegador em sandbox:

```bash
scripts/sandbox-browser-setup.sh
```

Por padrão, os contêineres de sandbox funcionam **sem rede**.
Sobrescreva com `agents.defaults.sandbox.docker.network`.

As instalações do Docker e o gateway conteinerizado residem aqui:
[Docker](/install/docker)

## setupCommand (configuração única do contêiner)

O `setupCommand` roda **uma vez** após o contêiner da sandbox ser criado (não em cada execução).
Ele é executado dentro do contêiner via `sh -lc`.

Caminhos:

- Global: `agents.defaults.sandbox.docker.setupCommand`
- Por agente: `agents.list[].sandbox.docker.setupCommand`

### Armadilhas comuns (pitfalls)

- O `docker.network` padrão é `"none"` (sem saída de rede), portanto a instalação de pacotes falhará.
- `readOnlyRoot: true` impede gravações; defina `readOnlyRoot: false` ou crie uma imagem personalizada.
- O `user` deve ser root para instalações de pacotes (omita `user` ou defina `user: "0:0"`).
- A execução na sandbox **não** herda o `process.env` do host. Use `agents.defaults.sandbox.docker.env` (ou uma imagem personalizada) para chaves de API de habilidades.

## Política de ferramentas + válvulas de escape

As políticas de permitir/negar ferramentas ainda se aplicam antes das regras da sandbox. Se uma ferramenta for negada globalmente ou por agente, o sandboxing não a trará de volta.

`tools.elevated` é uma válvula de escape explícita que executa o `exec` no host.

Depuração:

- Use `zero sandbox explain` para inspecionar o modo de sandbox efetivo, a política de ferramentas e as chaves de configuração para correção.
- Veja [Sandbox vs Política de Ferramentas vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) para entender o modelo mental de "por que isso está bloqueado?".

Mantenha as configurações restritas.

## Sobrescritas multi-agente

Cada agente pode sobrescrever o sandbox + ferramentas:
`agents.list[].sandbox` e `agents.list[].tools` (além de `agents.list[].tools.sandbox.tools` para política de ferramentas da sandbox).
Veja [Sandbox & Ferramentas Multi-Agente](/multi-agent-sandbox-tools) para precedência.

## Exemplo mínimo de ativação

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none"
      }
    }
  }
}
```

## Documentos relacionados

- [Configuração da Sandbox](/gateway/configuration#agentsdefaults-sandbox)
- [Sandbox & Ferramentas Multi-Agente](/multi-agent-sandbox-tools)
- [Segurança](/gateway/security)
