---
summary: "Referência CLI para `zero models` (status/list/set/scan, aliases, fallbacks, auth)"
read_when:
  - Você quer mudar modelos padrão ou ver status de auth de provedor
  - Você quer escanear provedores/modelos e depurar perfis de auth
---

# `zero models`

Descoberta de modelo, escaneamento e configuração (modelo padrão, fallbacks, perfis de auth).

Relacionado:

- Provedores + modelos: [Models](/providers/models)
- Setup de auth de provedor: [Getting started](/start/getting-started)

## Comandos comuns

```bash
zero models status
zero models list
zero models set <model-or-alias>
zero models scan
```

`zero models status` mostra o padrão/fallbacks resolvidos mais uma visão geral de auth.
Quando snapshots de uso do provedor estão disponíveis, a seção de status OAuth/token inclui
cabeçalhos de uso do provedor.
Adicione `--probe` para rodar sondas de auth ao vivo contra cada perfil de provedor configurado.
Sondas são requisições reais (podem consumir tokens e acionar limites de taxa).

Notas:

- `models set <model-or-alias>` aceita `provider/model` ou um alias.
- Refs de modelo são parseadas dividindo na **primeira** `/`. Se o ID do modelo incluir `/` (estilo OpenRouter), inclua o prefixo do provedor (exemplo: `openrouter/moonshotai/kimi-k2`).
- Se você omitir o provedor, ZERO trata a entrada como um alias ou um modelo para o **provedor padrão** (só funciona quando não há `/` no ID do modelo).

### `models status`

Opções:

- `--json`
- `--plain`
- `--check` (sair 1=expirado/faltando, 2=expirando)
- `--probe` (sonda ao vivo de perfis de auth configurados)
- `--probe-provider <name>` (sondar um provedor)
- `--probe-profile <id>` (repetir ou ids de perfil separados por vírgula)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

## Alias + fallbacks

```bash
zero models aliases list
zero models fallbacks list
```

## Perfis de Auth

```bash
zero models auth add
zero models auth login --provider <id>
zero models auth setup-token
zero models auth paste-token
```

`models auth login` roda um fluxo de auth de plugin de provedor (OAuth/chave API). Use
`zero plugins list` para ver quais provedores estão instalados.

Notas:

- `setup-token` roda `claude setup-token` na máquina atual (requer a CLI Claude Code).
- `paste-token` aceita uma string de token gerada em outro lugar.
