---
summary: "Proteção de instância única (singleton) do Gateway usando o vínculo do ouvinte WebSocket"
read_when:
  - Executando ou depurando o processo do gateway
  - Investigando a aplicação de instância única
---

# Bloqueio do Gateway (Gateway lock)

Última atualização: 11/12/2025

## Motivos

- Garantir que apenas uma instância do gateway seja executada por porta base no mesmo host; gateways adicionais devem usar perfis isolados e portas únicas.
- Sobreviver a falhas/SIGKILL sem deixar arquivos de bloqueio (lock files) obsoletos.
- Falhar rapidamente com um erro claro quando a porta de controle já estiver ocupada.

## Mecanismo

- O gateway vincula o ouvinte WebSocket (padrão `ws://127.0.0.1:18789`) imediatamente na inicialização usando um ouvinte TCP exclusivo.
- Se o vínculo falhar com `EADDRINUSE`, a inicialização lança um `GatewayLockError("outra instância do gateway já está ouvindo em ws://127.0.0.1:<porta>")`.
- O SO libera o ouvinte automaticamente em qualquer saída de processo, incluindo falhas e SIGKILL — nenhum arquivo de bloqueio separado ou etapa de limpeza é necessária.
- No encerramento, o gateway fecha o servidor WebSocket e o servidor HTTP subjacente para liberar a porta prontamente.

## Superfície de erro

- Se outro processo detiver a porta, a inicialização lança `GatewayLockError("outra instância do gateway já está ouvindo em ws://127.0.0.1:<porta>")`.
- Outras falhas de vínculo aparecem como `GatewayLockError("falha ao vincular o soquete do gateway em ws://127.0.0.1:<porta>: …")`.

## Notas operacionais

- Se a porta estiver ocupada por *outro* processo, o erro é o mesmo; libere a porta ou escolha outra com `zero gateway --port <porta>`.
- O aplicativo macOS ainda mantém sua própria proteção leve de PID antes de iniciar o gateway; o bloqueio em tempo de execução é imposto pelo vínculo do WebSocket.
