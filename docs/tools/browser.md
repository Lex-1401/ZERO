---
summary: "Servidor de controle de navegador integrado + comandos de ação"
read_when:
  - Adicionando automação de navegador controlada por agente
  - Depurando por que o zero está interferindo com seu Chrome
  - Implementando configurações de navegador + ciclo de vida no app macOS
---

# Navegador (gerenciado pelo Zero)

O ZERO pode executar um **perfil dedicado do Chrome/Brave/Edge/Chromium** que o agente controla.
Ele é isolado do seu navegador pessoal e é gerenciado por meio de um pequeno servidor de controle local.

Visão para iniciantes:

- Pense nele como um **navegador separado, apenas para o agente**.
- O perfil `zero` **não** toca no seu perfil de navegador pessoal.
- O agente pode **abrir abas, ler páginas, clicar e digitar** em uma via segura.
- O perfil padrão `chrome` usa o **navegador Chromium padrão do sistema** via relay de extensão; mude para `zero` para o navegador gerenciado isolado.

## O que você ganha

- Um perfil de navegador separado chamado **zero** (acento laranja por padrão).
- Controle de abas determinístico (listar/abrir/focar/fechar).
- Ações do agente (clicar/digitar/arrastar/selecionar), snapshots, capturas de tela, PDFs.
- Suporte opcional a múltiplos perfis (`zero`, `work`, `remote`, ...).

Este navegador **não** é seu navegador diário. É uma superfície segura e isolada para
automação e verificação do agente.

## Início rápido

```bash
zero browser --browser-profile zero status
zero browser --browser-profile zero start
zero browser --browser-profile zero open https://example.com
zero browser --browser-profile zero snapshot
```

Se você receber “Browser disabled”, ative-o na configuração (veja abaixo) e reinicie o Gateway.

## Perfis: `zero` vs `chrome`

- `zero`: navegador gerenciado e isolado (sem extensão necessária).
- `chrome`: relay de extensão para o seu **navegador do sistema** (requer que a extensão ZERO esteja anexada a uma aba).

Defina `browser.defaultProfile: "zero"` se desejar o modo gerenciado por padrão.

## Configuração

As configurações do navegador ficam em `~/.zero/zero.json`.

```json5
{
  browser: {
    enabled: true,                    // padrão: true
    controlUrl: "http://127.0.0.1:18791",
    cdpUrl: "http://127.0.0.1:18792", // padroniza para controlUrl + 1
    remoteCdpTimeoutMs: 1500,         // timeout HTTP CDP remoto (ms)
    remoteCdpHandshakeTimeoutMs: 3000, // timeout de handshake WebSocket CDP remoto (ms)
    defaultProfile: "chrome",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      zero: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" }
    }
  }
}
```

Notas:

- `controlUrl` padroniza para `http://127.0.0.1:18791`.
- Se você sobrescrever a porta do Gateway (`gateway.port` ou `ZERO_GATEWAY_PORT`),
  as portas padrão do navegador mudam para permanecer na mesma “família” (controle = gateway + 2).
- `cdpUrl` padroniza para `controlUrl + 1` quando não definido.
- `remoteCdpTimeoutMs` aplica-se a verificações de acessibilidade CDP remotas (não-loopback).
- `remoteCdpHandshakeTimeoutMs` aplica-se a verificações de acessibilidade WebSocket CDP remotas.
- `attachOnly: true` significa “nunca inicie um navegador local; apenas anexe se ele já estiver em execução.”
- `color` + `color` por perfil tingem a interface do navegador para que você possa ver qual perfil está ativo.
- O perfil padrão é `chrome` (relay de extensão). Use `defaultProfile: "zero"` para o navegador gerenciado.
- Ordem de detecção automática: navegador padrão do sistema se for baseado em Chromium; caso contrário Chrome → Brave → Edge → Chromium → Chrome Canary.
- Perfis locais `zero` atribuem automaticamente `cdpPort`/`cdpUrl` — defina-os apenas para CDP remoto.

## Use Brave (ou outro navegador baseado em Chromium)

Se o seu navegador **padrão do sistema** for baseado em Chromium (Chrome/Brave/Edge/etc),
o ZERO o usa automaticamente. Defina `browser.executablePath` para sobrescrever a detecção automática:

Exemplo CLI:

```bash
zero config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## Controle local vs remoto

- **Controle local (padrão):** `controlUrl` é loopback (`127.0.0.1`/`localhost`).
  O Gateway inicia o servidor de controle e pode lançar um navegador local.
- **Controle remoto:** `controlUrl` é não-loopback. O Gateway **não inicia**
  um servidor local; ele assume que você está apontando para um servidor existente em outro lugar.
- **CDP Remoto:** defina `browser.profiles.<name>.cdpUrl` (ou `browser.cdpUrl`) para
  anexar a um navegador remoto baseado em Chromium. Nesse caso, o ZERO não iniciará um navegador local.

## Navegador remoto (servidor de controle)

Você pode executar o **servidor de controle do navegador** em outra máquina e apontar seu
Gateway para ele com um `controlUrl` remoto. Isso permite que o agente conduza um navegador
fora do host (caixa de laboratório, VM, desktop remoto, etc.).

Pontos chave:

- O **servidor de controle** fala com navegadores baseados em Chromium (Chrome/Brave/Edge/Chromium) via **CDP**.
- O **Gateway** precisa apenas da URL de controle HTTP.
- Os perfis são resolvidos no lado do **servidor de controle**.

Exemplo:

```json5
{
  browser: {
    enabled: true,
    controlUrl: "http://10.0.0.42:18791",
    defaultProfile: "work"
  }
}
```

Use `profiles.<name>.cdpUrl` para **CDP remoto** se desejar que o Gateway fale
diretamente com uma instância de navegador baseada em Chromium sem um servidor de controle remoto.

URLs CDP remotas podem incluir autenticação:

- Tokens de consulta (ex: `https://provider.example?token=<token>`)
- Autenticação básica HTTP (ex: `https://user:pass@provider.example`)

O ZERO preserva a autenticação ao chamar endpoints `/json/*` e ao conectar
ao WebSocket CDP. Prefira variáveis de ambiente ou gerenciadores de segredos para
tokens em vez de confirmá-los em arquivos de configuração.

### Proxy de navegador Node (padrão zero-config)

Se você executar um **host node** na máquina que possui seu navegador, o ZERO pode
rotear automaticamente chamadas de ferramentas de navegador para esse nó sem qualquer configuração personalizada de `controlUrl`.
Este é o caminho padrão para gateways remotos.

Notas:

- O host node expõe seu servidor de controle de navegador local via um **comando proxy**.
- Os perfis vêm da própria configuração `browser.profiles` do nó (igual à local).
- Desative se não quiser:
  - No nó: `nodeHost.browserProxy.enabled=false`
  - No gateway: `gateway.nodes.browser.mode="off"`

### Browserless (CDP remoto hospedado)

[Browserless](https://browserless.io) é um serviço Chromium hospedado que expõe
endpoints CDP via HTTPS. Você pode apontar um perfil de navegador ZERO para um
endpoint de região Browserless e autenticar com sua chave de API.

Exemplo:

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00"
      }
    }
  }
}
```

Notas:

- Substitua `<BROWSERLESS_API_KEY>` pelo seu token real do Browserless.
- Escolha o endpoint da região que corresponde à sua conta Browserless (veja a documentação deles).

### Executando o servidor de controle na máquina do navegador

Execute um servidor de controle de navegador independente (recomendado quando seu Gateway é remoto):

```bash
# na máquina que executa Chrome/Brave/Edge
zero browser serve --bind <browser-host> --port 18791 --token <token>
```

Então aponte seu Gateway para ele:

```json5
{
  browser: {
    enabled: true,
    controlUrl: "http://<browser-host>:18791",

    // Opção A (recomendado): mantenha o token no env no Gateway
    // (evite escrever segredos em arquivos de configuração)
    // controlToken: "<token>"
  }
}
```

E defina o token de autenticação no ambiente do Gateway:

```bash
export ZERO_BROWSER_CONTROL_TOKEN="<token>"
```

Opção B: armazene o token na configuração do Gateway (mesmo token compartilhado):

```json5
{
  browser: {
    enabled: true,
    controlUrl: "http://<browser-host>:18791",
    controlToken: "<token>"
  }
}
```

## Segurança

Esta seção cobre o **servidor de controle do navegador** (`browser.controlUrl`) usado para automação de navegador do agente.

Ideias chave:

- Trate o servidor de controle do navegador como uma API de administração: **apenas rede privada**.
- Use **autenticação por token** sempre que o servidor for acessível fora da máquina.
- Prefira conectividade **apenas via Tailnet** em vez de exposição na LAN.

### Tokens (o que é compartilhado com o quê?)

- `browser.controlToken` / `ZERO_BROWSER_CONTROL_TOKEN` é **apenas** para autenticar requisições HTTP de controle do navegador para `browser.controlUrl`.
- **Não** é o token do Gateway (`gateway.auth.token`) e **não** é um token de pareamento de nó.
- Você *pode* reutilizar o mesmo valor de string, mas é melhor mantê-los separados para reduzir o raio de explosão.

### Binding (não exponha à sua LAN por acidente)

Recomendado:

- Mantenha `zero browser serve` vinculado ao loopback (`127.0.0.1`) e publique-o via Tailscale.
- Ou vincule apenas a um IP Tailnet (nunca `0.0.0.0`) e exija um token.

Evite:

- `--bind 0.0.0.0` (visível na LAN). Mesmo com autenticação por token, o tráfego é HTTP simples, a menos que você também adicione TLS.

### TLS / HTTPS (abordagem recomendada: termine na frente)

Melhor prática aqui: mantenha `zero browser serve` em HTTP e termine o TLS na frente.

Se você já estiver usando Tailscale, tem duas boas opções:

1) **Apenas Tailnet, ainda HTTP** (o transporte é criptografado pelo Tailscale):

- Mantenha `controlUrl` como `http://…` mas garanta que seja acessível apenas pela sua tailnet.

1) **Sirva HTTPS via Tailscale** (boa UX: URL `https://…`):

```bash
# na máquina do navegador
zero browser serve --bind 127.0.0.1 --port 18791 --token <token>
tailscale serve https / http://127.0.0.1:18791
```

Então defina a configuração do Gateway `browser.controlUrl` para a URL HTTPS (MagicDNS/ts.net) e continue usando o mesmo token.

Notas:

- **Não** use Tailscale Funnel para isso, a menos que você queira explicitamente tornar o endpoint público.
- Para configuração/fundo do Tailnet, veja [Superfícies web do Gateway](/web/index) e a [CLI do Gateway](/cli/gateway).

## Perfis (multi-navegador)

O ZERO suporta múltiplos perfis nomeados (configurações de roteamento). Perfis podem ser:

- **gerenciado pelo zero**: uma instância dedicada de navegador baseada em Chromium com seu próprio diretório de dados de usuário + porta CDP
- **remoto**: uma URL CDP explícita (navegador baseado em Chromium rodando em outro lugar)
- **relay de extensão**: sua(s) aba(s) existente(s) do Chrome via relay local + extensão Chrome

Padrões:

- O perfil `zero` é criado automaticamente se estiver faltando.
- O perfil `chrome` é embutido para o relay de extensão do Chrome (aponta para `http://127.0.0.1:18792` por padrão).
- Portas CDP locais alocam de **18800–18899** por padrão.
- Excluir um perfil move seu diretório de dados local para a Lixeira.

Todos os endpoints de controle aceitam `?profile=<name>`; a CLI usa `--browser-profile`.

## Relay de extensão do Chrome (use seu Chrome existente)

O ZERO também pode conduzir **suas abas existentes do Chrome** (sem uma instância separada do Chrome “zero”) via um relay CDP local + uma extensão do Chrome.

Guia completo: [Extensão Chrome](/tools/chrome-extension)

Fluxo:

- Você executa um **servidor de controle de navegador** (Gateway na mesma máquina, ou `zero browser serve`).
- Um **servidor de relay** local escuta em uma `cdpUrl` de loopback (padrão: `http://127.0.0.1:18792`).
- Você clica no ícone da extensão **ZERO Browser Relay** em uma aba para anexar (não anexa automaticamente).
- O agente controla essa aba via ferramenta `browser` normal, selecionando o perfil correto.

Se o Gateway for executado na mesma máquina que o Chrome (configuração padrão), você geralmente **não** precisa de `zero browser serve`.
Use `browser serve` apenas quando o Gateway for executado em outro lugar (modo remoto).

### Sessões em sandbox

Se a sessão do agente estiver em sandbox, a ferramenta `browser` pode padronizar para `target="sandbox"` (navegador sandbox).
A tomada de controle do relay de extensão do Chrome requer controle de navegador host, então:

- execute a sessão sem sandbox, ou
- defina `agents.defaults.sandbox.browser.allowHostControl: true` e use `target="host"` ao chamar a ferramenta.

### Configuração

1) Carregue a extensão (dev/unpacked):

```bash
zero browser extension install
```

- Chrome → `chrome://extensions` → ative “Modo do desenvolvedor”
- “Carregar sem compactação” → selecione o diretório impresso por `zero browser extension path`
- Fixe a extensão e clique nela na aba que deseja controlar (o emblema mostra `ON`).

1) Use-a:

- CLI: `zero browser --browser-profile chrome tabs`
- Ferramenta de agente: `browser` com `profile="chrome"`

Opcional: se você quiser um nome diferente ou porta de relay, crie seu próprio perfil:

```bash
zero browser create-profile \
  --name meu-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

Notas:

- Este modo depende do Playwright-on-CDP para a maioria das operações (screenshots/snapshots/ações).
- Desanexe clicando no ícone da extensão novamente.

## Garantias de isolamento

- **Diretório de dados de usuário dedicado**: nunca toca no seu perfil de navegador pessoal.
- **Portas dedicadas**: evita `9222` para prevenir colisões com fluxos de trabalho de desenvolvimento.
- **Controle de abas determinístico**: abas de destino por `targetId`, não “última aba”.

## Seleção de navegador

Ao iniciar localmente, o ZERO escolhe o primeiro disponível:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Você pode sobrescrever com `browser.executablePath`.

Plataformas:

- macOS: verifica `/Applications` e `~/Applications`.
- Linux: procura por `google-chrome`, `brave`, `microsoft-edge`, `chromium`, etc.
- Windows: verifica locais de instalação comuns.

## API de Controle (opcional)

Se você quiser integrar diretamente, o servidor de controle de navegador expõe uma pequena
API HTTP:

- Status/início/fim: `GET /`, `POST /start`, `POST /stop`
- Abas: `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Snapshot/screenshot: `GET /snapshot`, `POST /screenshot`
- Ações: `POST /navigate`, `POST /act`
- Hooks: `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Downloads: `POST /download`, `POST /wait/download`
- Depuração: `GET /console`, `POST /pdf`
- Depuração: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Rede: `POST /response/body`
- Estado: `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- Estado: `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Configurações: `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Todos os endpoints aceitam `?profile=<name>`.

### Requisito Playwright

Alguns recursos (navegar/agir/snapshot IA/snapshot função, screenshots de elementos, PDF) requerem
Playwright. Se o Playwright não estiver instalado, esses endpoints retornam um erro 501 claro.
Snapshots ARIA e screenshots básicos ainda funcionam para o Chrome gerenciado pelo zero.
Para o driver de relay de extensão do Chrome, snapshots ARIA e screenshots requerem Playwright.

Se você vir `Playwright is not available in this gateway build`, instale o pacote Playwright completo (não `playwright-core`) e reinicie o gateway, ou reinstale o ZERO com suporte ao navegador.

## Como funciona (interno)

Fluxo de alto nível:

- Um pequeno **servidor de controle** aceita requisições HTTP.
- Ele se conecta a navegadores baseados em Chromium (Chrome/Brave/Edge/Chromium) via **CDP**.
- Para ações avançadas (clique/digite/snapshot/PDF), ele usa **Playwright** no topo
  do CDP.
- Quando o Playwright está ausente, apenas operações não-Playwright estão disponíveis.

Esse design mantém o agente em uma interface estável e determinística enquanto permite
trocar navegadores e perfis locais/remotos.

## Referência rápida da CLI

Todos os comandos aceitam `--browser-profile <name>` para atingir um perfil específico.
Todos os comandos também aceitam `--json` para saída legível por máquina (cargas úteis estáveis).

Básico:

- `zero browser status`
- `zero browser start`
- `zero browser stop`
- `zero browser tabs`
- `zero browser tab`
- `zero browser tab new`
- `zero browser tab select 2`
- `zero browser tab close 2`
- `zero browser open https://example.com`
- `zero browser focus abcd1234`
- `zero browser close abcd1234`

Inspeção:

- `zero browser screenshot`
- `zero browser screenshot --full-page`
- `zero browser screenshot --ref 12`
- `zero browser screenshot --ref e12`
- `zero browser snapshot`
- `zero browser snapshot --format aria --limit 200`
- `zero browser snapshot --interactive --compact --depth 6`
- `zero browser snapshot --efficient`
- `zero browser snapshot --labels`
- `zero browser snapshot --selector "#main" --interactive`
- `zero browser snapshot --frame "iframe#main" --interactive`
- `zero browser console --level error`
- `zero browser errors --clear`
- `zero browser requests --filter api --clear`
- `zero browser pdf`
- `zero browser responsebody "**/api" --max-chars 5000`

Ações:

- `zero browser navigate https://example.com`
- `zero browser resize 1280 720`
- `zero browser click 12 --double`
- `zero browser click e12 --double`
- `zero browser type 23 "hello" --submit`
- `zero browser press Enter`
- `zero browser hover 44`
- `zero browser scrollintoview e12`
- `zero browser drag 10 11`
- `zero browser select 9 OptionA OptionB`
- `zero browser download e12 /tmp/report.pdf`
- `zero browser waitfordownload /tmp/report.pdf`
- `zero browser upload /tmp/file.pdf`
- `zero browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `zero browser dialog --accept`
- `zero browser wait --text "Done"`
- `zero browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `zero browser evaluate --fn '(el) => el.textContent' --ref 7`
- `zero browser highlight e12`
- `zero browser trace start`
- `zero browser trace stop`

Estado:

- `zero browser cookies`
- `zero browser cookies set session abc123 --url "https://example.com"`
- `zero browser cookies clear`
- `zero browser storage local get`
- `zero browser storage local set theme dark`
- `zero browser storage session clear`
- `zero browser set offline on`
- `zero browser set headers --json '{"X-Debug":"1"}'`
- `zero browser set credentials user pass`
- `zero browser set credentials --clear`
- `zero browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `zero browser set geo --clear`
- `zero browser set media dark`
- `zero browser set timezone America/New_York`
- `zero browser set locale en-US`
- `zero browser set device "iPhone 14"`

Notas:

- `upload` e `dialog` são chamadas de **armar**; execute-as antes do clique/pressionamento
  que aciona o seletor/diálogo.
- `upload` também pode definir inputs de arquivo diretamente via `--input-ref` ou `--element`.
- `snapshot`:
  - `--format ai` (padrão quando Playwright está instalado): retorna um snapshot de IA com referências numéricas (`aria-ref="<n>"`).
  - `--format aria`: retorna a árvore de acessibilidade (sem refs; apenas inspeção).
  - `--efficient` (ou `--mode efficient`): predefinição de snapshot de função compacta (interativo + compacto + profundidade + maxChars mais baixo).
  - Padrão de configuração (apenas ferramenta/CLI): defina `browser.snapshotDefaults.mode: "efficient"` para usar snapshots eficientes quando o chamador não passar um modo (veja [Configuração do Gateway](/gateway/configuration#browser-zero-managed-browser)).
  - Opções de snapshot de função (`--interactive`, `--compact`, `--depth`, `--selector`) forçam um snapshot baseado em função com referências como `ref=e12`.
  - `--frame "<seletor iframe>"` escopa snapshots de função para um iframe (emparelha com refs de função como `e12`).
  - `--interactive` emite uma lista plana e fácil de escolher de elementos interativos (melhor para conduzir ações).
  - `--labels` adiciona um screenshot apenas da viewport com rótulos de referência sobrepostos (imprime `MEDIA:<path>`).
- `click`/`type`/etc requerem uma `ref` do `snapshot` (seja numérica `12` ou ref de função `e12`).
  Seletores CSS intencionalmente não são suportados para ações.

## Snapshots e refs

O ZERO suporta dois estilos de “snapshot”:

- **Snapshot de IA (refs numéricas)**: `zero browser snapshot` (padrão; `--format ai`)
  - Saída: um snapshot de texto que inclui referências numéricas.
  - Ações: `zero browser click 12`, `zero browser type 23 "hello"`.
  - Internamente, a ref é resolvida via `aria-ref` do Playwright.

- **Snapshot de Função (refs de função como `e12`)**: `zero browser snapshot --interactive` (ou `--compact`, `--depth`, `--selector`, `--frame`)
  - Saída: uma lista/árvore baseada em função com `[ref=e12]` (e `[nth=1]` opcional).
  - Ações: `zero browser click e12`, `zero browser highlight e12`.
  - Internamente, a ref é resolvida via `getByRole(...)` (mais `nth()` para duplicatas).
  - Adicione `--labels` para incluir um screenshot da viewport com rótulos `e12` sobrepostos.

Comportamento de Ref:

- Refs **não são estáveis entre navegações**; se algo falhar, re-execute `snapshot` e use uma ref nova.
- Se o snapshot de função foi tirado com `--frame`, as refs de função são escopadas para aquele iframe até o próximo snapshot de função.

## Wait power-ups (Poderes de espera)

Você pode esperar por mais do que apenas tempo/texto:

- Esperar por URL (globs suportados pelo Playwright):
  - `zero browser wait --url "**/dash"`
- Esperar por estado de carregamento:
  - `zero browser wait --load networkidle`
- Esperar por um predicado JS:
  - `zero browser wait --fn "window.ready===true"`
- Esperar que um seletor se torne visível:
  - `zero browser wait "#main"`

Eles podem ser combinados:

```bash
zero browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Fluxos de trabalho de depuração

Quando uma ação falha (ex: “not visible”, “strict mode violation”, “covered”):

1. `zero browser snapshot --interactive`
2. Use `click <ref>` / `type <ref>` (prefira refs de função no modo interativo)
3. Se ainda falhar: `zero browser highlight <ref>` para ver o que o Playwright está mirando
4. Se a página se comportar de forma estranha:
   - `zero browser errors --clear`
   - `zero browser requests --filter api --clear`
5. Para depuração profunda: grave um trace:
   - `zero browser trace start`
   - reproduza o problema
   - `zero browser trace stop` (imprime `TRACE:<path>`)

## Saída JSON

`--json` é para scripts e ferramentas estruturadas.

Exemplos:

```bash
zero browser status --json
zero browser snapshot --interactive --json
zero browser requests --filter api --json
zero browser cookies --json
```

Snapshots de função em JSON incluem `refs` mais um pequeno bloco `stats` (linhas/chars/refs/interactive) para que as ferramentas possam raciocinar sobre o tamanho e densidade da carga útil.

## Botões de Estado e ambiente

Eles são úteis para fluxos de trabalho do tipo “faça o site se comportar como X”:

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Armazenamento: `storage local|session get|set|clear`
- Offline: `set offline on|off`
- Cabeçalhos: `set headers --json '{"X-Debug":"1"}'` (ou `--clear`)
- Autenticação básica HTTP: `set credentials user pass` (ou `--clear`)
- Geolocalização: `set geo <lat> <lon> --origin "https://example.com"` (ou `--clear`)
- Mídia: `set media dark|light|no-preference|none`
- Fuso horário / localidade: `set timezone ...`, `set locale ...`
- Dispositivo / viewport:
  - `set device "iPhone 14"` (predefinições de dispositivo do Playwright)
  - `set viewport 1280 720`

## Segurança e privacidade

- O perfil de navegador zero pode conter sessões logadas; trate-o como sensível.
- Para logins e notas anti-bot (X/Twitter, etc.), veja [Browser login + X/Twitter posting](/tools/browser-login).
- Mantenha URLs de controle apenas em loopback, a menos que você exponha intencionalmente o servidor.
- Endpoints CDP remotos são poderosos; tunele e proteja-os.

## Solução de problemas

Para problemas específicos do Linux (especialmente snap Chromium), veja
[Browser troubleshooting](/tools/browser-linux-troubleshooting).

## Ferramentas de agente + como o controle funciona

O agente recebe **uma ferramenta** para automação de navegador:

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Como mapeia:

- `browser snapshot` retorna uma árvore de UI estável (IA ou ARIA).
- `browser act` usa o snapshot `ref` IDs para clicar/digitar/arrastar/selecionar.
- `browser screenshot` captura pixels (página inteira ou elemento).
- `browser` aceita:
  - `profile` para escolher um perfil de navegador nomeado (host ou servidor de controle remoto).
  - `target` (`sandbox` | `host` | `custom`) para selecionar onde o navegador reside.
  - `controlUrl` define `target: "custom"` implicitamente (servidor de controle remoto).
  - Em sessões em sandbox, `target: "host"` requer `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Se `target` for omitido: sessões em sandbox padronizam para `sandbox`, sessões não-sandbox padronizam para `host`.
  - Listas de permissão de sandbox podem restringir `target: "custom"` a URLs/hosts/portas específicos.
  - Padrões: listas de permissão não definidas (sem restrição), e o controle do host da sandbox está desativado.

Isso mantém o agente determinístico e evita seletores frágeis.
