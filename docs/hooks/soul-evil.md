---
summary: "Hook SOUL Evil (troca SOUL.md por SOUL_EVIL.md)"
read_when:
  - Você deseja ativar ou ajustar o hook SOUL Evil
  - Você deseja uma janela de expurgo ou uma troca de persona por chance aleatória
---

# Hook SOUL Evil

O hook SOUL Evil troca o conteúdo do `SOUL.md` **injetado** pelo conteúdo do `SOUL_EVIL.md` durante uma janela de expurgo (purge window) ou por chance aleatória. Ele **não** modifica os arquivos no disco.

## Como funciona

Quando o `agent:bootstrap` é executado, o hook pode substituir o conteúdo do `SOUL.md` em memória antes que o prompt do sistema seja montado. Se o `SOUL_EVIL.md` estiver ausente ou vazio, o ZERO registra um aviso e mantém o `SOUL.md` normal.

As execuções de subagentes **não** incluem `SOUL.md` em seus arquivos de bootstrap, portanto, este hook não tem efeito sobre subagentes.

## Ativar

```bash
zero hooks enable soul-evil
```

Em seguida, defina a configuração:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

Crie o `SOUL_EVIL.md` na raiz do espaço de trabalho do agente (ao lado do `SOUL.md`).

## Opções

- `file` (string): nome do arquivo SOUL alternativo (padrão: `SOUL_EVIL.md`)
- `chance` (número 0–1): chance aleatória por execução de usar o `SOUL_EVIL.md`
- `purge.at` (HH:mm): início do expurgo diário (formato 24 horas)
- `purge.duration` (duração): tempo de duração da janela (ex: `30s`, `10m`, `1h`)

**Precedência:** a janela de expurgo vence a chance aleatória.

**Fuso horário:** usa `agents.defaults.userTimezone` quando definido; caso contrário, usa o fuso horário do host.

## Notas

- Nenhum arquivo é gravado ou modificado no disco.
- Se o `SOUL.md` não estiver na lista de bootstrap, o hook não fará nada.

## Veja Também

- [Hooks](/hooks)
