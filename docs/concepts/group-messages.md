---
summary: "Comportamento e configuração para o tratamento de mensagens de grupo no WhatsApp (os padrões de menção - mentionPatterns - são compartilhados entre superfícies)"
read_when:
  - Alterando as regras de mensagens de grupo ou menções
---
# Mensagens de grupo (canal web WhatsApp)

Objetivo: permitir que o Zero esteja em grupos de WhatsApp, acorde apenas quando mencionado (pinged) e mantenha esse tópico separado da sessão de DM pessoal.

Nota: `agents.list[].groupChat.mentionPatterns` agora também é usado por Telegram/Discord/Slack/iMessage; este documento foca no comportamento específico do WhatsApp. Para configurações multi-agente, defina `agents.list[].groupChat.mentionPatterns` por agente (ou use `messages.groupChat.mentionPatterns` como um fallback global).

## O que foi implementado (03-12-2025)

- Modos de ativação: `mention` (padrão) ou `always`. O modo `mention` exige uma menção (menções reais do WhatsApp via `mentionedJids`, padrões de regex ou o número E.164 do bot em qualquer lugar do texto). O modo `always` acorda o agente em cada mensagem, mas ele deve responder apenas quando puder agregar valor significativo; caso contrário, retorna o token silencioso `NO_REPLY`. Os padrões podem ser definidos na configuração (`channels.whatsapp.groups`) e sobrescritos por grupo via `/activation`. Quando `channels.whatsapp.groups` é definido, ele também atua como uma lista de permissão de grupo (inclua `"*"` para permitir todos).
- Política de grupo: `channels.whatsapp.groupPolicy` controla se as mensagens de grupo são aceitas (`open|disabled|allowlist`). `allowlist` usa `channels.whatsapp.groupAllowFrom` (referência reserva: `channels.whatsapp.allowFrom`). O padrão é `allowlist` (bloqueado até que você adicione remetentes).
- Sessões por grupo: as chaves de sessão se parecem com `agent:<agentId>:whatsapp:group:<jid>`, portanto, comandos como `/verbose on` ou `/think high` (enviados como mensagens independentes) são escopados para aquele grupo; o estado da DM pessoal não é afetado. Os batimentos cardíacos (heartbeats) são ignorados nos tópicos de grupo.
- Injeção de contexto: mensagens de grupo **apenas pendentes** (padrão 50) que *não* acionaram uma execução são prefixadas sob `[Mensagens de chat desde sua última resposta - para contexto]`, com a linha desencadeadora sob `[Mensagem atual - responda a esta]`. Mensagens que já estão na sessão não são reinjetadas.
- Identificação do remetente: cada lote de grupo agora termina com `[de: Nome do Remetente (+E164)]` para que o Pi saiba quem está falando.
- Efêmero/Visualização única: nós os abrimos antes de extrair texto/menções, para que as menções dentro deles ainda disparem a ação.
- Prompt de sistema de grupo: no primeiro turno de uma sessão de grupo (e sempre que o `/activation` altera o modo), injetamos um pequeno texto no prompt do sistema como `Você está respondendo dentro do grupo de WhatsApp "<assunto>". Membros do grupo: Alice (+44...), Bob (+43...), … Ativação: apenas por gatilho … Dirija-se ao remetente específico indicado no contexto da mensagem.` Se os metadados não estiverem disponíveis, ainda informamos ao agente que é um chat de grupo.

## Exemplo de configuração (WhatsApp)

Adicione um bloco `groupChat` em `~/.zero/zero.json` para que as menções por nome de exibição funcionem mesmo quando o WhatsApp remove o `@` visual no corpo do texto:

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true }
      }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: [
            "@?zero",
            "\\+?15555550123"
          ]
        }
      }
    ]
  }
}
```

Notas:

- As regexes não diferenciam maiúsculas de minúsculas; elas cobrem uma menção pelo nome de exibição como `@zero` e o número bruto com ou sem `+`/espaços.
- O WhatsApp ainda envia menções canônicas via `mentionedJids` quando alguém toca no contato, portanto, a alternativa de número raramente é necessária, mas é uma rede de segurança útil.

### Comando de ativação (apenas proprietário/owner)

Use o comando do chat de grupo:

- `/activation mention`
- `/activation always`

Apenas o número do proprietário (definido em `channels.whatsapp.allowFrom` ou o próprio E.164 do bot quando não definido) pode alterar isso. Envie `/status` como uma mensagem independente no grupo para ver o modo de ativação atual.

## Como usar

1) Adicione sua conta do WhatsApp (a que executa o ZERO) ao grupo.
2) Diga `@zero …` (ou inclua o número). Apenas remetentes na lista de permissão podem acioná-lo, a menos que você defina `groupPolicy: "open"`.
3) O prompt do agente incluirá o contexto recente do grupo mais o marcador final `[de: …]` para que ele possa se dirigir à pessoa certa.
4) Diretivas de nível de sessão (`/verbose on`, `/think high`, `/new` ou `/reset`, `/compact`) aplicam-se apenas à sessão daquele grupo; envie-as como mensagens independentes para que sejam registradas. Sua sessão de DM pessoal permanece independente.

## Testes / Verificação

- Teste manual (smoke):
  - Envie uma menção `@zero` no grupo e confirme uma resposta que faça referência ao nome do remetente.
  - Envie uma segunda menção e verifique se o bloco de histórico é incluído e, em seguida, limpo no próximo turno.
- Verifique os logs do gateway (execute com `--verbose`) para ver as entradas de `inbound web message` mostrando `from: <groupJid>` e o sufixo `[de: …]`.

## Considerações conhecidas

- Heartbeats são intencionalmente ignorados para grupos para evitar notificações barulhentas.
- A supressão de eco usa a string combinada do lote; se você enviar o mesmo texto duas vezes sem menções, apenas a primeira receberá uma resposta.
- As entradas do armazenamento da sessão aparecerão como `agent:<agentId>:whatsapp:group:<jid>` no armazenamento da sessão (padrão `~/.zero/agents/<agentId>/sessions/sessions.json`); uma entrada ausente apenas significa que o grupo ainda não acionou uma execução.
- Os indicadores de digitação em grupos seguem o `agents.defaults.typingMode` (padrão: `message` quando não mencionado).
