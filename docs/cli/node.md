---
summary: "Referência CLI para `zero node` (host de nó headless)"
read_when:
  - Rodando o host de nó headless
  - Emparelhando um nó não-macOS para system.run
---

# `zero node`

Execute um **host de nó headless** que se conecta ao WebSocket do Gateway e expõe
`system.run` / `system.which` nesta máquina.

## Por que usar um host de nó?

Use um host de nó quando você quer que agentes **executem comandos em outras máquinas** na sua
rede sem instalar um app macOS completo lá.

Casos de uso comuns:

- Rodar comandos em caixas Linux/Windows remotas (servidores de build, máquinas de lab, NAS).
- Manter exec **sandboxado** no gateway, mas delegar execuções aprovadas para outros hosts.
- Fornecer um alvo de execução leve e headless para automação ou nós CI.

A execução ainda é protegida por **aprovações de exec** e allowlists por agente no
host de nó, então você pode manter acesso de comando escopado e explícito.

## Proxy de Browser (zero-config)

Hosts de nó anunciam automaticamente um proxy de browser se `browser.enabled` não estiver
desativado no nó. Isso permite que o agente use automação de browser naquele nó
sem configuração extra.

Desative no nó se necessário:

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false
    }
  }
}
```

## Executar (foreground)

```bash
zero node run --host <gateway-host> --port 18789
```

Opções:

- `--host <host>`: Host WebSocket do Gateway (padrão: `127.0.0.1`)
- `--port <porta>`: Porta WebSocket do Gateway (padrão: `18789`)
- `--tls`: Usar TLS para a conexão do gateway
- `--tls-fingerprint <sha256>`: Impressão digital de certificado TLS esperada (sha256)
- `--node-id <id>`: Sobrescrever id do nó (limpa token de emparelhamento)
- `--display-name <nome>`: Sobrescrever o nome de exibição do nó

## Serviço (background)

Instale um host de nó headless como serviço de usuário.

```bash
zero node install --host <gateway-host> --port 18789
```

Opções:

- `--host <host>`: Host WebSocket do Gateway (padrão: `127.0.0.1`)
- `--port <porta>`: Porta WebSocket do Gateway (padrão: `18789`)
- `--tls`: Usar TLS para a conexão do gateway
- `--tls-fingerprint <sha256>`: Impressão digital de certificado TLS esperada (sha256)
- `--node-id <id>`: Sobrescrever id do nó (limpa token de emparelhamento)
- `--display-name <nome>`: Sobrescrever o nome de exibição do nó
- `--runtime <runtime>`: Runtime do serviço (`node` ou `bun`)
- `--force`: Reinstalar/sobrescrever se já instalado

Gerenciar o serviço:

```bash
zero node status
zero node stop
zero node restart
zero node uninstall
```

Use `zero node run` para um host de nó foreground (sem serviço).

Comandos de serviço aceitam `--json` para saída legível por máquina.

## Emparelhamento

A primeira conexão cria uma requisição de par de nó pendente no Gateway.
Aprove via:

```bash
zero nodes pending
zero nodes approve <requestId>
```

O host de nó armazena seu id de nó, token, nome de exibição e info de conexão de gateway em
`~/.zero/node.json`.

## Aprovações de Exec

`system.run` é protegido por aprovações de exec locais:

- `~/.zero/exec-approvals.json`
- [Exec approvals](/tools/exec-approvals)
- `zero approvals --node <id|name|ip>` (editar do Gateway)
