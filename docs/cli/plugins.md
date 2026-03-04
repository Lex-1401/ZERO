---
summary: "Referência CLI para `zero plugins` (list, install, enable/disable, doctor)"
read_when:
  - Você quer instalar ou gerenciar plugins de Gateway in-process
  - Você quer depurar falhas de carregamento de plugin
---

# `zero plugins`

Gerencie plugins/extensões de Gateway (carregados in-process).

Relacionado:

- Sistema de Plugin: [Plugins](/plugin)
- Manifesto de Plugin + schema: [Plugin manifest](/plugins/manifest)
- Endurecimento de segurança: [Security](/gateway/security)

## Comandos

```bash
zero plugins list
zero plugins info <id>
zero plugins enable <id>
zero plugins disable <id>
zero plugins doctor
zero plugins update <id>
zero plugins update --all
```

Plugins empacotados vêm com ZERO mas iniciam desativados. Use `plugins enable` para
ativá-los.

Todos os plugins devem incluir um arquivo `zero.plugin.json` com um Schema JSON inline
(`configSchema`, mesmo se vazio). Manifestos faltantes/inválidos ou schemas previnem
o plugin de carregar e falham validação de config.

### Install

```bash
zero plugins install <path-or-spec>
```

Nota de segurança: trate instalações de plugin como rodar código. Prefira versões fixadas.

Arquivos suportados: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Use `--link` para evitar copiar um diretório local (adiciona a `plugins.load.paths`):

```bash
zero plugins install -l ./my-plugin
```

### Update

```bash
zero plugins update <id>
zero plugins update --all
zero plugins update <id> --dry-run
```

Atualizações só se aplicam a plugins instalados via npm (rastreados em `plugins.installs`).
