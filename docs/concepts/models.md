---
summary: "CLI de Modelos: list, set, aliases, fallbacks, scan, status"
read_when:
  - Adicionando ou modificando a CLI de modelos (models list/set/scan/aliases/fallbacks)
  - Alterando o comportamento de fallback de modelos ou o UX de seleção
  - Atualizando as sondagens (probes) de varredura de modelos (ferramentas/imagens)
---
# CLI de Modelos

Veja [/concepts/model-failover](/concepts/model-failover) para rotação de perfis de autenticação, cooldowns e como isso interage com os fallbacks (opções de reserva). Para uma visão geral rápida do provedor + exemplos: [/concepts/model-providers](/concepts/model-providers).

## Como funciona a seleção de modelos

O ZERO seleciona os modelos nesta ordem:

1) Modelo **Primário** (`agents.defaults.model.primary` ou `agents.defaults.model`).
2) **Fallbacks** em `agents.defaults.model.fallbacks` (em ordem).
3) O **failover de autenticação do provedor** ocorre dentro de um provedor antes de passar para o próximo modelo.

Relacionado:

- `agents.defaults.models` é a lista de permissões (allowlist)/catálogo de modelos que o ZERO pode usar (além dos aliases).
- `agents.defaults.imageModel` é usado **apenas quando** o modelo primário não suporta imagens.
- Padrões por agente podem sobrescrever `agents.defaults.model` via `agents.list[].model` mais vínculos (veja [/concepts/multi-agent](/concepts/multi-agent)).

## Escolhas rápidas de modelos (anecdótico)

- **GLM**: um pouco melhor para codificação/chamada de ferramentas.
- **MiniMax**: melhor para escrita e "vibes".

## Assistente de configuração (Recomendado)

Se você não quiser editar a configuração manualmente, execute o assistente de integração:

```bash
zero onboard
```

Ele pode configurar o modelo + autenticação para provedores comuns, incluindo as **assinaturas do OpenAI Code (Codex)** (OAuth) e **Anthropic** (chave de API recomendada; `claude setup-token` também suportado).

## Chaves de configuração (Visão geral)

- `agents.defaults.model.primary` e `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` e `agents.defaults.imageModel.fallbacks`
- `agents.defaults.models` (lista de permissões + aliases + parâmetros do provedor)
- `models.providers` (provedores personalizados gravados em `models.json`)

As referências de modelo são normalizadas para letras minúsculas. Aliases de provedor como `z.ai/*` são normalizados para `zai/*`.

Exemplos de configuração de provedores (incluindo OpenCode Zen) residem em [/gateway/configuration](/gateway/configuration#opencode-zen-multi-model-proxy).

## “Modelo não permitido” (e por que as respostas param)

Se `agents.defaults.models` estiver definido, ele se torna a **lista de permissões** para o comando `/model` e para sobrescritas de sessão. Quando um usuário seleciona um modelo que não está nessa lista, o ZERO retorna:

```text
Model "provedor/modelo" is not allowed. Use /model to list available models.
```

Isso acontece **antes** de uma resposta normal ser gerada, então pode parecer que a mensagem “não respondeu”. A correção é:

- Adicionar o modelo a `agents.defaults.models`, ou
- Limpar a lista de permissões (remover `agents.defaults.models`), ou
- Escolher um modelo de `/model list`.

Exemplo de configuração da lista de permissões:

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
      "anthropic/claude-opus-4-5": { alias: "Opus" }
    }
  }
}
```

## Alternando modelos no chat (`/model`)

Você pode alternar os modelos para a sessão atual sem reinicializar:

```text
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

Notas:

- `/model` (e `/model list`) é um seletor numérico compacto (família do modelo + provedores disponíveis).
- `/model <#>` seleciona a partir desse seletor.
- `/model status` é a visão detalhada (candidatos de autenticação e, quando configurado, `baseUrl` do endpoint + modo `api`).
- As referências de modelo são analisadas dividindo-se na **primeira** barra `/`. Use `provedor/modelo` ao digitar `/model <ref>`.
- Se o ID do modelo em si contiver `/` (estilo OpenRouter), você deve incluir o prefixo do provedor (exemplo: `/model openrouter/moonshotai/kimi-k2`).
- Se você omitir o provedor, o ZERO trata a entrada como um alias ou um modelo para o **provedor padrão** (só funciona quando não há `/` no ID do modelo).

Comportamento/configuração completa: [Comandos de barra](/tools/slash-commands).

## Comandos da CLI

```bash
zero models list
zero models status
zero models set <provedor/modelo>
zero models set-image <provedor/modelo>

zero models aliases list
zero models aliases add <alias> <provedor/modelo>
zero models aliases remove <alias>

zero models fallbacks list
zero models fallbacks add <provedor/modelo>
zero models fallbacks remove <provedor/modelo>
zero models fallbacks clear

zero models image-fallbacks list
zero models image-fallbacks add <provedor/modelo>
zero models image-fallbacks remove <provedor/modelo>
zero models image-fallbacks clear
```

`zero models` (sem subcomando) é um atalho para `models status`.

### `models list`

Mostra os modelos configurados por padrão. Flags úteis:

- `--all`: catálogo completo
- `--local`: apenas provedores locais
- `--provider <nome>`: filtrar por provedor
- `--plain`: um modelo por linha
- `--json`: saída legível por máquina

### `models status`

Mostra o modelo primário resolvido, fallbacks, modelo de imagem e uma visão geral de autenticação dos provedores configurados. Também apresenta o status de expiração do OAuth para perfis encontrados no armazenamento de autenticação (avisa dentro de 24h por padrão). `--plain` imprime apenas o modelo primário resolvido.
O status do OAuth é sempre mostrado (e incluído na saída `--json`). Se um provedor configurado não possuir credenciais, o `models status` imprime uma seção **Missing auth** (Autenticação ausente).
O JSON inclui `auth.oauth` (janela de aviso + perfis) e `auth.providers` (autenticação efetiva por provedor).
Use `--check` para automação (sai com `1` quando ausente/expirado, `2` prestes a expirar).

A autenticação preferencial da Anthropic é o setup-token da CLI do Claude Code (execute em qualquer lugar; cole no host do gateway se necessário):

```bash
claude setup-token
zero models status
```

## Varredura (Modelos gratuitos do OpenRouter)

O `zero models scan` inspeciona o **catálogo de modelos gratuitos** do OpenRouter e pode opcionalmente sondar modelos quanto ao suporte de ferramentas e imagens.

Flags principais:

- `--no-probe`: pula as sondagens ao vivo (apenas metadados)
- `--min-params <b>`: tamanho mínimo de parâmetros (bilhões)
- `--max-age-days <dias>`: pula modelos mais antigos
- `--provider <nome>`: filtro pelo prefixo do provedor
- `--max-candidates <n>`: tamanho da lista de reserva (fallback)
- `--set-default`: define `agents.defaults.model.primary` para a primeira seleção
- `--set-image`: define `agents.defaults.imageModel.primary` para a primeira seleção de imagem

A sondagem (probe) exige uma chave de API do OpenRouter (dos perfis de autenticação ou `OPENROUTER_API_KEY`). Sem uma chave, use `--no-probe` para listar apenas os candidatos.

Os resultados da varredura são classificados por:

1) Suporte a imagens
2) Latência de ferramentas
3) Tamanho do contexto
4) Contagem de parâmetros

Entrada:

- Lista do OpenRouter `/models` (filtro `:free`)
- Exige chave de API do OpenRouter dos perfis de autenticação ou `OPENROUTER_API_KEY` (veja [/environment](/environment))
- Filtros opcionais: `--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- Controles de sondagem: `--timeout`, `--concurrency`

Quando executado em um TTY, você pode selecionar os fallbacks interativamente. No modo não-interativo, passe `--yes` para aceitar os padrões.

## Registro de modelos (`models.json`)

Provedores personalizados em `models.providers` são gravados em `models.json` sob o diretório do agente (padrão `~/.zero/agents/<agentId>/models.json`). Este arquivo é mesclado por padrão, a menos que `models.mode` esteja definido como `replace`.
