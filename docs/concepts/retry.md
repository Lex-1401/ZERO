---
summary: "Política de re-tentativa (retry) para chamadas de provedores de saída"
read_when:
  - Atualizando o comportamento de re-tentativa do provedor ou os padrões
  - Depurando erros de envio do provedor ou limites de taxa (rate limits)
---
# Política de re-tentativa

## Objetivos

- Tentar novamente por requisição HTTP, não por fluxo de múltiplas etapas.
- Preservar a ordem, tentando novamente apenas a etapa atual.
- Evitar a duplicação de operações não idempotentes.

## Padrões

- Tentativas: 3
- Limite máximo de atraso: 30.000 ms
- Jitter: 0.1 (10 por cento)
- Padrões por provedor:
  - Atraso mínimo no Telegram: 400 ms
  - Atraso mínimo no Discord: 500 ms

## Comportamento

### Discord

- Tenta novamente apenas em erros de limite de taxa (HTTP 429).
- Usa o `retry_after` do Discord quando disponível, caso contrário, usa backoff exponencial.

### Telegram

- Tenta novamente em erros transitórios (429, timeout, conectar/resetar/fechar, temporariamente indisponível).
- Usa `retry_after` quando disponível, caso contrário, usa backoff exponencial.
- Erros de análise de Markdown não são repetidos; eles recuam para texto simples.

## Configuração

Defina a política de re-tentativa por provedor em `~/.zero/zero.json`:

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

## Notas

- As re-tentativas aplicam-se por requisição (envio de mensagem, upload de mídia, reação, enquete, sticker).
- Fluxos compostos não tentam novamente etapas já concluídas.
