---
summary: "Transmita uma mensagem do WhatsApp para múltiplos agentes"
read_when:
  - Configurando grupos de transmissão (broadcast)
  - Depurando respostas multi-agente no WhatsApp
status: experimental
---

# Grupos de Transmissão (Broadcast Groups)

**Status:** Experimental  
**Versão:** Adicionado em 09/01/2026

## Visão Geral

Os Grupos de Transmissão permitem que múltiplos agentes processem e respondam à mesma mensagem simultaneamente. Isso permite criar equipes de agentes especializados que trabalham juntos em um único grupo ou DM do WhatsApp — todos usando um único número de telefone.

Escopo atual: **Apenas WhatsApp** (canal web).

Os grupos de transmissão são avaliados após as listas de permissão do canal e as regras de ativação de grupo. No WhatsApp, isso significa que as transmissões ocorrem quando o ZERO normalmente responderia (por exemplo: ao ser mencionado, dependendo das configurações do seu grupo).

## Casos de Uso

### 1. Equipes de Agentes Especializados

Implante múltiplos agentes com responsabilidades atômicas e focadas:

```text
Grupo: "Equipe de Desenvolvimento"
Agentes:
  - CodeReviewer (revisa trechos de código)
  - DocumentationBot (gera documentação)
  - SecurityAuditor (verifica vulnerabilidades)
  - TestGenerator (sugere casos de teste)
```

Cada agente processa a mesma mensagem e fornece sua perspectiva especializada.

### 2. Suporte Multi-idioma

```text
Grupo: "Suporte Internacional"
Agentes:
  - Agent_EN (responde em Inglês)
  - Agent_DE (responde em Alemão)
  - Agent_ES (responde em Espanhol)
```

### 3. Fluxos de Garantia de Qualidade

```text
Grupo: "Suporte ao Cliente"
Agentes:
  - SupportAgent (fornece a resposta)
  - QAAgent (revisa a qualidade, só responde se encontrar problemas)
```

### 4. Automação de Tarefas

```text
Grupo: "Gestão de Projetos"
Agentes:
  - TaskTracker (atualiza o banco de dados de tarefas)
  - TimeLogger (registra o tempo gasto)
  - ReportGenerator (cria resumos)
```

## Configuração

### Configuração Básica

Adicione uma seção `broadcast` de nível superior (ao lado de `bindings`). As chaves são IDs de pares (peer IDs) do WhatsApp:

- Chats de grupo: JID do grupo (ex: `120363403215116621@g.us`)
- DMs: número de telefone no formato E.164 (ex: `+5511999999999`)

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**Resultado:** Quando o ZERO responder neste chat, ele executará todos os três agentes.

### Estratégia de Processamento

Controle como os agentes processam as mensagens:

#### Paralelo (Padrão)

Todos os agentes processam simultaneamente:

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### Sequencial

Os agentes processam em ordem (um aguarda o anterior terminar):

```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

### Exemplo Completo

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
  },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+5511999999999": ["assistant", "logger"]
  }
}
```

## Como Funciona

### Fluxo de Mensagem

1. **Mensagem recebida** em um grupo do WhatsApp.
2. **Verificação de transmissão**: O sistema verifica se o ID do par está em `broadcast`.
3. **Se estiver na lista de transmissão**:
   - Todos os agentes listados processam a mensagem.
   - Cada agente tem sua própria chave de sessão e contexto isolado.
   - Os agentes processam em paralelo (padrão) ou sequencialmente.
4. **Se não estiver na lista de transmissão**:
   - Aplica-se o roteamento normal (primeiro vínculo correspondente).

Nota: os grupos de transmissão não ignoram as listas de permissão do canal ou as regras de ativação de grupo (menções/comandos/etc). Eles apenas alteram *quais agentes são executados* quando uma mensagem é elegível para processamento.

### Isolamento de Sessão

Cada agente em um grupo de transmissão mantém separadamente:

- **Chaves de sessão** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **Histórico de conversa** (o agente não vê as mensagens de outros agentes).
- **Workspace** (sandboxes separadas se configuradas).
- **Acesso a ferramentas** (listas de permissão/negação diferentes).
- **Memória/contexto** (IDENTITY.md, SOUL.md, etc., separados).
- **Buffer de contexto de grupo** (mensagens recentes do grupo usadas para contexto) é compartilhado por par, de modo que todos os agentes de transmissão vejam o mesmo contexto quando acionados.

Isso permite que cada agente tenha:

- Personalidades diferentes.
- Acesso a ferramentas diferente (ex: apenas leitura vs. leitura e escrita).
- Modelos diferentes (ex: opus vs. sonnet).
- Habilidades diferentes instaladas.

### Exemplo: Sessões Isoladas

No grupo `120363403215116621@g.us` com os agentes `["alfred", "baerbel"]`:

**Contexto do Alfred:**

```text
Sessão: agent:alfred:whatsapp:group:120363403215116621@g.us
Histórico: [mensagem do usuário, respostas anteriores do alfred]
Workspace: /Users/pascal/zero-alfred/
Ferramentas: read, write, exec
```

**Contexto da Bärbel:**

```text
Sessão: agent:baerbel:whatsapp:group:120363403215116621@g.us  
Histórico: [mensagem do usuário, respostas anteriores da baerbel]
Workspace: /Users/pascal/zero-baerbel/
Ferramentas: apenas leitura
```

## Melhores Práticas

### 1. Mantenha os Agentes Focados

Desenvolva cada agente com uma responsabilidade única e clara:

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **Bom:** Cada agente tem um trabalho.  
❌ **Ruim:** Um único agente genérico "dev-helper".

### 2. Use Nomes Descritivos

Deixe claro o que cada agente faz:

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. Configure Acessos Diferentes a Ferramentas

Dê aos agentes apenas as ferramentas de que precisam:

```json
{
  "agents": {
    "reviewer": {
      "tools": { "allow": ["read", "exec"] }  // Apenas leitura
    },
    "fixer": {
      "tools": { "allow": ["read", "write", "edit", "exec"] }  // Leitura e escrita
    }
  }
}
```

### 4. Monitore a Performance

Com muitos agentes, considere:

- Usar `"strategy": "parallel"` (padrão) para velocidade.
- Limitar grupos de transmissão a 5-10 agentes.
- Usar modelos mais rápidos para agentes mais simples.

### 5. Lide com Falhas Graciosamente

Os agentes falham de forma independente. O erro de um agente não bloqueia os outros:

```text
Mensagem → [Agente A ✓, Agente B ✗ erro, Agente C ✓]
Resultado: Agente A e C respondem, Agente B registra o erro.
```

## Compatibilidade

### Provedores

Os grupos de transmissão funcionam atualmente com:

- ✅ WhatsApp (implementado)
- 🚧 Telegram (planejado)
- 🚧 Discord (planejado)
- 🚧 Slack (planejado)

### Roteamento

Os grupos de transmissão funcionam junto com o roteamento existente:

```json
{
  "bindings": [
    { "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } }, "agentId": "alfred" }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`: Apenas alfred responde (roteamento normal).
- `GROUP_B`: agent1 E agent2 respondem (transmissão).

**Precedência:** `broadcast` tem prioridade sobre `bindings`.

## Resolução de Problemas

### Agentes Não Estão Respondendo

**Verifique:**

1. Os IDs dos agentes existem em `agents.list`.
2. O formato do ID do par está correto (ex: `120363403215116621@g.us`).
3. Os agentes não estão em listas de negação (deny lists).

**Depuração:**

```bash
tail -f ~/.zero/logs/gateway.log | grep broadcast
```

### Apenas Um Agente Está Respondendo

**Causa:** O ID do par pode estar em `bindings`, mas não em `broadcast`.

**Solução:** Adicione à configuração de broadcast ou remova dos vínculos (bindings).

### Problemas de Performance

**Se estiver lento com muitos agentes:**

- Reduza o número de agentes por grupo.
- Use modelos mais leves (sonnet em vez de opus).
- Verifique o tempo de inicialização da sandbox.

## Exemplos

### Exemplo 1: Equipe de Revisão de Código

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": [
      "code-formatter",
      "security-scanner",
      "test-coverage",
      "docs-checker"
    ]
  },
  "agents": {
    "list": [
      { "id": "code-formatter", "workspace": "~/agents/formatter", "tools": { "allow": ["read", "write"] } },
      { "id": "security-scanner", "workspace": "~/agents/security", "tools": { "allow": ["read", "exec"] } },
      { "id": "test-coverage", "workspace": "~/agents/testing", "tools": { "allow": ["read", "exec"] } },
      { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
    ]
  }
}
```

**Usuário envia:** Trecho de código  
**Respostas:**

- code-formatter: "Indentação corrigida e dicas de tipo adicionadas"
- security-scanner: "⚠️ Vulnerabilidade de SQL injection na linha 12"
- test-coverage: "A cobertura é de 45%, faltam testes para casos de erro"
- docs-checker: "Faltando docstring para a função `process_data`"

### Exemplo 2: Suporte Multi-idioma

```json
{
  "broadcast": {
    "strategy": "sequential",
    "+5511999999999": ["detect-language", "translator-en", "translator-de"]
  },
  "agents": {
    "list": [
      { "id": "detect-language", "workspace": "~/agents/lang-detect" },
      { "id": "translator-en", "workspace": "~/agents/translate-en" },
      { "id": "translator-de", "workspace": "~/agents/translate-de" }
    ]
  }
}
```

## Referência da API

### Esquema de Configuração

```typescript
interface ZEROConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### Campos

- `strategy` (opcional): Como processar os agentes.
  - `"parallel"` (padrão): Todos os agentes processam simultaneamente.
  - `"sequential"`: Os agentes processam na ordem da lista.
  
- `[peerId]`: JID do grupo do WhatsApp, número E.164 ou outro ID de par.
  - Valor: Lista de IDs de agentes que devem processar as mensagens.

## Limitações

1. **Máximo de agentes:** Não há limite rígido, mas mais de 10 agentes podem tornar o processo lento.
2. **Contexto compartilhado:** Os agentes não veem as respostas uns dos outros (por design).
3. **Ordenação de mensagens:** Respostas paralelas podem chegar em qualquer ordem.
4. **Limites de taxa:** Todos os agentes contam para os limites de taxa do WhatsApp.

## Melhorias Futuras

Recursos planejados:

- [ ] Modo de contexto compartilhado (agentes veem as respostas uns dos outros).
- [ ] Coordenação de agentes (agentes podem sinalizar uns aos outros).
- [ ] Seleção dinâmica de agentes (escolha agentes com base no conteúdo da mensagem).
- [ ] Prioridades de agentes (alguns agentes respondem antes de outros).

## Veja Também

- [Configuração Multi-Agente](/multi-agent-sandbox-tools)
- [Configuração de Roteamento](/concepts/channel-routing)
- [Gestão de Sessão](/concepts/sessions)
