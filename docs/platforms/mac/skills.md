---
summary: "Interface de configurações de Skills no macOS e status baseado no gateway"
read_when:
  - Atualizando a interface de configurações de Skills no macOS
  - Alterando o comportamento de gating ou instalação de skills
---
# Skills (macOS)

O app macOS exibe as skills do ZERO via gateway; ele não analisa as skills localmente.

## Fonte de dados

- `skills.status` (gateway) retorna todas as skills, além da elegibilidade e requisitos ausentes (incluindo bloqueios de lista de permissões para skills integradas).
- Os requisitos são derivados de `metadata.zero.requires` em cada `SKILL.md`.

## Ações de instalação

- `metadata.zero.install` define as opções de instalação (brew/node/go/uv).
- O app chama `skills.install` para executar os instaladores no host do gateway.
- O gateway exibe apenas um instalador preferencial quando vários são fornecidos (brew quando disponível, caso contrário, o gerenciador de node de `skills.install`, padrão npm).

## Chaves de Env/API

- O app armazena as chaves em `~/.zero/zero.json` sob `skills.entries.<skillKey>`.
- `skills.update` aplica patches em `enabled`, `apiKey` e `env`.

## Modo remoto

- As atualizações de instalação + configuração ocorrem no host do gateway (não no Mac local).
