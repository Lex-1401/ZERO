---
summary: "Entendimento de imagem/áudio/vídeo de entrada (opcional) com fallbacks de provedor + CLI"
read_when:
  - Projetando ou refatorando o entendimento de mídia
  - Ajustando o pré-processamento de áudio/vídeo/imagem de entrada
---

# Entendimento de Mídia (Entrada) — 17-01-2026

O ZERO pode **resumir mídias de entrada** (imagem/áudio/vídeo) antes que o pipeline de resposta seja executado. Ele auto-detecta quando ferramentas locais ou chaves de provedores estão disponíveis e pode ser desativado ou personalizado. Se o entendimento estiver desligado, os modelos ainda recebem os arquivos/URLs originais normalmente.

## Objetivos

- Opcional: pré-digerir a mídia de entrada em texto curto para roteamento mais rápido + melhor análise de comandos.
- Preservar a entrega da mídia original ao modelo (sempre).
- Suportar **APIs de provedores** e **fallbacks de CLI**.
- Permitir múltiplos modelos com fallback ordenado (erro/tamanho/timeout).

## Comportamento de alto nível

1. Coleta os anexos de entrada (`MediaPaths`, `MediaUrls`, `MediaTypes`).
2. Para cada capacidade habilitada (imagem/áudio/vídeo), seleciona os anexos por política (padrão: **primeiro**).
3. Escolhe a primeira entrada de modelo elegível (tamanho + capacidade + autenticação).
4. Se um modelo falhar ou a mídia for muito grande, **recorre (fallback) à próxima entrada**.
5. Em caso de sucesso:
   - O `Body` torna-se um bloco `[Image]`, `[Audio]` ou `[Video]`.
   - Áudio define `{{Transcript}}`; a análise de comandos usa o texto da legenda quando presente, caso contrário, a transcrição.
   - Legendas são preservadas como `User text:` dentro do bloco.

Se o entendimento falhar ou estiver desativado, **o fluxo de resposta continua** com o corpo original + anexos.

## Visão geral da configuração

`tools.media` suporta **modelos compartilhados** e sobrescritas por capacidade:

- `tools.media.models`: lista de modelos compartilhados (use `capabilities` para filtrar).
- `tools.media.image` / `tools.media.audio` / `tools.media.video`:
  - padrões (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - sobrescritas de provedor (`baseUrl`, `headers`, `providerOptions`)
  - opções de áudio Deepgram via `tools.media.audio.providerOptions.deepgram`
  - **lista `models` por capacidade** opcional (preferencial antes dos modelos compartilhados)
  - política de `attachments` (`mode`, `maxAttachments`, `prefer`)
  - `scope` (gating opcional por canal/chatType/chave de sessão)
- `tools.media.concurrency`: execuções simultâneas máximas por capacidade (padrão **2**).

```json5
{
  tools: {
    media: {
      models: [
        /* lista compartilhada */
      ],
      image: {
        /* sobrescritas opcionais */
      },
      audio: {
        /* sobrescritas opcionais */
      },
      video: {
        /* sobrescritas opcionais */
      },
    },
  },
}
```

### Entradas de modelo

Cada entrada em `models[]` pode ser um **provedor** ou **CLI**:

```json5
{
  type: "provider", // padrão se omitido
  provider: "openai",
  model: "gpt-5.2",
  prompt: "Descreva a imagem em <= 500 caracteres.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // opcional, usado para entradas multi-modais
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "Leia a mídia em {{MediaPath}} e descreva-a em <= {{MaxChars}} caracteres.",
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"],
}
```

Templates de CLI também podem usar:

- `{{MediaDir}}` (diretório contendo o arquivo de mídia)
- `{{OutputDir}}` (diretório temporário criado para esta execução)
- `{{OutputBase}}` (caminho base do arquivo temporário, sem extensão)

## Padrões e limites

Padrões recomendados:

- `maxChars`: **500** para imagem/vídeo (curto, amigável para comandos)
- `maxChars`: **não definido** para áudio (transcrição completa, a menos que você defina um limite)
- `maxBytes`:
  - imagem: **10MB**
  - áudio: **20MB**
  - vídeo: **50MB**

Regras:

- Se a mídia exceder `maxBytes`, aquele modelo é pulado e o **próximo modelo é tentado**.
- Se o modelo retornar mais de `maxChars`, a saída é truncada.
- `prompt` tem como padrão o simples “Descreva a {mídia}.” mais a orientação `maxChars` (apenas imagem/vídeo).
- Se `<capability>.enabled: true`, mas nenhum modelo estiver configurado, o ZERO tenta o **modelo de resposta ativo** quando seu provedor suporta a capacidade.

### Auto-detectar entendimento de mídia (padrão)

Se `tools.media.<capability>.enabled` **não** estiver definido como `false` e você não configurou modelos, o ZERO auto-detecta nesta ordem e **para na primeira opção que funcionar**:

1. **CLIs Locais** (apenas áudio; se instaladas)
   - `sherpa-onnx-offline` (exige `SHERPA_ONNX_MODEL_DIR` com encoder/decoder/joiner/tokens)
   - `whisper-cli` (`whisper-cpp`; usa `WHISPER_CPP_MODEL` ou o modelo tiny embutido)
   - `whisper` (CLI Python; baixa modelos automaticamente)
2. **Gemini CLI** (`gemini`) usando `read_many_files`
3. **Chaves de provedores**
   - Áudio: OpenAI → Groq → Deepgram → Google
   - Imagem: OpenAI → Anthropic → Google → MiniMax
   - Vídeo: Google

Para desativar a auto-detecção, defina:

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

Nota: A detecção de binários é feita pelo melhor esforço em macOS/Linux/Windows; certifique-se de que a CLI esteja no `PATH` (nós expandimos `~`), ou defina um modelo CLI explícito com o caminho completo do comando.

## Capacidades (opcional)

Se você definir `capabilities`, a entrada só roda para esses tipos de mídia. Para listas compartilhadas, o ZERO pode inferir padrões:

- `openai`, `anthropic`, `minimax`: **imagem**
- `google` (API Gemini): **imagem + áudio + vídeo**
- `groq`: **áudio**
- `deepgram`: **áudio**

Para entradas de CLI, **defina o `capabilities` explicitamente** para evitar correspondências inesperadas. Se você omitir `capabilities`, a entrada é elegível para a lista em que aparece.

## Matriz de suporte de provedores (integrações ZERO)

| Capacidade | Integração de Provedor                           | Notas                                                 |
| ---------- | ------------------------------------------------ | ----------------------------------------------------- |
| Imagem     | OpenAI / Anthropic / Google / outros via `pi-ai` | Qualquer modelo capaz de imagem no registro funciona. |
| Áudio      | OpenAI, Groq, Deepgram, Google                   | Transcrição de provedor (Whisper/Deepgram/Gemini).    |
| Vídeo      | Google (API Gemini)                              | Entendimento de vídeo do provedor.                    |

## Provedores recomendados

**Imagem**

- Prefira o seu modelo ativo se ele suportar imagens.
- Bons padrões: `openai/gpt-5.2`, `anthropic/claude-opus-4-5`, `google/gemini-3-pro-preview`.

**Áudio**

- `openai/gpt-4o-mini-transcribe`, `groq/whisper-large-v3-turbo` ou `deepgram/nova-3`.
- Fallback de CLI: `whisper-cli` (whisper-cpp) ou `whisper`.
- Configuração Deepgram: [Deepgram (transcrição de áudio)](/providers/deepgram).

**Vídeo**

- `google/gemini-3-flash-preview` (rápido), `google/gemini-3-pro-preview` (mais rico).
- Fallback de CLI: CLI `gemini` (suporta `read_file` em vídeo/áudio).

## Política de anexos

A configuração de `attachments` por capacidade controla quais anexos são processados:

- `mode`: `first` (primeiro, padrão) ou `all` (todos)
- `maxAttachments`: limita o número processado (padrão **1**)
- `prefer`: `first`, `last`, `path`, `url`

Quando `mode: "all"`, as saídas são rotuladas como `[Image 1/2]`, `[Audio 2/2]`, etc.

## Exemplos de configuração

### 1) Lista de modelos compartilhados + sobrescritas

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
        {
          provider: "google",
          model: "gemini-3-flash-preview",
          capabilities: ["image", "audio", "video"],
        },
        {
          type: "cli",
          command: "gemini",
          args: [
            "-m",
            "gemini-3-flash",
            "--allowed-tools",
            "read_file",
            "Leia a mídia em {{MediaPath}} e descreva-a em <= {{MaxChars}} caracteres.",
          ],
          capabilities: ["image", "video"],
        },
      ],
      audio: {
        attachments: { mode: "all", maxAttachments: 2 },
      },
      video: {
        maxChars: 500,
      },
    },
  },
}
```

### 2) Apenas Áudio + Vídeo (imagem desativada)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
          },
        ],
      },
      video: {
        enabled: true,
        maxChars: 500,
        models: [
          { provider: "google", model: "gemini-3-flash-preview" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Leia a mídia em {{MediaPath}} e descreva-a em <= {{MaxChars}} caracteres.",
            ],
          },
        ],
      },
    },
  },
}
```

### 3) Entendimento de imagem opcional

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
          { provider: "anthropic", model: "claude-opus-4-5" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Leia a mídia em {{MediaPath}} e descreva-a em <= {{MaxChars}} caracteres.",
            ],
          },
        ],
      },
    },
  },
}
```

### 4) Entrada única multi-modal (capacidades explícitas)

```json5
{
  tools: {
    media: {
      image: {
        models: [
          {
            provider: "google",
            model: "gemini-3-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      audio: {
        models: [
          {
            provider: "google",
            model: "gemini-3-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      video: {
        models: [
          {
            provider: "google",
            model: "gemini-3-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
    },
  },
}
```

## Saída de status

Quando o entendimento de mídia é executado, o `/status` inclui uma linha de resumo curta:

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

Isso mostra os resultados por capacidade e o provedor/modelo escolhido, quando aplicável.

## Notas

- O entendimento é feito por **melhor esforço**. Erros não bloqueiam as respostas.
- Anexos ainda são passados para os modelos mesmo quando o entendimento está desativado.
- Use `scope` para limitar onde o entendimento é executado (ex: apenas DMs).

## Documentos relacionados

- [Configuração](/gateway/configuration)
- [Suporte a Imagem & Mídia](/nodes/images)
