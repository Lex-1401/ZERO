---
summary: "Pipeline de formatação Markdown para canais de saída"
read_when:
  - Você está alterando a formatação ou a divisão (chunking) do Markdown para canais de saída
  - Você está adicionando um novo formatador de canal ou mapeamento de estilo
  - Você está depurando regressões de formatação entre canais
---
# Formatação Markdown

O ZERO formata o Markdown de saída convertendo-o em uma representação intermediária (IR) compartilhada antes de renderizar a saída específica do canal. A IR mantém o texto original intacto enquanto carrega extensões de estilo/link para que a divisão (chunking) e a renderização permaneçam consistentes em todos os canais.

## Objetivos

- **Consistência:** uma etapa de análise (parse), múltiplos renderizadores.
- **Divisão segura (Safe chunking):** divide o texto antes da renderização para que a formatação inline nunca quebre entre as divisões (chunks).
- **Adequação ao canal:** mapeia a mesma IR para o mrkdwn do Slack, o HTML do Telegram e os intervalos de estilo do Signal sem reanalisar o Markdown.

## Pipeline

1. **Analisar Markdown -> IR**
   - A IR é texto simples mais extensões de estilo (negrito/itálico/tachado/código/spoiler) e extensões de link.
   - Os deslocamentos (offsets) são unidades de código UTF-16 para que os intervalos de estilo do Signal se alinhem com sua API.
   - As tabelas são analisadas apenas quando um canal opta pela conversão de tabela.
2. **Dividir IR (formatação primeiro)**
   - A divisão (chunking) ocorre no texto da IR antes da renderização.
   - A formatação inline não se divide entre as partes (chunks); as extensões são fatiadas por parte.
3. **Renderizar por canal**
   - **Slack:** tokens mrkdwn (negrito/itálico/tachado/código), links como `<url|rótulo>`.
   - **Telegram:** tags HTML (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`).
   - **Signal:** texto simples + intervalos de `text-style`; os links tornam-se `rótulo (url)` quando o rótulo difere.

## Exemplo de IR

Markdown de entrada:

```markdown
Olá **mundo** — veja as [docs](https://docs.zero.local).
```

IR (esquemático):

```json
{
  "text": "Olá mundo — veja as docs.",
  "styles": [
    { "start": 4, "end": 9, "style": "bold" }
  ],
  "links": [
    { "start": 19, "end": 23, "href": "https://docs.zero.local" }
  ]
}
```

## Onde é usado

- Os adaptadores de saída do Slack, Telegram e Signal renderizam a partir da IR.
- Outros canais (WhatsApp, iMessage, MS Teams, Discord) ainda usam texto simples ou suas próprias regras de formatação, com a conversão de tabelas Markdown aplicada antes da divisão (chunking), quando habilitada.

## Tratamento de Tabelas

As tabelas Markdown não são suportadas de forma consistente entre os clientes de chat. Use `markdown.tables` para controlar a conversão por canal (e por conta).

- `code`: renderiza as tabelas como blocos de código (padrão para a maioria dos canais).
- `bullets`: converte cada linha em tópicos (padrão para Signal + WhatsApp).
- `off`: desativa a análise e conversão de tabelas; o texto bruto da tabela passa direto.

Chaves de configuração:

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      trabalho:
        markdown:
          tables: off
```

## Regras de Divisão (Chunking)

- Os limites de divisão (chunks) vêm dos adaptadores/configuração do canal e são aplicados ao texto da IR.
- As cercas de código (fences) são preservadas como um único bloco com uma nova linha final para que os canais as renderizem corretamente.
- Prefixos de listas e de citações (blockquote) fazem parte do texto da IR, portanto, a divisão não ocorre no meio de um prefixo.
- Estilos inline (negrito/itálico/tachado/código inline/spoiler) nunca são divididos entre as partes; o renderizador reabre os estilos dentro de cada parte (chunk).

Se precisar de mais informações sobre o comportamento da divisão entre canais, veja [Streaming + divisão (chunking)](/concepts/streaming).

## Política de Links

- **Slack:** `[rótulo](url)` -> `<url|rótulo>`; URLs simples permanecem simples. O link automático (autolink) é desativado durante a análise para evitar links duplos.
- **Telegram:** `[rótulo](url)` -> `<a href="url">rótulo</a>` (modo de análise HTML).
- **Signal:** `[rótulo](url)` -> `rótulo (url)`, a menos que o rótulo corresponda à URL.

## Spoilers

Os marcadores de spoiler (`||spoiler||`) são analisados apenas para o Signal, onde mapeiam para intervalos de estilo SPOILER. Outros canais os tratam como texto simples.

## Como adicionar ou atualizar um formatador de canal

1. **Analisar uma vez:** use o auxiliar compartilhado `markdownToIR(...)` com opções apropriadas para o canal (link automático, estilo de cabeçalho, prefixo de citação).
2. **Renderizar:** implemente um renderizador com `renderMarkdownWithMarkers(...)` e um mapa de marcadores de estilo (ou intervalos de estilo do Signal).
3. **Dividir:** chame `chunkMarkdownIR(...)` antes de renderizar; renderize cada parte (chunk).
4. **Conectar adaptador:** atualize o adaptador de saída do canal para usar o novo divisor e renderizador.
5. **Testar:** adicione ou atualize os testes de formatação e um teste de entrega de saída se o canal usar divisão (chunking).

## Problemas comuns (Gotchas)

- Tokens de colchetes angulares do Slack (`<@U123>`, `<#C123>`, `<https://...>`) devem ser preservados; escape o HTML bruto com segurança.
- O HTML do Telegram exige o escape do texto fora das tags para evitar marcações quebradas.
- Os intervalos de estilo do Signal dependem de deslocamentos (offsets) UTF-16; não use deslocamentos de pontos de código.
- Preserve as novas linhas finais para blocos de código cercados para que os marcadores de fechamento fiquem em sua própria linha.
