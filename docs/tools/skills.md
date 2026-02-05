---
summary: "Habilidades (Skills): gerenciadas vs workspace, regras de bloqueio e configuração/env"
read_when:
  - Adicionando ou modificando habilidades
  - Alterando regras de bloqueio ou carregamento de habilidades
---

# Habilidades (Skills) - ZERO

O ZERO usa pastas de habilidades **compatíveis com [AgentSkills](https://agentskills.io)** para ensinar ao agente como usar ferramentas. Cada habilidade é um diretório contendo um `SKILL.md` com frontmatter YAML e instruções. O ZERO carrega **habilidades empacotadas** mais substituições locais opcionais, e as filtra no tempo de carregamento com base no ambiente, configuração e presença de binários.

## Locais e precedência

Habilidades são carregadas de **três** lugares:

1) **Habilidades empacotadas**: enviadas com a instalação (pacote npm ou ZERO.app)
2) **Habilidades gerenciadas/locais**: `~/.zero/skills`
3) **Habilidades de workspace**: `<workspace>/skills`

Se um nome de habilidade conflitar, a precedência é:

`<workspace>/skills` (mais alta) → `~/.zero/skills` → habilidades empacotadas (mais baixa)

Além disso, você pode configurar pastas de habilidades extras (precedência mais baixa) via
`skills.load.extraDirs` em `~/.zero/zero.json`.

## Habilidades por agente vs compartilhadas

Em configurações **multi-agente**, cada agente tem seu próprio workspace. Isso significa:

- **Habilidades por agente** residem em `<workspace>/skills` apenas para aquele agente.
- **Habilidades compartilhadas** residem em `~/.zero/skills` (gerenciadas/locais) e são visíveis
  para **todos os agentes** na mesma máquina.
- **Pastas compartilhadas** também podem ser adicionadas via `skills.load.extraDirs` (precedência
  mais baixa) se você quiser um pacote de habilidades comum usado por múltiplos agentes.

Se o mesmo nome de habilidade existir em mais de um lugar, a precedência usual
se aplica: workspace vence, depois gerenciada/local, depois empacotada.

## Plugins + habilidades

Plugins podem enviar suas próprias habilidades listando diretórios `skills` em
`zero.plugin.json` (caminhos relativos à raiz do plugin). Habilidades de plugin carregam
quando o plugin é habilitado e participam das regras normais de precedência de habilidades.
Você pode bloqueá-las via `metadata.zero.requires.config` na entrada de configuração do plugin.
Veja [Plugins](/plugin) para descoberta/configuração e [Ferramentas](/tools) para a
superfície de ferramenta que essas habilidades ensinam.

## ZeroHub (instalar + sincronizar)

ZeroHub é o registro público de habilidades para ZERO. Navegue em
<https://zerohub.com>. Use-o para descobrir, instalar, atualizar e fazer backup de habilidades.
Guia completo: [ZeroHub](/tools/zerohub).

Fluxos comuns:

- Instalar uma habilidade no seu workspace:
  - `zerohub install <skill-slug>`
- Atualizar todas as habilidades instaladas:
  - `zerohub update --all`
- Sincronizar (escanear + publicar atualizações):
  - `zerohub sync --all`

Por padrão, `zerohub` instala em `./skills` sob seu diretório de trabalho atual
(ou recorre ao workspace configurado do ZERO). O ZERO capta
isso como `<workspace>/skills` na próxima sessão.

## Formato (AgentSkills + compatível com Pi)

`SKILL.md` deve incluir pelo menos:

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

Notas:

- Seguimos a especificação AgentSkills para layout/intenção.
- O parser usado pelo agente embarcado suporta apenas chaves de frontmatter de **linha única**.
- `metadata` deve ser um **objeto JSON de linha única**.
- Use `{baseDir}` nas instruções para referenciar o caminho da pasta da habilidade.
- Chaves de frontmatter opcionais:
  - `homepage` — URL apresentada como “Website” na UI de Skills do macOS (também suportada via `metadata.zero.homepage`).
  - `user-invocable` — `true|false` (padrão: `true`). Quando `true`, a habilidade é exposta como um slash command de usuário.
  - `disable-model-invocation` — `true|false` (padrão: `false`). Quando `true`, a habilidade é excluída do prompt do modelo (ainda disponível via invocação de usuário).
  - `command-dispatch` — `tool` (opcional). Quando definido como `tool`, o slash command ignora o modelo e despacha diretamente para uma ferramenta.
  - `command-tool` — nome da ferramenta para invocar quando `command-dispatch: tool` está definido.
  - `command-arg-mode` — `raw` (padrão). Para despacho de ferramenta, encaminha a string de argumentos brutos para a ferramenta (sem parsing do core).

    A ferramenta é invocada com params:
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`.

## Bloqueio (filtros em tempo de carga)

O ZERO **filtra habilidades em tempo de carga** usando `metadata` (JSON de linha única):

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
metadata: {"zero":{"requires":{"bins":["uv"],"env":["GEMINI_API_KEY"],"config":["browser.enabled"]},"primaryEnv":"GEMINI_API_KEY"}}
---
```

Campos sob `metadata.zero`:

- `always: true` — sempre incluir a habilidade (pula outros bloqueios).
- `emoji` — emoji opcional usado pela UI de Skills do macOS.
- `homepage` — URL opcional mostrada como “Website” na UI de Skills do macOS.
- `os` — lista opcional de plataformas (`darwin`, `linux`, `win32`). Se definida, a habilidade é elegível apenas nesses OSes.
- `requires.bins` — lista; cada um deve existir no `PATH`.
- `requires.anyBins` — lista; pelo menos um deve existir no `PATH`.
- `requires.env` — lista; a variável de ambiente deve existir **ou** ser fornecida na configuração.
- `requires.config` — lista de caminhos `zero.json` que devem ser verdadeiros.
- `primaryEnv` — nome da variável de ambiente associada com `skills.entries.<name>.apiKey`.
- `install` — array opcional de especificações de instalador usadas pela UI de Skills do macOS (brew/node/go/uv/download).

Nota sobre sandboxing:

- `requires.bins` é verificado no **host** no tempo de carga da habilidade.
- Se um agente está em sandbox, o binário também deve existir **dentro do contêiner**.
  Instale-o via `agents.defaults.sandbox.docker.setupCommand` (ou uma imagem personalizada).
  `setupCommand` roda uma vez após o contêiner ser criado.
  Instalações de pacotes também requerem saída de rede, um FS raiz gravável e um usuário root no sandbox.
  Exemplo: a habilidade `summarize` (`skills/summarize/SKILL.md`) precisa da CLI `summarize`
  no contêiner sandbox para rodar lá.

Exemplo de instalador:

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: {"zero":{"emoji":"♊️","requires":{"bins":["gemini"]},"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"],"label":"Install Gemini CLI (brew)"}]}}
---
```

Notas:

- Se múltiplos instaladores forem listados, o gateway escolhe uma **única** opção preferida (brew quando disponível, caso contrário node).
- Se todos os instaladores forem `download`, o ZERO lista cada entrada para que você possa ver os artefatos disponíveis.
- Especificações de instalador podem incluir `os: ["darwin"|"linux"|"win32"]` para filtrar opções por plataforma.
- Instalações Node honram `skills.install.nodeManager` em `zero.json` (padrão: npm; opções: npm/pnpm/yarn/bun).
  Isso afeta apenas **instalações de habilidade**; o runtime do Gateway ainda deve ser Node
  (Bun não é recomendado para WhatsApp/Telegram).
- Instalações Go: se `go` estiver faltando e `brew` estiver disponível, o gateway instala Go via Homebrew primeiro e define `GOBIN` para o `bin` do Homebrew quando possível.
- Instalações Download: `url` (obrigatório), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (padrão: auto quando arquivo detectado), `stripComponents`, `targetDir` (padrão: `~/.zero/tools/<skillKey>`).

Se nenhum `metadata.zero` estiver presente, a habilidade é sempre elegível (a menos que
desativada na configuração ou bloqueada por `skills.allowBundled` para habilidades empacotadas).

## Substituições de configuração (`~/.zero/zero.json`)

Habilidades empacotadas/gerenciadas podem ser alternadas e supridas com valores de ambiente:

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE"
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

Nota: se o nome da habilidade contiver hifens, cite a chave (JSON5 permite chaves citadas).

Chaves de configuração correspondem ao **nome da habilidade** por padrão. Se uma habilidade definir
`metadata.zero.skillKey`, use essa chave sob `skills.entries`.

Regras:

- `enabled: false` desativa a habilidade mesmo se estiver empacotada/instalada.
- `env`: injetado **apenas se** a variável já não estiver definida no processo.
- `apiKey`: conveniência para habilidades que declaram `metadata.zero.primaryEnv`.
- `config`: bolsa opcional para campos personalizados por habilidade; chaves personalizadas devem viver aqui.
- `allowBundled`: lista de permissão opcional apenas para habilidades **empacotadas**. Se definida, apenas
  habilidades empacotadas na lista são elegíveis (habilidades gerenciadas/de workspace não são afetadas).

## Injeção de ambiente (por execução de agente)

Quando uma execução de agente começa, o ZERO:

1) Lê metadados de habilidade.
2) Aplica qualquer `skills.entries.<key>.env` ou `skills.entries.<key>.apiKey` ao
   `process.env`.
3) Constrói o prompt do sistema com habilidades **elegíveis**.
4) Restaura o ambiente original após o fim da execução.

Isso é **escopado para a execução do agente**, não um ambiente shell global.

## Snapshot de sessão (performance)

O ZERO faz snapshot das habilidades elegíveis **quando uma sessão começa** e reutiliza essa lista para turnos subsequentes na mesma sessão. Alterações em habilidades ou configuração entram em vigor na próxima nova sessão.

Habilidades também podem atualizar no meio da sessão quando o observador de habilidades está ativado ou quando um novo nó remoto elegível aparece (veja abaixo). Pense nisso como um **hot reload**: a lista atualizada é captada no próximo turno do agente.

## Nós remotos macOS (gateway Linux)

Se o Gateway está rodando em Linux mas um **nó macOS** está conectado **com `system.run` permitido** (segurança de aprovações de Exec não definida como `deny`), o ZERO pode tratar habilidades exclusivas de macOS como elegíveis quando os binários necessários estão presentes naquele nó. O agente deve executar essas habilidades via a ferramenta `nodes` (tipicamente `nodes.run`).

Isso depende do nó relatar seu suporte a comandos e de uma sonda bin via `system.run`. Se o nó macOS ficar offline depois, as habilidades permanecem visíveis; invocações podem falhar até que o nó reconecte.

## Observador de habilidades (auto-refresh)

Por padrão, o ZERO observa pastas de habilidades e atualiza o snapshot de habilidades quando arquivos `SKILL.md` mudam. Configure isso sob `skills.load`:

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250
    }
  }
}
```

## Impacto de Tokens (lista de habilidades)

Quando habilidades são elegíveis, o ZERO injeta uma lista XML compacta de habilidades disponíveis no prompt do sistema (via `formatSkillsForPrompt` no `pi-coding-agent`). O custo é determinístico:

- **Overhead base (apenas quando ≥1 habilidade):** 195 caracteres.
- **Por habilidade:** 97 caracteres + o comprimento dos valores `<name>`, `<description>` e `<location>` escapados em XML.

Fórmula (caracteres):

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notas:

- O escape XML expande `& < > " '` em entidades (`&amp;`, `&lt;`, etc.), aumentando o comprimento.
- Contagens de tokens variam por tokenizer de modelo. Uma estimativa grosseira estilo OpenAI é ~4 caracteres/token, então **97 caracteres ≈ 24 tokens** por habilidade mais seus comprimentos reais de campo.

## Ciclo de vida de habilidades gerenciadas

O ZERO envia um conjunto básico de habilidades como **habilidades empacotadas** como parte da
instalação (pacote npm ou ZERO.app). `~/.zero/skills` existe para local
substituições (por exemplo, fixar/fazer patch de uma habilidade sem mudar a cópia
empacotada). Habilidades de workspace são propriedade do usuário e substituem ambas em conflitos de nome.

## Referência de configuração

Veja [Configuração de Habilidades](/tools/skills-config) para o esquema de configuração completo.

## Procurando por mais habilidades?

Navegue em <https://zerohub.com>.

---
