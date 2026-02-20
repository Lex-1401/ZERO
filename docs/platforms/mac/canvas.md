---
summary: "Painel Canvas controlado por agente incorporado via WKWebView + esquema de URL personalizado"
read_when:
  - Implementando o painel Canvas do macOS
  - Adicionando controles de agente para espaço de trabalho visual
  - Depurando carregamentos do canvas no WKWebView
---
# Canvas (app macOS)

O app macOS incorpora um **painel Canvas** controlado por agente usando `WKWebView`. É um espaço de trabalho visual leve para HTML/CSS/JS, A2UI e pequenas superfícies de interface interativa.

## Onde o Canvas reside

O estado do Canvas é armazenado em Application Support:

- `~/Library/Application Support/ZERO/canvas/<sessão>/...`

O painel Canvas serve esses arquivos via um **esquema de URL personalizado**:

- `zero-canvas://<sessão>/<caminho>`

Exemplos:

- `zero-canvas://main/` → `<canvasRoot>/main/index.html`
- `zero-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `zero-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

Se não existir um `index.html` na raiz, o app mostra uma **página de estrutura (scaffold) integrada**.

## Comportamento do painel

- Painel sem bordas, redimensionável, ancorado próximo à barra de menus (ou ao cursor do mouse).
- Lembra o tamanho/posição por sessão.
- Recarrega automaticamente quando os arquivos locais do canvas mudam.
- Apenas um painel Canvas é visível por vez (a sessão é alternada conforme necessário).

O Canvas pode ser desativado em Ajustes → **Allow Canvas**. Quando desativado, os comandos de nó do canvas retornam `CANVAS_DISABLED`.

## Superfície da API do agente

O Canvas é exposto via **Gateway WebSocket**, permitindo que o agente possa:

- mostrar/ocultar o painel
- navegar para um caminho ou URL
- avaliar JavaScript
- capturar uma imagem de instantâneo (snapshot)

Exemplos de CLI:

```bash
zero nodes canvas present --node <id>
zero nodes canvas navigate --node <id> --url "/"
zero nodes canvas eval --node <id> --js "document.title"
zero nodes canvas snapshot --node <id>
```

Notas:

- `canvas.navigate` aceita **caminhos locais de canvas**, URLs `http(s)` e URLs `file://`.
- Se você passar `"/"`, o Canvas mostra a estrutura local ou o `index.html`.

## A2UI no Canvas

O A2UI é hospedado pelo host de canvas do Gateway e renderizado dentro do painel Canvas. Quando o Gateway anuncia um host de Canvas, o app macOS navega automaticamente para a página host do A2UI na primeira abertura.

URL padrão do host A2UI:

```
http://<gateway-host>:18793/__zero__/a2ui/
```

### Comandos A2UI (v0.8)

O Canvas aceita atualmente mensagens servidor→cliente **A2UI v0.8**:

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

`createSurface` (v0.9) não é suportado.

Exemplo de CLI:

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

zero nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

Teste rápido (Smoke check):

```bash
zero nodes canvas a2ui push --node <id> --text "Olá do A2UI"
```

## Disparando execuções do agente a partir do Canvas

O Canvas pode disparar novas execuções do agente via links diretos (deep links):

- `zero://agent?...`

Exemplo (em JS):

```js
window.location.href = "zero://agent?message=Revisar%20este%20design";
```

O app solicita confirmação, a menos que uma chave válida seja fornecida.

## Notas de segurança

- O esquema do Canvas bloqueia a travessia de diretórios; os arquivos devem residir na raiz da sessão.
- O conteúdo local do Canvas usa um esquema personalizado (não requer servidor de loopback).
- URLs externas `http(s)` são permitidas apenas quando navegadas explicitamente.
