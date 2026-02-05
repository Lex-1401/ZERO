---
summary: "Referência CLI para `zero update` (atualização de fonte semi-segura + auto-restart de gateway)"
read_when:
  - Você quer atualizar um checkout fonte com segurança
  - Você precisa entender o comportamento do atalho `--update`
---

# `zero update`

Atualize ZERO com segurança e troque entre canais stable/beta/dev.

Se você instalou via **npm/pnpm** (instalação global, sem metadados git), atualizações acontecem via fluxo do gerenciador de pacotes em [Atualizando](/install/updating).

## Uso

```bash
zero update
zero update status
zero update wizard
zero update --channel beta
zero update --channel dev
zero update --tag beta
zero update --no-restart
zero update --json
zero --update
```

## Opções

- `--no-restart`: pular reinicio do serviço Gateway após uma atualização bem sucedida.
- `--channel <stable|beta|dev>`: definir o canal de atualização (git + npm; persistido na config).
- `--tag <dist-tag|version>`: sobrescrever a dist-tag ou versão npm apenas para esta atualização.
- `--json`: imprimir JSON `UpdateRunResult` legível por máquina.
- `--timeout <segundos>`: timeout por etapa (padrão é 1200s).

Nota: downgrades requerem confirmação porque versões mais antigas podem quebrar a configuração.

## `update status`

Mostra o canal de atualização ativo + git tag/branch/SHA (para checkouts fonte), mais disponibilidade de atualização.

```bash
zero update status
zero update status --json
zero update status --timeout 10
```

Opções:

- `--json`: imprimir JSON de status legível por máquina.
- `--timeout <segundos>`: timeout para checagens (padrão é 3s).

## `update wizard`

Fluxo interativo para escolher um canal de atualização e confirmar se deve reiniciar o Gateway
após atualizar (padrão é reiniciar). Se você selecionar `dev` sem um checkout git, ele
oferece para criar um.

## O que faz

Quando você troca canais explicitamente (`--channel ...`), ZERO também mantém o
método de instalação alinhado:

- `dev` → garante um checkout git (padrão: `~/zero`, sobrescreva com `ZERO_GIT_DIR`),
  atualiza-o, e instala a CLI global a partir desse checkout.
- `stable`/`beta` → instala do npm usando a dist-tag correspondente.

## Fluxo de checkout Git

Canais:

- `stable`: checkout da última tag não-beta, então build + doctor.
- `beta`: checkout da última tag `-beta`, então build + doctor.
- `dev`: checkout `main`, então fetch + rebase.

Alto nível:

1. Requer uma worktree limpa (sem mudanças não commitadas).
2. Troca para o canal selecionado (tag ou branch).
3. Busca upstream (apenas dev).
4. Apenas dev: preflight lint + build TypeScript em uma worktree temporária; se a ponta falhar, volta até 10 commits para encontrar a build limpa mais nova.
5. Rebase na commit selecionada (apenas dev).
6. Instala dependências (pnpm preferido; fallback npm).
7. Buils + constrói a UI de Controle.
8. Roda `zero doctor` como a checagem final de "atualização segura".
9. Sincroniza plugins para o canal ativo (dev usa extensões empacotadas; stable/beta usa npm) e atualiza plugins instalados via npm.

## atalho `--update`

`zero --update` reescreve para `zero update` (útil para shells e scripts launcher).

## Veja também

- `zero doctor` (oferece rodar update primeiro em checkouts git)
- [Canais de desenvolvimento](/install/development-channels)
- [Atualizando](/install/updating)
- [Referência CLI](/cli)
