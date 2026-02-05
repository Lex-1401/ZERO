---
summary: "O que o prompt do sistema do ZERO contém e como ele é montado"
read_when:
  - Editando o texto do prompt do sistema, a lista de ferramentas ou as seções de tempo/heartbeat
  - Alterando a inicialização do espaço de trabalho ou o comportamento de injeção de habilidades
---
# Prompt do Sistema

O ZERO constrói um prompt do sistema personalizado para cada execução do agente. O prompt é **propriedade do ZERO** e não utiliza o prompt padrão do p-coding-agent.

O prompt é montado pelo ZERO e injetado em cada execução do agente.

## Estrutura

O prompt é intencionalmente compacto e utiliza seções fixas:

- **Ferramentas (Tooling)**: lista de ferramentas atuais + descrições curtas.
- **Habilidades (Skills)** (quando disponíveis): informa ao modelo como carregar as instruções de habilidades sob demanda.
- **Autoatualização do ZERO**: como executar `config.apply` e `update.run`.
- **Espaço de Trabalho (Workspace)**: diretório de trabalho (`agents.defaults.workspace`).
- **Documentação**: caminho local para os documentos do ZERO (repositório ou pacote npm) e quando lê-los.
- **Arquivos do Espaço de Trabalho (injetados)**: indica que os arquivos de inicialização (bootstrap) estão incluídos abaixo.
- **Sandbox** (quando habilitado): indica o tempo de execução em sandbox, caminhos de sandbox e se a execução elevada (`elevated exec`) está disponível.
- **Data e Hora Atual**: hora local do usuário, fuso horário e formato de hora.
- **Tags de Resposta**: sintaxe opcional de tag de resposta para provedores suportados.
- **Heartbeats**: prompt de heartbeat e comportamento de confirmação (ack).
- **Tempo de Execução (Runtime)**: host, SO, node, modelo, raiz do repositório (quando detectada), nível de pensamento (uma linha).
- **Raciocínio (Reasoning)**: nível atual de visibilidade + dica de alternância do comando `/reasoning`.

## Modos de prompt

O ZERO pode renderizar prompts de sistema menores para sub-agentes. O tempo de execução define um `promptMode` para cada execução (não é uma configuração voltada para o usuário):

- `full` (padrão): inclui todas as seções acima.
- `minimal`: usado para sub-agentes; omite **Habilidades**, **Recuperação de Memória**, **Autoatualização do ZERO**, **Aliases de Modelo**, **Identidade do Usuário**, **Tags de Resposta**, **Mensagens**, **Respostas Silenciosas** e **Heartbeats**. Ferramentas, Espaço de Trabalho, Sandbox, Data e Hora Atual (quando conhecidas), Tempo de Execução e contexto injetado permanecem disponíveis.
- `none`: retorna apenas a linha de identidade base.

Quando `promptMode=minimal`, os prompts extras injetados são rotulados como **Contexto do Sub-agente** em vez de **Contexto do Chat de Grupo**.

## Injeção de inicialização (bootstrap) do espaço de trabalho

Os arquivos de inicialização são aparados e anexados sob o **Contexto do Projeto** para que o modelo veja a identidade e o contexto do perfil sem precisar de leituras explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (apenas em espaços de trabalho novos)

Arquivos grandes são truncados com um marcador. O tamanho máximo por arquivo é controlado por `agents.defaults.bootstrapMaxChars` (padrão: 20000). Arquivos ausentes injetam um pequeno marcador de arquivo ausente.

Hooks internos podem interceptar esta etapa via `agent:bootstrap` para mutar ou substituir os arquivos de inicialização injetados (por exemplo, trocando `SOUL.md` por uma persona alternativa).

Para inspecionar o quanto cada arquivo injetado contribui (bruto vs injetado, truncamento, além da sobrecarga do esquema da ferramenta), use `/context list` ou `/context detail`. Veja [Contexto](/concepts/context).

## Tratamento de tempo

O prompt do sistema inclui uma seção dedicada de **Data e Hora Atual** quando o fuso horário do usuário é conhecido. Para manter o cache do prompt estável, agora ele inclui apenas o **fuso horário** (sem relógio dinâmico ou formato de hora).

Use `session_status` quando o agente precisar da hora atual; o cartão de status inclui uma linha de carimbo de data/hora (timestamp).

Configuração:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Veja [Data e Hora](/date-time) para detalhes completos do comportamento.

## Habilidades (Skills)

Quando existem habilidades elegíveis, o ZERO injeta uma **lista de habilidades disponíveis** compacta (`formatSkillsForPrompt`) que inclui o **caminho do arquivo** para cada habilidade. O prompt instrui o modelo a usar `read` para carregar o `SKILL.md` na localização listada (espaço de trabalho, gerenciado ou empacotado). Se não houver habilidades elegíveis, a seção de Habilidades é omitida.

```text
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Isso mantém o prompt base pequeno, permitindo o uso direcionado de habilidades.

## Documentação

Quando disponível, o prompt do sistema inclui uma seção de **Documentação** que aponta para o diretório local de documentos do ZERO (seja `docs/` no espaço de trabalho do repositório ou os documentos do pacote npm empacotados), e também observa o espelho público, o repositório original, o Discord da comunidade e o ZeroHub (<https://zerohub.com>) para descoberta de habilidades. O prompt instrui o modelo a consultar os documentos locais primeiro para comportamentos, comandos, configuração ou arquitetura do ZERO, e a executar o `zero status` por conta própria quando possível (perguntando ao usuário apenas quando não tiver acesso).
