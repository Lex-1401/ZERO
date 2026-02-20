---
summary: "App de nó iOS: conexão ao Gateway, emparelhamento, canvas e solução de problemas"
read_when:
  - Emparelhando ou reconectando o nó iOS
  - Executando o app iOS a partir do código-fonte
  - Depurando o descobrimento do gateway ou comandos de canvas
---
# Aplicativo iOS (Nó)

Disponibilidade: prévia interna. O aplicativo iOS ainda não é distribuído publicamente.

## O que ele faz

- Conecta-se a um Gateway via WebSocket (LAN ou tailnet).
- Expõe capacidades do nó: Canvas, Captura de tela, Captura de câmera, Localização, Modo de conversa, Wake por voz.
- Recebe comandos `node.invoke` e relata eventos de status do nó.

## Requisitos

- Gateway rodando em outro dispositivo (macOS, Linux ou Windows via WSL2).
- Caminho de rede:
  - Mesma LAN via Bonjour, **ou**
  - Tailnet via DNS-SD unicast (`zero.internal.`), **ou**
  - Host/porta manual (fallback).

## Início rápido (emparelhar + conectar)

1) Inicie o Gateway:

```bash
zero gateway --port 18789
```

1) No app iOS, abra as Configurações e escolha um gateway descoberto (ou habilite Manual Host e insira o host/porta).

2) Aprove a solicitação de emparelhamento no host do gateway:

```bash
zero nodes pending
zero nodes approve <requestId>
```

1) Verifique a conexão:

```bash
zero nodes status
zero gateway call node.list --params "{}"
```

## Caminhos de descobrimento

### Bonjour (LAN)

O Gateway anuncia `_zero._tcp` em `local.`. O app iOS lista esses automaticamente.

### Tailnet (entre redes)

Se o mDNS estiver bloqueado, use uma zona DNS-SD unicast (domínio recomendado: `zero.internal.`) e o DNS split do Tailscale.
Veja [Bonjour](/gateway/bonjour) para o exemplo do CoreDNS.

### Host/porta manual

Nas Configurações, habilite **Manual Host** e insira o host + porta do gateway (padrão `18789`).

## Canvas + A2UI

O nó iOS renderiza um canvas WKWebView. Use `node.invoke` para controlá-lo:

```bash
zero nodes invoke --node "No iOS" --command canvas.navigate --params '{"url":"http://<host-do-gateway>:18793/__zero__/canvas/"}'
```

Notas:

- O host de canvas do Gateway serve `/__zero__/canvas/` e `/__zero__/a2ui/`.
- O nó iOS navega automaticamente para o A2UI ao conectar quando uma URL de host de canvas é anunciada.
- Retorne ao scaffold integrado com `canvas.navigate` e `{"url":""}`.

### Eval / Snapshot de Canvas

```bash
zero nodes invoke --node "No iOS" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__zero; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
zero nodes invoke --node "No iOS" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Wake por voz + modo de conversa

- Wake por voz e modo de conversa estão disponíveis nas Configurações.
- O iOS pode suspender o áudio em segundo plano; trate os recursos de voz como "melhor esforço" quando o aplicativo não estiver ativo.

## Erros comuns

- `NODE_BACKGROUND_UNAVAILABLE`: traga o aplicativo iOS para o primeiro plano (comandos de canvas/câmera/tela exigem isso).
- `A2UI_HOST_NOT_CONFIGURED`: o Gateway não anunciou uma URL de host de canvas; verifique `canvasHost` na [Configuração do Gateway](/gateway/configuration).
- O prompt de emparelhamento nunca aparece: execute `zero nodes pending` e aprove manualmente.
- Falha na reconexão após reinstalação: o token de emparelhamento do Keychain foi limpo; emparelhe o nó novamente.

## Documentos relacionados

- [Emparelhamento](/gateway/pairing)
- [Descobrimento](/gateway/discovery)
- [Bonjour](/gateway/bonjour)
