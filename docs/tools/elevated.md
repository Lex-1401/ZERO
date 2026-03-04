---
summary: "Modo exec elevado e diretivas /elevated"
read_when:
  - Ajustando padrões de modo elevado, listas de permissão ou comportamento de slash commands
---

# Modo Elevado (diretivas /elevated)

## O que faz

- `/elevated on` executa no host do gateway e mantém aprovações de execução (igual a `/elevated ask`).
- `/elevated full` executa no host do gateway **e** auto-aprova a execução (pula aprovações de execução).
- `/elevated ask` executa no host do gateway, mas mantém aprovações de execução (igual a `/elevated on`).
- `on`/`ask` **não** forçam `exec.security=full`; a política de segurança/pergunta configurada ainda se aplica.
- Só altera o comportamento quando o agente está em **sandbox** (caso contrário, exec já roda no host).
- Formas de diretiva: `/elevated on|off|ask|full`, `/elev on|off|ask|full`.
- Apenas `on|off|ask|full` são aceitos; qualquer outra coisa retorna uma dica e não altera o estado.

## O que controla (e o que não controla)

- **Portões de disponibilidade**: `tools.elevated` é a linha de base global. `agents.list[].tools.elevated` pode restringir ainda mais o elevado por agente (ambos devem permitir).
- **Estado por sessão**: `/elevated on|off|ask|full` define o nível elevado para a chave de sessão atual.
- **Diretiva inline**: `/elevated on|ask|full` dentro de uma mensagem aplica-se apenas a essa mensagem.
- **Grupos**: Em chats de grupo, diretivas elevadas só são honradas quando o agente é mencionado. Mensagens somente de comando que ignoram requisitos de menção são tratadas como mencionadas.
- **Execução do host**: elevado força `exec` no host do gateway; `full` também define `security=full`.
- **Aprovações**: `full` pula aprovações de execução; `on`/`ask` as honram quando as regras de allowlist/ask exigem.
- **Agentes sem sandbox**: nenhuma operação para localização; afeta apenas bloqueio, registro e status.
- **Política de ferramenta ainda se aplica**: se `exec` for negado pela política de ferramentas, o elevado não pode ser usado.

## Ordem de resolução

1. Diretiva inline na mensagem (aplica-se apenas a essa mensagem).
2. Substituição de sessão (definida enviando uma mensagem somente de diretiva).
3. Padrão global (`agents.defaults.elevatedDefault` na configuração).

## Definindo um padrão de sessão

- Envie uma mensagem que seja **apenas** a diretiva (espaço em branco permitido), ex: `/elevated full`.
- Resposta de confirmação é enviada (`Modo elevado definido para full...` / `Modo elevado desativado.`).
- Se o acesso elevado estiver desativado ou o remetente não estiver na lista de permissões aprovada, a diretiva responde com um erro acionável e não altera o estado da sessão.
- Envie `/elevated` (ou `/elevated:`) sem argumento para ver o nível de elevação atual.

## Disponibilidade + Listas de permissão (allowlists)

- Portão de recurso: `tools.elevated.enabled` (padrão pode estar desligado via configuração mesmo se o código suportar).
- Lista de permissão de remetente: `tools.elevated.allowFrom` com listas de permissão por provedor (ex: `discord`, `whatsapp`).
- Portão por agente: `agents.list[].tools.elevated.enabled` (opcional; só pode restringir ainda mais).
- Lista de permissão por agente: `agents.list[].tools.elevated.allowFrom` (opcional; quando definida, o remetente deve corresponder a **ambas** as listas de permissão global + por agente).
- Fallback do Discord: se `tools.elevated.allowFrom.discord` for omitido, a lista `channels.discord.dm.allowFrom` é usada como fallback. Defina `tools.elevated.allowFrom.discord` (mesmo `[]`) para substituir. Listas de permissão por agente **não** usam o fallback.
- Todos os portões devem passar; caso contrário, o elevado é tratado como indisponível.

## Registro + Status

- Chamadas exec elevadas são registradas no nível info.
- O status da sessão inclui o modo elevado (ex: `elevated=ask`, `elevated=full`).
