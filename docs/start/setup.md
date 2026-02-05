---
summary: "Guia de configuração: mantenha seu ZERO personalizado enquanto se mantém atualizado"
read_when:
  - Configurando uma nova máquina
  - Você quer as funcionalidades mais recentes sem quebrar sua configuração pessoal
---

# Configuração

Última atualização: 01-01-2026

## Resumo (TL;DR)

- **A personalização vive fora do repositório:** `~/zero` (espaço de trabalho) + `~/.zero/zero.json` (configuração).
- **Fluxo estável:** instale o app para macOS; deixe-o executar o Gateway integrado.
- **Fluxo experimental ("Bleeding edge"):** execute o Gateway você mesmo via `pnpm gateway:watch` e anexe o app para macOS no modo Local.

## Pré-requisitos (a partir do código-fonte)

- Node `>=22`
- `pnpm`
- Docker (opcional; apenas para configuração em contêiner/e2e — veja [Docker](/install/docker))

## Estratégia de personalização (para que as atualizações não doam)

Se você quer algo "100% personalizado para mim" *e* atualizações fáceis, mantenha suas customizações em:

- **Configuração:** `~/.zero/zero.json` (formato JSON/JSON5)
- **Espaço de Trabalho:** `~/zero` (habilidades, prompts, memórias; transforme em um repositório git privado)

Faça o bootstrap inicial:

```bash
zero setup
```

De dentro deste repositório, use a entrada local da CLI:

```bash
zero setup
```

Se você ainda não tem uma instalação global, execute via `pnpm zero setup`.

## Fluxo estável (app macOS primeiro)

1) Instale e inicie o **ZERO.app** (barra de menu).
2) Complete o checklist de integração/permissões (solicitações TCC).
3) Certifique-se de que o Gateway está em modo **Local** e em execução (o app o gerencia).
4) Vincule superfícies (exemplo: WhatsApp):

```bash
zero channels login
```

1) Verificação de sanidade:

```bash
zero health
```

Se a integração (onboarding) não estiver disponível em sua build:

- Execute `zero setup`, depois `zero channels login`, e então inicie o Gateway manualmente (`zero gateway`).

## Fluxo experimental (Gateway no terminal)

Objetivo: trabalhar no Gateway TypeScript, obter hot reload e manter a UI do app macOS conectada.

### 0) (Opcional) Execute o app macOS a partir do código também

Se você também quer o app macOS na vanguarda:

```bash
./scripts/restart-mac.sh
```

### 1) Inicie o Gateway de desenvolvimento

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` executa o gateway em modo de observação e recarrega em alterações no TypeScript.

### 2) Aponte o app macOS para o seu Gateway em execução

No **ZERO.app**:

- Modo de Conexão: **Local**
O app se conectará ao gateway em execução na porta configurada.

### 3) Verifique

- O status do Gateway no app deve indicar **“Using existing gateway …”** (Usando gateway existente...)
- Ou via CLI:

```bash
zero health
```

### Armadilhas comuns

- **Porta errada:** O WS do Gateway padroniza para `ws://127.0.0.1:18789`; mantenha o app + CLI na mesma porta.
- **Onde o estado reside:**
  - Credenciais: `~/.zero/credentials/`
  - Sessões: `~/.zero/agents/<agentId>/sessions/`
  - Logs: `/tmp/zero/`

## Atualizando (sem destruir sua configuração)

- Mantenha `~/zero` e `~/.zero/` como "suas coisas"; não coloque prompts ou configurações pessoais no repositório `zero`.
- Atualizando o código: `git pull` + `pnpm install` (quando o lockfile mudar) + continue usando `pnpm gateway:watch`.

## Linux (serviço de usuário systemd)

As instalações no Linux usam um serviço de **usuário** systemd. Por padrão, o systemd para os serviços do usuário ao fazer logout ou em inatividade, o que mata o Gateway. A integração tenta habilitar a permanência (linger) para você (pode solicitar sudo). Se ainda estiver desativado, execute:

```bash
sudo loginctl enable-linger $USER
```

Para servidores sempre ativos ou multiusuários, considere um serviço de **sistema** em vez de um serviço de usuário (não é necessário linger). Veja o [manual do Gateway](/gateway) para notas sobre o systemd.

## Documentos relacionados

- [Manual do Gateway](/gateway) (sinalizadores, supervisão, portas)
- [Configuração do Gateway](/gateway/configuration) (esquema de configuração + exemplos)
- [Discord](/channels/discord) e [Telegram](/channels/telegram) (etiquetas de resposta + configurações de replyToMode)
- [Configuração do assistente ZERO](/start/zero)
- [App para macOS](/platforms/macos) (ciclo de vida do gateway)
