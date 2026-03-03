---
summary: "Plano: Adicionar o endpoint /v1/responses do OpenResponses e depreciar o chat completions de forma limpa"
owner: "zero"
status: "draft"
last_updated: "19-01-2026"
---

# Plano de Integração do Gateway OpenResponses

## Contexto

O Gateway do ZERO expõe atualmente um endpoint de Chat Completions minimalista compatível com a OpenAI em `/v1/chat/completions` (veja [OpenAI Chat Completions](/gateway/openai-http-api)).

OpenResponses é um padrão de inferência aberto baseado na API de Respostas da OpenAI. Ele foi projetado para fluxos de trabalho agenticos e usa entradas baseadas em itens (item-based) e eventos de streaming semântico. A especificação do OpenResponses define `/v1/responses`, não `/v1/chat/completions`.

## Objetivos

- Adicionar um endpoint `/v1/responses` que siga a semântica do OpenResponses.
- Manter o Chat Completions como uma camada de compatibilidade fácil de desativar e, eventualmente, remover.
- Padronizar a validação e a análise com esquemas isolados e reutilizáveis.

## Não-objetivos

- Paridade total de funcionalidades do OpenResponses na primeira etapa (imagens, arquivos, ferramentas hospedadas).
- Substituir a lógica interna de execução do agente ou a orquestração de ferramentas.
- Alterar o comportamento existente de `/v1/chat/completions` durante a primeira fase.

## Resumo da Pesquisa

Fontes: OpenAPI do OpenResponses, site da especificação OpenResponses e postagem no blog da Hugging Face.

Pontos chave extraídos:

- `POST /v1/responses` aceita campos `CreateResponseBody` como `model`, `input` (string ou `ItemParam[]`), `instructions`, `tools`, `tool_choice`, `stream`, `max_output_tokens` e `max_tool_calls`.
- `ItemParam` é uma união discriminada de:
  - itens de `message` com os papéis `system`, `developer`, `user`, `assistant`
  - `function_call` e `function_call_output`
  - `reasoning` (raciocínio)
  - `item_reference`
- Respostas bem-sucedidas retornam um `ResponseResource` com `object: "response"`, `status` e itens de `output`.
- O streaming usa eventos semânticos como:
  - `response.created`, `response.in_progress`, `response.completed`, `response.failed`
  - `response.output_item.added`, `response.output_item.done`
  - `response.content_part.added`, `response.content_part.done`
  - `response.output_text.delta`, `response.output_text.done`
- A especificação exige:
  - `Content-Type: text/event-stream`
  - `event:` deve coincidir com o campo `type` do JSON
  - o evento terminal deve ser o literal `[DONE]`
- Itens de raciocínio (reasoning) podem expor `content`, `encrypted_content` e `summary`.
- Exemplos da HF incluem `OpenResponses-Version: latest` nas requisições (cabeçalho opcional).

## Arquitetura Proposta

- Adicionar `src/gateway/open-responses.schema.ts` contendo apenas esquemas Zod (sem imports do gateway).
- Adicionar `src/gateway/openresponses-http.ts` (ou `open-responses-http.ts`) para `/v1/responses`.
- Manter o `src/gateway/openai-http.ts` intacto como um adaptador de compatibilidade legado.
- Adicionar a configuração `gateway.http.endpoints.responses.enabled` (padrão `false`).
- Manter o `gateway.http.endpoints.chatCompletions.enabled` independente; permitir que ambos os endpoints sejam ativados ou desativados separadamente.
- Emitir um aviso na inicialização quando o Chat Completions estiver habilitado para sinalizar o status de legado.

## Caminho de Depreciação para Chat Completions

- Manter fronteiras de módulo estritas: nenhum tipo de esquema compartilhado entre responses e chat completions.
- Tornar o Chat Completions opt-in por configuração para que possa ser desativado sem alterações de código.
- Atualizar a documentação para rotular o Chat Completions como legado assim que o `/v1/responses` estiver estável.
- Passo futuro opcional: mapear requisições de Chat Completions para o handler de Responses para um caminho de remoção mais simples.

## Subconjunto de Suporte da Fase 1

- Aceitar `input` como string ou `ItemParam[]` com papéis de mensagem e `function_call_output`.
- Extrair mensagens de sistema e desenvolvedor para `extraSystemPrompt`.
- Usar o `user` ou `function_call_output` mais recente como a mensagem atual para execuções do agente.
- Rejeitar partes de conteúdo não suportadas (imagem/arquivo) com `invalid_request_error`.
- Retornar uma única mensagem do assistente com conteúdo `output_text`.
- Retornar o uso (`usage`) com valores zerados até que a contabilização de tokens esteja conectada.

## Estratégia de Validação (Sem SDK)

- Implementar esquemas Zod para o subconjunto suportado de:
  - `CreateResponseBody`
  - `ItemParam` + uniões de parte de conteúdo de mensagem
  - `ResponseResource`
  - Formatos de eventos de streaming usados pelo gateway
- Manter os esquemas em um único módulo isolado para evitar divergências e permitir codegen futuro.

## Implementação de Streaming (Fase 1)

- Linhas SSE com ambos `event:` e `data:`.
- Sequência obrigatória (viável mínima):
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta` (repetir conforme necessário)
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## Plano de Testes e Verificação

- Adicionar cobertura e2e para `/v1/responses`:
  - Autenticação exigida
  - Formato de resposta não-stream
  - Ordenação de eventos de stream e `[DONE]`
  - Roteamento de sessão com cabeçalhos e `user`
- Manter `src/gateway/openai-http.e2e.test.ts` inalterado.
- Manual: curl para `/v1/responses` com `stream: true` e verificar a ordenação de eventos e o terminal `[DONE]`.

## Atualizações de Documentação (Acompanhamento)

- Adicionar uma nova página de docs para uso e exemplos de `/v1/responses`.
- Atualizar `/gateway/openai-http-api` com uma nota de legado e um ponteiro para `/v1/responses`.
