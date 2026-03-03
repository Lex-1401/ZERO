---
summary: "Scripts do repositório: propósito, escopo e notas de segurança"
read_when:
  - Ao executar scripts do repositório
  - Ao adicionar ou alterar scripts em ./scripts
---

# Scripts

O diretório `scripts/` contém scripts auxiliares para fluxos de trabalho locais e tarefas operacionais. Use-os quando uma tarefa estiver claramente vinculada a um script; caso contrário, prefira a CLI.

## Convenções

- Os scripts são **opcionais**, a menos que sejam referenciados na documentação ou nas listas de verificação de lançamento.
- Prefira as superfícies da CLI quando existirem (exemplo: o monitoramento de autenticação usa `zero models status --check`).
- Assuma que os scripts são específicos do host; leia-os antes de executá-los em uma nova máquina.

## Hooks do Git

- `scripts/setup-git-hooks.js`: configuração automática do `core.hooksPath` quando dentro de um repositório git.
- `scripts/format-staged.js`: formatador pré-commit para arquivos em `src/` e `test/` marcados (staged).

## Scripts de monitoramento de autenticação

Os scripts de monitoramento de autenticação estão documentados aqui:
[/automation/auth-monitoring](/automation/auth-monitoring)

## Ao adicionar scripts

- Mantenha os scripts focados e documentados.
- Adicione uma entrada curta no documento relevante (ou crie um se estiver faltando).
