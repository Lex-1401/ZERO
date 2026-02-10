---
summary: "Referência CLI para `zero browser` (perfis, abas, ações, relay de extensão, serve remoto)"
read_when:
  - Você usa `zero browser` e quer exemplos para tarefas comuns
  - Você quer controlar um browser remoto via `browser.controlUrl`
  - Você quer usar o relay de extensão Chrome (anexar/desanexar via botão da toolbar)
---

# `zero browser`

Gerencie o servidor de controle de browser do ZERO e execute ações de browser (abas, snapshots, screenshots, navegação, cliques, digitação).

Relacionado:

- Ferramenta de Browser + API: [Browser tool](/tools/browser)
- Relay de extensão Chrome: [Chrome extension](/tools/chrome-extension)

## Flags comuns

- `--url <controlUrl>`: sobrescreve `browser.controlUrl` para esta invocação de comando.
- `--browser-profile <nome>`: escolhe um perfil de browser (padrão vem da config).
- `--json`: saída legível por máquina (onde suportado).

## Início rápido (local)

```bash
zero browser --browser-profile chrome tabs
zero browser --browser-profile zero start
zero browser --browser-profile zero open https://exemplo.com
zero browser --browser-profile zero snapshot
```

## Perfis

Perfis são configurações de roteamento de browser nomeadas. Na prática:

- `zero`: lança/anexa a uma instância Chrome dedicada gerenciada pelo ZERO (dir de dados de usuário isolado).
- `chrome`: controla sua(s) aba(s) Chrome existente(s) via relay de extensão Chrome.

```bash
zero browser profiles
zero browser create-profile --name trabalho --color "#FF5A36"
zero browser delete-profile --name trabalho
```

Use um perfil específico:

```bash
zero browser --browser-profile trabalho tabs
```

## Abas

```bash
zero browser tabs
zero browser open https://github.com/Lex-1401/ZERO/tree/main/docs
zero browser focus <targetId>
zero browser close <targetId>
```

## Snapshot / screenshot / ações

Snapshot:

```bash
zero browser snapshot
```

Screenshot:

```bash
zero browser screenshot
```

Navegar/clicar/digitar (automação de UI baseada em ref):

```bash
zero browser navigate https://exemplo.com
zero browser click <ref>
zero browser type <ref> "ola"
```

## Relay de extensão Chrome (anexar via botão da toolbar)

Este modo permite que o agente controle uma aba Chrome existente que você anexa manualmente (ele não anexa automaticamente).

Instale a extensão desempacotada em um caminho estável:

```bash
zero browser extension install
zero browser extension path
```

Então Chrome → `chrome://extensions` → ative "Developer mode" → "Load unpacked" → selecione a pasta mostrada.

Guia completo: [Chrome extension](/tools/chrome-extension)

## Controle de browser remoto (`zero browser serve`)

Se o Gateway roda em uma máquina diferente do browser, rode um servidor de controle de browser autônomo na máquina que roda o Chrome:

```bash
zero browser serve --bind 127.0.0.1 --port 18791 --token <token>
```

Então aponte o Gateway para ele usando `browser.controlUrl` + `browser.controlToken` (ou `ZERO_BROWSER_CONTROL_TOKEN`).

Segurança + melhores práticas TLS: [Browser tool](/tools/browser), [Tailscale](/gateway/tailscale), [Security](/gateway/security)
