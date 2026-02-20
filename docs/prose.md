---
summary: "OpenProse: fluxos de trabalho .prose, comandos slash e estado no ZERO"
read_when:
  - Você deseja executar ou escrever fluxos de trabalho em formato .prose
  - Você deseja ativar o plugin OpenProse
  - Você precisa entender o armazenamento de estado
---

# OpenProse

O OpenProse é um formato de fluxo de trabalho portátil, focado em Markdown, para orquestrar sessões de IA. No ZERO, ele é entregue como um plugin que instala um pacote de habilidades (skills) OpenProse, além do comando slash `/prose`. Os programas residem em arquivos `.prose` e podem gerar múltiplos sub-agentes com controle de fluxo explícito.

Site oficial: <https://www.prose.md>

## O que ele pode fazer

- Pesquisa e síntese multi-agente com paralelismo explícito.
- Fluxos de trabalho repetíveis e seguros (revisão de código, triagem de incidentes, pipelines de conteúdo).
- Programas `.prose` reutilizáveis que você pode executar em diferentes ambientes de execução de agentes suportados.

## Instalar e Ativar

Plugins integrados são desativados por padrão. Ative o OpenProse:

```bash
zero plugins enable open-prose
```

Reinicie o Gateway após ativar o plugin.

Checkout dev/local: `zero plugins install ./extensions/open-prose`

Documentos relacionados: [Plugins](/plugin), [Manifesto do Plugin](/plugins/manifest), [Habilidades (Skills)](/tools/skills).

## Comando Slash

O OpenProse registra `/prose` como um comando de habilidade que o usuário pode invocar. Ele roteia para as instruções da VM OpenProse e utiliza as ferramentas do ZERO nos bastidores.

Comandos comuns:

```text
/prose help
/prose run <arquivo.prose>
/prose run <identificador/slug>
/prose run <https://exemplo.com/arquivo.prose>
/prose compile <arquivo.prose>
/prose examples
/prose update
```

## Exemplo: um arquivo `.prose` simples

```prose
# Pesquisa + síntese com dois agentes rodando em paralelo.

input topic: "O que devemos pesquisar?"

agent researcher:
  model: sonnet
  prompt: "Você pesquisa minuciosamente e cita as fontes."

agent writer:
  model: opus
  prompt: "Você escreve um resumo conciso."

parallel:
  findings = session: researcher
    prompt: "Pesquise sobre {topic}."
  draft = session: writer
    prompt: "Resuma {topic}."

session "Mescle as descobertas + rascunho em uma resposta final."
context: { findings, draft }
```

## Localização de Arquivos

O OpenProse mantém o estado sob o diretório `.prose/` no seu workspace:

```text
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

Agentes persistentes no nível do usuário residem em:

```text
~/.prose/agents/
```

## Modos de Estado

O OpenProse suporta múltiplos backends de estado:

- **filesystem** (padrão): `.prose/runs/...`
- **in-context**: transitório, para programas pequenos.
- **sqlite** (experimental): requer o binário `sqlite3`.
- **postgres** (experimental): requer o `psql` e uma string de conexão.

Notas:

- sqlite/postgres são opcionais e experimentais.
- Credenciais do postgres podem aparecer nos logs do sub-agente; use um banco de dados dedicado e com privilégios mínimos.

## Programas Remotos

`/prose run <identificador/slug>` resolve para `https://p.prose.md/<identificador>/<slug>`.
URLs diretas são buscadas como estão. Isso utiliza a ferramenta `web_fetch` (ou `exec` para POST).

## Mapeamento do Runtime ZERO

Os programas OpenProse mapeiam para primitivas do ZERO:

| Conceito OpenProse | Ferramenta ZERO |
| --- | --- |
| Spawn session / Task tool | `sessions_spawn` |
| Leitura/Escrita de arquivos | `read` / `write` |
| Busca web (Web fetch) | `web_fetch` |

Se a sua lista de permissão (allowlist) de ferramentas bloquear estas ferramentas, os programas OpenProse falharão. Consulte [Configuração de Habilidades](/tools/skills-config).

## Segurança e Aprovações

Trate arquivos `.prose` como código. Revise antes de executar. Use as allowlists de ferramentas e os portões de aprovação do ZERO para controlar os efeitos colaterais.

Para fluxos de trabalho determinísticos e com aprovação obrigatória, compare com o [VOID](/tools/void).
