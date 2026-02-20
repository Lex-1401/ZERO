---
summary: "Ciclo de vida do Gateway no macOS (launchd)"
read_when:
  - Integrando o app mac com o ciclo de vida do gateway
---
# Ciclo de vida do Gateway no macOS

O app macOS **gerencia o Gateway via launchd** por padrão e não inicia o Gateway como um processo filho. Primeiro, ele tenta se anexar a um Gateway já em execução na porta configurada; se nenhum for alcançável, ele habilita o serviço launchd via a CLI `zero` externa (sem tempo de execução embutido). Isso oferece início automático confiável no login e reinicialização em caso de falhas.

O modo de processo filho (Gateway iniciado diretamente pelo app) **não está em uso** hoje. Se você precisar de um acoplamento mais rígido com a interface, execute o Gateway manualmente em um terminal.

## Comportamento padrão (launchd)

- O app instala um LaunchAgent por usuário rotulado como `com.zero.gateway` (ou `com.zero.<perfil>` ao usar `--profile`/`ZERO_PROFILE`).
- Quando o modo Local está habilitado, o app garante que o LaunchAgent seja carregado e inicia o Gateway, se necessário.
- Os logs são gravados no caminho de log do gateway do launchd (visível em Configurações de Depuração).

Comandos comuns:

```bash
launchctl kickstart -k gui/$UID/com.zero.gateway
launchctl bootout gui/$UID/com.zero.gateway
```

Substitua o rótulo por `com.zero.<perfil>` ao executar um perfil nomeado.

## Builds de desenvolvimento não assinados

`scripts/restart-mac.sh --no-sign` é para builds locais rápidos quando você não possui chaves de assinatura. Para evitar que o launchd aponte para um binário de retransmissão não assinado, ele:

- Grava `~/.zero/disable-launchagent`.

Execuções assinadas de `scripts/restart-mac.sh` limpam essa substituição se o marcador estiver presente. Para resetar manualmente:

```bash
rm ~/.zero/disable-launchagent
```

## Modo apenas anexo (Attach-only)

Para forçar o app macOS a **nunca instalar ou gerenciar o launchd**, inicie-o com `--attach-only` (ou `--no-launchd`). Isso define `~/.zero/disable-launchagent`, para que o app apenas se anexe a um Gateway já em execução. Você pode alternar o mesmo comportamento nas Configurações de Depuração.

## Modo remoto

O modo remoto nunca inicia um Gateway local. O app usa um túnel SSH para o host remoto e se conecta através desse túnel.

## Por que preferimos o launchd

- Início automático no login.
- Semântica integrada de reinicialização/KeepAlive.
- Logs e supervisão previsíveis.

Se um modo real de processo filho for necessário novamente no futuro, ele deve ser documentado como um modo separado e explícito apenas para desenvolvimento.
