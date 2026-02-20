---
summary: "Etapas de assinatura para builds de depuração (debug) do macOS gerados por scripts de empacotamento"
read_when:
  - Compilando ou assinando builds de depuração do mac
---
# Assinatura mac (builds de depuração)

Este app é geralmente compilado a partir do [`scripts/package-mac-app.sh`](https://github.com/zero/zero/blob/main/scripts/package-mac-app.sh), que agora:

- define um identificador de pacote de depuração estável: `com.zero.mac.debug`
- grava o Info.plist com esse ID de pacote (sobrescreva via `BUNDLE_ID=...`)
- chama o [`scripts/codesign-mac-app.sh`](https://github.com/zero/zero/blob/main/scripts/codesign-mac-app.sh) para assinar o binário principal e o pacote do app para que o macOS trate cada recompilação como o mesmo pacote assinado e mantenha as permissões do TCC (notificações, acessibilidade, gravação de tela, microfone, fala). Para permissões estáveis, use uma identidade de assinatura real; ad-hoc é opcional e frágil (veja [Permissões do macOS](/platforms/mac/permissions)).
- usa `CODESIGN_TIMESTAMP=auto` por padrão; isso habilita carimbos de data/hora confiáveis para assinaturas de Developer ID. Defina `CODESIGN_TIMESTAMP=off` para ignorar o carimbo de data/hora (builds de depuração offline).
- injeta metadados de compilação no Info.plist: `ZEROBuildTimestamp` (UTC) e `ZEROGitCommit` (hash curto) para que o painel Sobre possa exibir o build, git e canal de depuração/lançamento.
- **O empacotamento requer Node 22+**: o script executa builds TS e o build da UI de Controle.
- lê `SIGN_IDENTITY` do ambiente. Adicione `export SIGN_IDENTITY="Apple Development: Seu Nome (TEAMID)"` (ou seu certificado de Developer ID Application) ao seu rc do shell para sempre assinar com seu certificado. A assinatura ad-hoc requer aceitação explícita via `ALLOW_ADHOC_SIGNING=1` ou `SIGN_IDENTITY="-"` (não recomendado para testes de permissão).
- executa uma auditoria de Team ID após a assinatura e falha se qualquer Mach-O dentro do pacote do app estiver assinado por um Team ID diferente. Defina `SKIP_TEAM_ID_CHECK=1` para ignorar.

## Uso

```bash
# da raiz do repositório
scripts/package-mac-app.sh               # seleciona automaticamente a identidade; erro se nenhuma for encontrada
SIGN_IDENTITY="Developer ID Application: Seu Nome" scripts/package-mac-app.sh   # certificado real
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissões não serão mantidas)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # ad-hoc explícito (mesma ressalva)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # contorno para divergência de Team ID do Sparkle apenas em dev
```

### Nota sobre Assinatura Ad-hoc

Ao assinar com `SIGN_IDENTITY="-"` (ad-hoc), o script desativa automaticamente o **Hardened Runtime** (`--options runtime`). Isso é necessário para evitar falhas quando o app tenta carregar frameworks incorporados (como o Sparkle) que não compartilham o mesmo Team ID. Assinaturas ad-hoc também quebram a persistência de permissões do TCC; veja [Permissões do macOS](/platforms/mac/permissions) para etapas de recuperação.

## Metadados de compilação para Sobre (About)

O `package-mac-app.sh` carimba o pacote com:

- `ZEROBuildTimestamp`: ISO8601 UTC no momento do empacotamento
- `ZEROGitCommit`: hash curto do git (ou `unknown` se não estiver disponível)

A guia Sobre lê essas chaves para mostrar a versão, data de compilação, commit do git e se é um build de depuração (via `#if DEBUG`). Execute o empacotador para atualizar esses valores após alterações no código.

## Por que

As permissões do TCC estão vinculadas ao identificador do pacote *e* à assinatura do código. Builds de depuração não assinados com UUIDs variáveis faziam com que o macOS esquecesse as concessões após cada recompilação. Assinar os binários (ad-hoc por padrão) e manter um ID/caminho de pacote fixo (`dist/ZERO.app`) preserva as concessões entre builds, seguindo a abordagem do VibeTunnel.
