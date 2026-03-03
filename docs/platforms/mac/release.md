---
summary: "Checklist de lançamento do ZERO para macOS (Sparkle feed, empacotamento, assinatura)"
read_when:
  - Realizando ou validando um lançamento do ZERO para macOS
  - Atualizando o appcast do Sparkle ou ativos do feed
---

# Lançamento do ZERO para macOS (Sparkle)

Este app agora suporta atualizações automáticas via Sparkle. Os builds de lançamento devem ser assinados com Developer ID, compactados em zip e publicados com uma entrada de appcast assinada.

## Pré-requisitos

- Certificado de Developer ID Application instalado (exemplo: `Developer ID Application: <Nome do Desenvolvedor> (<TEAMID>)`).
- Caminho da chave privada do Sparkle definido no ambiente como `SPARKLE_PRIVATE_KEY_FILE` (caminho para sua chave privada ed25519 do Sparkle; a chave pública está embutida no Info.plist). Se estiver faltando, verifique o `~/.profile`.
- Credenciais do Notary (perfil do keychain ou chave de API) para `xcrun notarytool` se desejar uma distribuição Segura pelo Gatekeeper em DMG/zip.
  - Usamos um perfil do Keychain chamado `zero-notary`, criado a partir das variáveis de ambiente da chave de API do App Store Connect em seu perfil de shell:
    - `APP_STORE_CONNECT_API_KEY_P8`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/zero-notary.p8`
    - `xcrun notarytool store-credentials "zero-notary" --key /tmp/zero-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- Dependências `pnpm` instaladas (`pnpm install --config.node-linker=hoisted`).
- Ferramentas Sparkle são baixadas automaticamente via SwiftPM em `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` (`sign_update`, `generate_appcast`, etc.).

## Compilar & empacotar

Notas:

- `APP_BUILD` mapeia para `CFBundleVersion`/`sparkle:version`; mantenha-o numérico + monotônico (sem `-beta`), caso contrário, o Sparkle os considerará iguais.
- O padrão é a arquitetura atual (`$(uname -m)`). Para builds de lançamento/universais, defina `BUILD_ARCHS="arm64 x86_64"` (ou `BUILD_ARCHS=all`).
- Use `scripts/package-mac-dist.sh` para artefatos de lançamento (zip + DMG + notarização). Use `scripts/package-mac-app.sh` para empacotamento local/dev.

```bash
# Da raiz do repositório; defina os IDs de lançamento para que o feed do Sparkle seja habilitado.
# APP_BUILD deve ser numérico + monotônico para comparação do Sparkle.
BUNDLE_ID=com.zero.mac \
APP_VERSION=2026.1.25 \
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Nome do Desenvolvedor> (<TEAMID>)" \
scripts/package-mac-app.sh

# Zip para distribuição (inclui resource forks para suporte a delta do Sparkle)
ditto -c -k --sequesterRsrc --keepParent dist/ZERO.app dist/ZERO-2026.1.25.zip

# Opcional: também compile um DMG estilizado para humanos (arrastar para /Applications)
scripts/create-dmg.sh dist/ZERO.app dist/ZERO-2026.1.25.dmg

# Recomendado: compilar + notarizar/staple o zip + DMG
# Primeiro, crie um perfil no keychain uma vez:
#   xcrun notarytool store-credentials "zero-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<senha-especifica-do-app>"
NOTARIZE=1 NOTARYTOOL_PROFILE=zero-notary \
BUNDLE_ID=com.zero.mac \
APP_VERSION=2026.1.25 \
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Nome do Desenvolvedor> (<TEAMID>)" \
scripts/package-mac-dist.sh

# Opcional: enviar o dSYM juntamente com o lançamento
ditto -c -k --keepParent apps/macos/.build/release/ZERO.app.dSYM dist/ZERO-2026.1.25.dSYM.zip
```

## Entrada de appcast

Use o gerador de notas de lançamento para que o Sparkle renderize as notas em HTML formatado:

```bash
SPARKLE_PRIVATE_KEY_FILE=/caminho/para/ed25519-private-key scripts/make_appcast.sh dist/ZERO-2026.1.25.zip https://raw.githubusercontent.com/zero/zero/main/appcast.xml
```

Gera notas de lançamento em HTML a partir do `CHANGELOG.md` (via [`scripts/changelog-to-html.sh`](https://github.com/zero/zero/blob/main/scripts/changelog-to-html.sh)) e as incorpora na entrada do appcast.
Faça o commit do `appcast.xml` atualizado junto com os artefatos de lançamento (zip + dSYM) ao publicar.

## Publicar & verificar

- Faça o upload de `ZERO-2026.1.25.zip` (e `ZERO-2026.1.25.dSYM.zip`) para o lançamento no GitHub para a tag `v2026.1.25`.
- Certifique-se de que a URL bruta do appcast corresponda ao feed embutido: `https://raw.githubusercontent.com/zero/zero/main/appcast.xml`.
- Verificações de integridade:
  - `curl -I https://raw.githubusercontent.com/zero/zero/main/appcast.xml` retorna 200.
  - `curl -I <url-do-enclosure>` retorna 200 após o upload dos ativos.
  - Em um build público anterior, execute “Check for Updates…” na guia About e verifique se o Sparkle instala o novo build de forma limpa.

Definição de concluído: app assinado + appcast publicados, fluxo de atualização funciona a partir de uma versão instalada anteriormente e os ativos de lançamento estão anexados ao lançamento do GitHub.
