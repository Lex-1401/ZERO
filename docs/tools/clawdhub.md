---
summary: "Guia ZeroHub: registro público de habilidades + fluxos de CLI"
read_when:
  - Introduzindo o ZeroHub para novos usuários
  - Instalando, pesquisando ou publicando habilidades
  - Explicando flags da CLI do ZeroHub e comportamento de sincronização
---

# ZeroHub

O ZeroHub é o **registro público de habilidades para o ZERO**. É um serviço gratuito: todas as habilidades são públicas, abertas e visíveis para todos para compartilhamento e reutilização. Uma habilidade (skill) é apenas uma pasta com um arquivo `SKILL.md` (mais arquivos de texto de suporte). Você pode navegar pelas habilidades no web app ou usar a CLI para pesquisar, instalar, atualizar e publicar habilidades.

Site: [zerohub.com](https://zerohub.com)

## Para quem é (para iniciantes)

Se você quer adicionar novas capacidades ao seu agente ZERO, o ZeroHub é a maneira mais fácil de encontrar e instalar habilidades. Você não precisa saber como o backend funciona. Você pode:

- Pesquisar habilidades por linguagem natural.
- Instalar uma habilidade em seu espaço de trabalho.
- Atualizar habilidades mais tarde com um comando.
- Fazer backup de suas próprias habilidades publicando-as.

## Início rápido (não-técnico)

1) Instale a CLI (veja próxima seção).
2) Pesquise por algo que você precisa:
   - `zerohub search "calendar"`
3) Instale uma habilidade:
   - `zerohub install <skill-slug>`
4) Inicie uma nova sessão do ZERO para que ele carregue a nova habilidade.

## Instale a CLI

Escolha um:

```bash
npm i -g zerohub
```

```bash
pnpm add -g zerohub
```

## Como se encaixa no ZERO

Por padrão, a CLI instala habilidades em `./skills` sob seu diretório de trabalho atual. Se um espaço de trabalho do ZERO estiver configurado, `zerohub` recorre a esse espaço de trabalho, a menos que você substitua `--workdir` (ou `CLAWDHUB_WORKDIR`). O ZERO carrega habilidades do espaço de trabalho a partir de `<workspace>/skills` e as carregará na **próxima** sessão. Se você já usa `~/.zero/skills` ou habilidades empacotadas, as habilidades do espaço de trabalho têm precedência.

Para mais detalhes sobre como as habilidades são carregadas, compartilhadas e restritas, veja
[Skills](/tools/skills).

## O que o serviço oferece (recursos)

- **Navegação pública** de habilidades e seu conteúdo `SKILL.md`.
- **Pesquisa** alimentada por embeddings (busca vetorial), não apenas palavras-chave.
- **Versionamento** com semver, changelogs e tags (incluindo `latest`).
- **Downloads** como um zip por versão.
- **Estrelas e comentários** para feedback da comunidade.
- **Moderação** hooks para aprovações e auditorias.
- **API amigável para CLI** para automação e scripts.

## Comandos e parâmetros da CLI

Opções globais (aplicam-se a todos os comandos):

- `--workdir <dir>`: Diretório de trabalho (padrão: diretório atual; recorre ao espaço de trabalho do ZERO).
- `--dir <dir>`: Diretório de habilidades, relativo ao workdir (padrão: `skills`).
- `--site <url>`: URL base do site (login via navegador).
- `--registry <url>`: URL base da API do registro.
- `--no-input`: Desativa prompts (não-interativo).
- `-V, --cli-version`: Imprime a versão da CLI.

Autenticação:

- `zerohub login` (fluxo de navegador) ou `zerohub login --token <token>`
- `zerohub logout`
- `zerohub whoami`

Opções:

- `--token <token>`: Cola um token de API.
- `--label <label>`: Rótulo armazenado para tokens de login via navegador (padrão: `CLI token`).
- `--no-browser`: Não abre um navegador (requer `--token`).

Pesquisa:

- `zerohub search "query"`
- `--limit <n>`: Máximo de resultados.

Instalar:

- `zerohub install <slug>`
- `--version <version>`: Instala uma versão específica.
- `--force`: Sobrescreve se a pasta já existir.

Atualizar:

- `zerohub update <slug>`
- `zerohub update --all`
- `--version <version>`: Atualiza para uma versão específica (apenas slug único).
- `--force`: Sobrescreve quando arquivos locais não correspondem a nenhuma versão publicada.

Listar:

- `zerohub list` (lê `.zerohub/lock.json`)

Publicar:

- `zerohub publish <path>`
- `--slug <slug>`: Slug da habilidade.
- `--name <name>`: Nome de exibição.
- `--version <version>`: Versão semver.
- `--changelog <text>`: Texto do changelog (pode estar vazio).
- `--tags <tags>`: Tags separadas por vírgula (padrão: `latest`).

Excluir/restaurar (apenas proprietário/admin):

- `zerohub delete <slug> --yes`
- `zerohub undelete <slug> --yes`

Sincronizar (escaneia habilidades locais + publica novas/editadas):

- `zerohub sync`
- `--root <dir...>`: Raízes de escaneamento extras.
- `--all`: Envia tudo sem prompts.
- `--dry-run`: Mostra o que seria enviado.
- `--bump <type>`: `patch|minor|major` para atualizações (padrão: `patch`).
- `--changelog <text>`: Changelog para atualizações não-interativas.
- `--tags <tags>`: Tags separadas por vírgula (padrão: `latest`).
- `--concurrency <n>`: Verificações de registro simultâneas (padrão: 4).

## Fluxos de trabalho comuns para agentes

### Pesquisar por habilidades

```bash
zerohub search "postgres backups"
```

### Baixar novas habilidades

```bash
zerohub install my-skill-pack
```

### Atualizar habilidades instaladas

```bash
zerohub update --all
```

### Fazer backup de suas habilidades (publicar ou sincronizar)

Para uma única pasta de habilidade:

```bash
zerohub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

Para escanear e fazer backup de muitas habilidades de uma vez:

```bash
zerohub sync --all
```

## Detalhes avançados (técnico)

### Versionamento e tags

- Cada publicação cria uma nova `SkillVersion` **semver**.
- Tags (como `latest`) apontam para uma versão; mover tags permite reverter (roll back).
- Changelogs são anexados por versão e podem estar vazios ao sincronizar ou publicar atualizações.

### Alterações locais vs versões do registro

As atualizações comparam o conteúdo da habilidade local com as versões do registro usando um hash de conteúdo. Se os arquivos locais não corresponderem a nenhuma versão publicada, a CLI pergunta antes de sobrescrever (ou requer `--force` em execuções não-interativas).

### Escaneamento de sincronização e raízes de fallback

`zerohub sync` escaneia seu workdir atual primeiro. Se nenhuma habilidade for encontrada, ele recorre a locais legados conhecidos (por exemplo `~/zero/skills` e `~/.zero/skills`). Isso é projetado para encontrar instalações de habilidades mais antigas sem flags extras.

### Armazenamento e lockfile

- Habilidades instaladas são registradas em `.zerohub/lock.json` sob seu workdir.
- Tokens de autenticação são armazenados no arquivo de configuração da CLI ZeroHub (sobrescreva via `CLAWDHUB_CONFIG_PATH`).

### Telemetria (contagens de instalação)

Quando você executa `zerohub sync` enquanto logado, a CLI envia um snapshot mínimo para computar contagens de instalação. Você pode desativar isso inteiramente:

```bash
export CLAWDHUB_DISABLE_TELEMETRY=1
```

## Variáveis de ambiente

- `CLAWDHUB_SITE`: Sobrescreve a URL do site.
- `CLAWDHUB_REGISTRY`: Sobrescreve a URL da API do registro.
- `CLAWDHUB_CONFIG_PATH`: Sobrescreve onde a CLI armazena o token/config.
- `CLAWDHUB_WORKDIR`: Sobrescreve o workdir padrão.
- `CLAWDHUB_DISABLE_TELEMETRY=1`: Desativa a telemetria no `sync`.
