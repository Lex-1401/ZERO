---
summary: "Como as notas de voz/áudio de entrada são baixadas, transcritas e injetadas nas respostas"
read_when:
  - Alterando a transcrição de áudio ou tratamento de mídia
---
# Áudio / Notas de Voz — 17-01-2026

## O que funciona

- **Entendimento de mídia (áudio)**: Se o entendimento de áudio estiver habilitado (ou for auto-detectado), o ZERO:
  1) Localiza o primeiro anexo de áudio (caminho local ou URL) e o baixa, se necessário.
  2) Impõe o `maxBytes` antes de enviar para cada entrada de modelo.
  3) Executa a primeira entrada de modelo elegível em ordem (provedor ou CLI).
  4) Se falhar ou for ignorado (por tamanho/timeout), tenta a próxima entrada.
  5) Em caso de sucesso, substitui o `Body` (corpo) por um bloco `[Audio]` e define `{{Transcript}}`.
- **Análise de comandos**: Quando a transcrição é bem-sucedida, `CommandBody`/`RawBody` são definidos com a transcrição para que os comandos de barra (slash commands) ainda funcionem.
- **Log detalhado (verbose)**: No modo `--verbose`, registramos quando a transcrição é executada e quando ela substitui o corpo da mensagem.

## Auto-detecção (padrão)

Se você **não configurar modelos** e `tools.media.audio.enabled` **não** estiver definido como `false`, o ZERO auto-detecta nesta ordem e para na primeira opção que funcionar:

1) **CLIs Locais** (se instaladas)
   - `sherpa-onnx-offline` (exige `SHERPA_ONNX_MODEL_DIR` com encoder/decoder/joiner/tokens)
   - `whisper-cli` (do `whisper-cpp`; usa `WHISPER_CPP_MODEL` ou o modelo tiny embutido)
   - `whisper` (CLI Python; baixa modelos automaticamente)
2) **Gemini CLI** (`gemini`) usando `read_many_files`
3) **Chaves de provedores** (OpenAI → Groq → Deepgram → Google)

Para desativar a auto-detecção, defina `tools.media.audio.enabled: false`.
Para personalizar, defina `tools.media.audio.models`.
Nota: A detecção de binários é feita pelo melhor esforço em macOS/Linux/Windows; certifique-se de que a CLI esteja no `PATH` (nós expandimos `~`), ou defina um modelo CLI explícito com o caminho completo do comando.

## Exemplos de configuração

### Provedor + Fallback CLI (OpenAI + Whisper CLI)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45
          }
        ]
      }
    }
  }
}
```

### Apenas provedor com restrição de escopo (scope gating)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [
            { action: "deny", match: { chatType: "group" } }
          ]
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" }
        ]
      }
    }
  }
}
```

### Apenas provedor (Deepgram)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## Notas & Limites

- A autenticação do provedor segue a ordem padrão (perfis de autenticação, variáveis de ambiente, `models.providers.*.apiKey`).
- O Deepgram usa `DEEPGRAM_API_KEY` quando `provider: "deepgram"` é utilizado.
- Detalhes de configuração do Deepgram: [Deepgram (transcrição de áudio)](/providers/deepgram).
- Provedores de áudio podem sobrescrever `baseUrl`, `headers` e `providerOptions` via `tools.media.audio`.
- O limite padrão de tamanho é 20MB (`tools.media.audio.maxBytes`). Áudios excessivamente grandes são ignorados para aquele modelo e a próxima entrada é tentada.
- O padrão `maxChars` para áudio é **não definido** (transcrição completa). Configure `tools.media.audio.maxChars` ou `maxChars` por entrada para truncar a saída.
- O padrão automático da OpenAI é `gpt-4o-mini-transcribe`; use `model: "gpt-4o-transcribe"` para maior precisão.
- Use `tools.media.audio.attachments` para processar múltiplas notas de voz (`mode: "all"` + `maxAttachments`).
- A transcrição está disponível para templates como `{{Transcript}}`.
- O stdout da CLI é limitado (5MB); mantenha a saída da CLI concisa.

## Pontos de atenção

- As regras de escopo (scope rules) usam a lógica "a primeira correspondência vence". `chatType` é normalizado para `direct`, `group` ou `room`.
- Certifique-se de que sua CLI retorne 0 e imprima texto simples; o JSON precisa ser tratado via `jq -r .text`.
- Mantenha os limites de tempo razoáveis (`timeoutSeconds`, padrão 60s) para evitar o bloqueio da fila de respostas.
