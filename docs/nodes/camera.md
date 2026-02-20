---
summary: "Captura de câmera (nó iOS + app macOS) para uso do agente: fotos (jpg) e clipes de vídeo curtos (mp4)"
read_when:
  - Adicionando ou modificando a captura de câmera em nós iOS ou macOS
  - Estendendo os fluxos de trabalho de arquivos temporários MEDIA acessíveis por agentes
---
# Captura de Câmera (Agente)

O ZERO suporta a **captura de câmera** para fluxos de trabalho de agentes:

- **Nó iOS** (emparelhado via Gateway): captura uma **foto** (`jpg`) ou um **clipe de vídeo curto** (`mp4`, com áudio opcional) via `node.invoke`.
- **Nó Android** (emparelhado via Gateway): captura uma **foto** (`jpg`) ou um **clipe de vídeo curto** (`mp4`, com áudio opcional) via `node.invoke`.
- **App macOS** (nó via Gateway): captura uma **foto** (`jpg`) ou um **clipe de vídeo curto** (`mp4`, com áudio opcional) via `node.invoke`.

Todo o acesso à câmera é controlado pelas **configurações controladas pelo usuário**.

## Nó iOS

### Configuração do usuário (ligado por padrão)

- Aba de Ajustes do iOS → **Câmera** → **Permitir Câmera** (`camera.enabled`)
  - Padrão: **ligado** (a falta da chave é tratada como habilitado).
  - Quando desligado: comandos `camera.*` retornam `CAMERA_DISABLED`.

### Comandos (via Gateway `node.invoke`)

- `camera.list`
  - Payload de resposta:
    - `devices`: array de `{ id, name, position, deviceType }`

- `camera.snap`
  - Parâmetros:
    - `facing`: `front|back` (padrão: `front`)
    - `maxWidth`: número (opcional; padrão `1600` no nó iOS)
    - `quality`: `0..1` (opcional; padrão `0.9`)
    - `format`: atualmente `jpg`
    - `delayMs`: número (opcional; padrão `0`)
    - `deviceId`: string (opcional; de `camera.list`)
  - Payload de resposta:
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Proteção de payload: as fotos são recompactadas para manter o payload base64 abaixo de 5 MB.

- `camera.clip`
  - Parâmetros:
    - `facing`: `front|back` (padrão: `front`)
    - `durationMs`: número (padrão `3000`, limitado a um máximo de `60000`)
    - `includeAudio`: booleano (padrão `true`)
    - `format`: atualmente `mp4`
    - `deviceId`: string (opcional; de `camera.list`)
  - Payload de resposta:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Requisito de Primeiro Plano (Foreground)

Assim como `canvas.*`, o nó iOS só permite comandos `camera.*` em **primeiro plano**. Invocações em segundo plano retornam `NODE_BACKGROUND_UNAVAILABLE`.

### Auxiliar da CLI (arquivos temporários + MEDIA)

A maneira mais fácil de obter anexos é via auxiliar da CLI, que grava a mídia decodificada em um arquivo temporário e imprime `MEDIA:<caminho>`.

Exemplos:

```bash
zero nodes camera snap --node <id>               # padrão: frente + verso (2 linhas MEDIA)
zero nodes camera snap --node <id> --facing front
zero nodes camera clip --node <id> --duration 3000
zero nodes camera clip --node <id> --no-audio
```

Notas:

- `nodes camera snap` tem como padrão **ambas** as faces para dar ao agente ambas as visões.
- Os arquivos de saída são temporários (no diretório temporário do SO), a menos que você construa seu próprio wrapper.

## Nó Android

### Configuração do usuário (ligado por padrão)

- Tela de Configurações do Android → **Câmera** → **Permitir Câmera** (`camera.enabled`)
  - Padrão: **ligado** (a falta da chave é tratada como habilitado).
  - Quando desligado: comandos `camera.*` retornam `CAMERA_DISABLED`.

### Permissões

- O Android exige permissões de tempo de execução:
  - `CAMERA` para `camera.snap` e `camera.clip`.
  - `RECORD_AUDIO` para `camera.clip` quando `includeAudio=true`.

Se as permissões estiverem ausentes, o app solicitará quando possível; se negadas, as requisições `camera.*` falham com um erro `*_PERMISSION_REQUIRED`.

### Requisito de Primeiro Plano (Foreground)

Assim como `canvas.*`, o nó Android só permite comandos `camera.*` em **primeiro plano**. Invocações em segundo plano retornam `NODE_BACKGROUND_UNAVAILABLE`.

### Proteção de Payload

As fotos são recompactadas para manter o payload base64 abaixo de 5 MB.

## App macOS

### Configuração do usuário (desligado por padrão)

O app complementar do macOS expõe uma caixa de seleção:

- **Configurações → Geral → Permitir Câmera** (`zero.cameraEnabled`)
  - Padrão: **desligado**
  - Quando desligado: as requisições de câmera retornam “Camera disabled by user”.

### Auxiliar da CLI (invocação de nó)

Use a CLI principal do `zero` para invocar comandos de câmera no nó macOS.

Exemplos:

```bash
zero nodes camera list --node <id>            # lista os ids das câmeras
zero nodes camera snap --node <id>            # imprime MEDIA:<caminho>
zero nodes camera snap --node <id> --max-width 1280
zero nodes camera snap --node <id> --delay-ms 2000
zero nodes camera snap --node <id> --device-id <id>
zero nodes camera clip --node <id> --duration 10s          # imprime MEDIA:<caminho>
zero nodes camera clip --node <id> --duration-ms 3000      # imprime MEDIA:<caminho> (flag legada)
zero nodes camera clip --node <id> --device-id <id>
zero nodes camera clip --node <id> --no-audio
```

Notas:

- `zero nodes camera snap` tem como padrão `maxWidth=1600`, a menos que sobrescrito.
- No macOS, `camera.snap` aguarda `delayMs` (padrão 2000ms) após o aquecimento/estabilização da exposição antes de capturar.
- Os payloads de fotos são recompactados para manter o base64 abaixo de 5 MB.

## Segurança + Limites Práticos

- O acesso à câmera e ao microfone dispara os prompts de permissão usuais do SO (e exige strings de uso no Info.plist).
- Os clipes de vídeo são limitados (atualmente `<= 60s`) para evitar payloads de nó excessivamente grandes (sobrecarga de base64 + limites de mensagem).

## Vídeo de tela macOS (nível do SO)

Para vídeo de *tela* (não câmera), use o complementar do macOS:

```bash
zero nodes screen record --node <id> --duration 10s --fps 15   # imprime MEDIA:<caminho>
```

Notas:

- Exige permissão de **Gravação de Tela** (Screen Recording) do macOS (TCC).
