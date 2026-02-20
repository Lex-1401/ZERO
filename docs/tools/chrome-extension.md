---
summary: "Extensão Chrome: deixe o ZERO conduzir sua aba existente do Chrome"
read_when:
  - Você quer que o agente conduza uma aba existente do Chrome (botão na barra de ferramentas)
  - Você precisa de Gateway remoto + automação de navegador local via Tailscale
  - Você quer entender as implicações de segurança do controle do navegador
---

# Extensão Chrome (browser relay)

A extensão do Chrome do ZERO permite que o agente controle suas **abas existentes do Chrome** (sua janela normal do Chrome) em vez de iniciar um perfil separado do Chrome gerenciado pelo zero.

Anexar/desanexar acontece via um **único botão na barra de ferramentas do Chrome**.

## O que é (conceito)

Existem três partes:

- **Servidor de controle do navegador** (HTTP): a API que o agente/ferramenta chama (`browser.controlUrl`)
- **Servidor de relay local** (loopback CDP): faz a ponte entre o servidor de controle e a extensão (`http://127.0.0.1:18792` por padrão)
- **Extensão Chrome MV3**: anexa à aba ativa usando `chrome.debugger` e canaliza mensagens CDP para o relay

O ZERO então controla a aba anexada através da superfície normal da ferramenta `browser` (selecionando o perfil correto).

## Instalar / carregar (unpacked)

1) Instale a extensão em um caminho local estável:

```bash
zero browser extension install
```

1) Imprima o caminho do diretório da extensão instalada:

```bash
zero browser extension path
```

1) Chrome → `chrome://extensions`

- Ative o “Modo do desenvolvedor”
- “Carregar sem compactação” → selecione o diretório impresso acima

1) Fixe a extensão.

## Atualizações (sem etapa de build)

A extensão é enviada dentro da versão do ZERO (pacote npm) como arquivos estáticos. Não há etapa de “build” separada.

Após atualizar o ZERO:

- Re-execute `zero browser extension install` para atualizar os arquivos instalados sob seu diretório de estado ZERO.
- Chrome → `chrome://extensions` → clique em “Recarregar” na extensão.

## Uso (sem configuração extra)

O ZERO vem com um perfil de navegador embutido chamado `chrome` que visa o relay da extensão na porta padrão.

Use-o:

- CLI: `zero browser --browser-profile chrome tabs`
- Ferramenta de agente: `browser` com `profile="chrome"`

Se você quiser um nome diferente ou uma porta de relay diferente, crie seu próprio perfil:

```bash
zero browser create-profile \
  --name meu-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

## Anexar / desanexar (botão da barra de ferramentas)

- Abra a aba que você quer que o ZERO controle.
- Clique no ícone da extensão.
  - O emblema mostra `ON` quando anexado.
- Clique novamente para desanexar.

## Qual aba ele controla?

- Ele **não** controla automaticamente “qualquer aba que você esteja olhando”.
- Ele controla **apenas a(s) aba(s) que você anexou explicitamente** clicando no botão da barra de ferramentas.
- Para trocar: abra a outra aba e clique no ícone da extensão lá.

## Emblema + erros comuns

- `ON`: anexado; ZERO pode conduzir essa aba.
- `…`: conectando ao relay local.
- `!`: relay não acessível (mais comum: servidor de relay do navegador não está rodando nesta máquina).

Se você vir `!`:

- Certifique-se de que o Gateway está rodando localmente (configuração padrão), ou execute `zero browser serve` nesta máquina (configuração de gateway remoto).
- Abra a página de Opções da extensão; ela mostra se o relay é acessível.

## Eu preciso de `zero browser serve`?

### Gateway Local (mesma máquina que o Chrome) — geralmente **não**

Se o Gateway está rodando na mesma máquina que o Chrome e seu `browser.controlUrl` é loopback (padrão),
você normalmente **não** precisa de `zero browser serve`.

O servidor de controle de navegador integrado do Gateway iniciará em `http://127.0.0.1:18791/` e o ZERO irá
auto-iniciar o servidor de relay local em `http://127.0.0.1:18792/`.

### Gateway Remoto (Gateway roda em outro lugar) — **sim**

Se o seu Gateway roda em outra máquina, execute `zero browser serve` na máquina que roda o Chrome
(e publique-o via Tailscale Serve / TLS). Veja a seção abaixo.

## Sandboxing (contêineres de ferramentas)

Se a sessão do seu agente estiver em sandbox (`agents.defaults.sandbox.mode != "off"`), a ferramenta `browser` pode ser restrita:

- Por padrão, sessões em sandbox frequentemente visam o **navegador sandbox** (`target="sandbox"`), não o seu Chrome host.
- A tomada de controle do relay de extensão do Chrome requer o controle do servidor de navegador **host**.

Opções:

- Mais fácil: use a extensão de uma sessão/agente **sem sandbox**.
- Ou permita o controle do navegador host para sessões em sandbox:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true
        }
      }
    }
  }
}
```

Então garanta que a ferramenta não seja negada pela política de ferramentas e (se necessário) chame `browser` com `target="host"`.

Depurando: `zero sandbox explain`

## Gateway Remoto (recomendado: Tailscale Serve)

Objetivo: Gateway roda em uma máquina, mas o Chrome roda em outro lugar.

Na **máquina do navegador**:

```bash
zero browser serve --bind 127.0.0.1 --port 18791 --token <token>
tailscale serve https / http://127.0.0.1:18791
```

Na **máquina do Gateway**:

- Defina `browser.controlUrl` para a URL HTTPS do Serve (MagicDNS/ts.net).
- Forneça o token (prefira env):

```bash
export ZERO_BROWSER_CONTROL_TOKEN="<token>"
```

Então o agente pode conduzir o navegador chamando a API remota `browser.controlUrl`, enquanto a extensão + relay permanecem locais na máquina do navegador.

## Como funciona o “extension path”

`zero browser extension path` imprime o diretório **instalado** no disco contendo os arquivos da extensão.

A CLI intencionalmente **não** imprime um caminho `node_modules`. Sempre execute `zero browser extension install` primeiro para copiar a extensão para um local estável sob seu diretório de estado ZERO.

Se você mover ou excluir esse diretório de instalação, o Chrome marcará a extensão como quebrada até que você a recarregue de um caminho válido.

## Implicações de segurança (leia isto)

Isso é poderoso e arriscado. Trate como dar ao modelo “mãos no seu navegador”.

- A extensão usa a API de depurador do Chrome (`chrome.debugger`). Quando anexado, o modelo pode:
  - clicar/digitar/navegar naquela aba
  - ler o conteúdo da página
  - acessar o que a sessão logada da aba puder acessar
- **Isso não é isolado** como o perfil dedicado gerenciado pelo zero.
  - Se você anexar ao seu perfil/aba de uso diário, você está concedendo acesso ao estado daquela conta.

Recomendações:

- Prefira um perfil dedicado do Chrome (separado da sua navegação pessoal) para uso do relay da extensão.
- Mantenha o servidor de controle do navegador apenas em tailnet (Tailscale) e exija um token.
- Evite expor o controle do navegador via LAN (`0.0.0.0`) e evite Funnel (público).

Relacionado:

- Visão geral da ferramenta de navegador: [Browser](/tools/browser)
- Auditoria de segurança: [Security](/gateway/security)
- Configuração do Tailscale: [Tailscale](/gateway/tailscale)
