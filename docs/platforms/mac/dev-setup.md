---
summary: "Guia de configuração para desenvolvedores que trabalham no app ZERO para macOS"
read_when:
  - Configurando o ambiente de desenvolvimento macOS
---
# Configuração do Desenvolvedor macOS

Este guia abrange as etapas necessárias para compilar e executar o aplicativo ZERO para macOS a partir do código-fonte.

## Pré-requisitos

Antes de compilar o app, certifique-se de ter o seguinte instalado:

1. **Xcode 26.2+**: Necessário para o desenvolvimento em Swift.
2. **Node.js 22+ & pnpm**: Necessários para o gateway, CLI e scripts de empacotamento.

## 1. Instalar Dependências

Instale as dependências de todo o projeto:

```bash
pnpm install
```

## 2. Compilar e Empacotar o App

Para compilar o app macOS e empacotá-lo em `dist/ZERO.app`, execute:

```bash
./scripts/package-mac-app.sh
```

Se você não possui um certificado de Developer ID da Apple, o script usará automaticamente a **assinatura ad-hoc** (`-`).

Para modos de execução de desenvolvimento, sinalizadores de assinatura e resolução de problemas de Team ID, consulte o README do app macOS:
<https://github.com/zero/zero/blob/main/apps/macos/README.md>

> **Nota**: Apps assinados de forma ad-hoc podem disparar solicitações de segurança. Se o app falhar imediatamente com "Abort trap 6", consulte a seção de [Solução de Problemas](#solução-de-problemas).

## 3. Instalar a CLI

O app macOS espera uma instalação global da CLI `zero` para gerenciar tarefas em segundo plano.

**Para instalá-la (recomendado):**

1. Abra o app ZERO.
2. Vá para a guia de configurações **General**.
3. Clique em **"Install CLI"**.

Alternativamente, instale-a manualmente:

```bash
npm install -g zero@<versão>
```

## Solução de Problemas

### Falha na Compilação: Incompatibilidade de Toolchain ou SDK

A compilação do app macOS espera o SDK do macOS mais recente e a toolchain do Swift 6.2.

**Dependências do sistema (obrigatório):**

- **Versão mais recente do macOS disponível na Atualização de Software** (exigida pelos SDKs do Xcode 26.2)
- **Xcode 26.2** (toolchain Swift 6.2)

**Verificações:**

```bash
xcodebuild -version
xcrun swift --version
```

Se as versões não corresponderem, atualize o macOS/Xcode e execute a compilação novamente.

### App Falha ao Conceder Permissão

Se o app falhar quando você tentar permitir o acesso ao **Reconhecimento de Voz** ou ao **Microfone**, isso pode ser devido a um cache TCC corrompido ou incompatibilidade de assinatura.

**Correção:**

1. Resete as permissões do TCC:

   ```bash
   tccutil reset All com.zero.mac.debug
   ```

2. Se isso falhar, altere o `BUNDLE_ID` temporariamente em [`scripts/package-mac-app.sh`](https://github.com/zero/zero/blob/main/scripts/package-mac-app.sh) para forçar uma "folha em branco" do macOS.

### Gateway em "Starting..." indefinidamente

Se o status do gateway permanecer em "Starting...", verifique se um processo zumbi está ocupando a porta:

```bash
zero gateway status
zero gateway stop

# Se você não estiver usando um LaunchAgent (modo dev / execuções manuais), encontre o listener:
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

Se uma execução manual estiver ocupando a porta, pare esse processo (Ctrl+C). Como último recurso, encerre o PID que você encontrou acima.
