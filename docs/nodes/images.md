---
summary: "Regras de tratamento de imagem e mídia para envio, gateway e respostas de agentes"
read_when:
  - Modificando o pipeline de mídia ou anexos
---
# Suporte a Imagem & Mídia — 05-12-2025

O canal do WhatsApp funciona via **Baileys Web**. Este documento captura as regras atuais de tratamento de mídia para envio, gateway e respostas de agentes.

## Objetivos

- Enviar mídia com legendas (captions) opcionais via `zero message send --media`.
- Permitir que auto-respostas da caixa de entrada web incluam mídia junto com texto.
- Manter os limites por tipo sãos e previsíveis.

## Superfície da CLI

- `zero message send --media <caminho-ou-url> [--message <legenda>]`
  - `--media` é opcional; a legenda pode estar vazia para envios apenas de mídia.
  - `--dry-run` imprime o payload resolvido; `--json` emite `{ channel, to, messageId, mediaUrl, caption }`.

## Comportamento do canal WhatsApp Web

- Entrada: caminho do arquivo local **ou** URL HTTP(S).
- Fluxo: carrega em um Buffer, detecta o tipo de mídia e constrói o payload correto:
  - **Imagens:** redimensiona e recompacta para JPEG (lado máximo de 2048px) visando `agents.defaults.mediaMaxMb` (padrão 5 MB), limitado a 6 MB.
  - **Áudio/Voz/Vídeo:** passagem direta (pass-through) até 16 MB; áudio é enviado como nota de voz (`ptt: true`).
  - **Documentos:** qualquer outra coisa, até 100 MB, com o nome do arquivo preservado quando disponível.
- Reprodução estilo GIF no WhatsApp: envia um MP4 com `gifPlayback: true` (CLI: `--gif-playback`) para que os clientes móveis repitam a reprodução em linha.
- A detecção de MIME prefere magic bytes, depois cabeçalhos e depois a extensão do arquivo.
- A legenda vem de `--message` ou `reply.text`; legenda vazia é permitida.
- Logs: modo não-verbose mostra `↩️`/`✅`; modo verbose inclui tamanho e caminho/URL de origem.

## Pipeline de Auto-Resposta

- `getReplyFromConfig` retorna `{ text?, mediaUrl?, mediaUrls? }`.
- Quando há mídia presente, o remetente web resolve os caminhos locais ou URLs usando o mesmo pipeline de `zero message send`.
- Múltiplas entradas de mídia são enviadas sequencialmente, se fornecidas.

## Mídia de Entrada para Comandos (Pi)

- Quando as mensagens web de entrada incluem mídia, o ZERO faz o download para um arquivo temporário e expõe variáveis de template:
  - `{{MediaUrl}}` pseudo-URL para a mídia de entrada.
  - `{{MediaPath}}` caminho temporário local gravado antes de rodar o comando.
- Quando um sandbox Docker por sessão está habilitado, a mídia de entrada é copiada para o espaço de trabalho do sandbox e `MediaPath`/`MediaUrl` são reescritos para um caminho relativo como `media/inbound/<nome-do-arquivo>`.
- O entendimento de mídia (se configurado via `tools.media.*` ou `tools.media.models` compartilhado) roda antes do templating e pode inserir blocos `[Image]`, `[Audio]` e `[Video]` no `Body`.
  - Áudio define `{{Transcript}}` e usa a transcrição para análise do comando para que comandos de barra (slash commands) ainda funcionem.
  - Descrições de vídeo e imagem preservam qualquer texto de legenda para a análise do comando.
- Por padrão, apenas o primeiro anexo correspondente de imagem/áudio/vídeo é processado; configure `tools.media.<cap>.attachments` para processar múltiplos anexos.

## Limites & Erros

**Limites de envio (WhatsApp web send)**

- Imagens: limite de ~6 MB após recompactação.
- Áudio/voz/vídeo: limite de 16 MB; documentos: limite de 100 MB.
- Mídia excessivamente grande ou ilegível → erro claro nos logs e a resposta é pulada.

**Limites de entendimento de mídia (transcrição/descrição)**

- Padrão de imagem: 10 MB (`tools.media.image.maxBytes`).
- Padrão de áudio: 20 MB (`tools.media.audio.maxBytes`).
- Padrão de vídeo: 50 MB (`tools.media.video.maxBytes`).
- Mídia excessivamente grande pula o entendimento, mas as respostas ainda passam com o corpo original.

## Notas para Testes

- Cobrir fluxos de envio + resposta para casos de imagem/áudio/documento.
- Validar recompactação para imagens (limite de tamanho) e a flag de nota de voz para áudio.
- Garantir que respostas com múltiplas mídias sejam distribuídas como envios sequenciais.
