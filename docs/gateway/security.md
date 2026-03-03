---
summary: "Considerações de segurança e modelo de ameaça para executar um gateway de IA com acesso ao shell"
read_when:
  - Adicionando recursos que ampliam o acesso ou automação
---

# Segurança 🔒

O **ZERO** é construído com base no princípio de **Security by Design** (Segurança por Design). Isso significa que a segurança não é um "adicional" tardio, mas uma fundação presente em cada decisão arquitetural.

## Princípios de Security by Design no ZERO

1. **Soberania Local-first**: A integridade dos dados começa com o local onde eles residem. O ZERO prioriza o processamento local, minimizando a superfície de ataque ao reduzir a dependência de nuvens externas.
2. **Confiança Zero (Zero Trust)**: Nunca confie, sempre verifique. Cada interação agêntica é validada quanto à identidade e ao escopo antes da execução.
3. **Privilégio Mínimo (Least Privilege)**: Agentes de IA são ferramentas poderosas. Por design, o ZERO desencoraja a execução como `root` e fornece auditores que sinalizam permissões excessivas no sistema de arquivos ou acesso ao shell.
4. **Defesa em Camadas (Defense in Depth)**: Utilizamos múltiplas camadas — desde a validação de Prompt Injection e redação de PII via **Engine Nativa em Rust** (latência ultra-baixa) no `SecurityGuard` até logs imutáveis na `Cripta de Auditoria`.
5. **Transparência e Auditabilidade**: Um sistema íntegro deve ser transparente. O Painel de Auditoria em tempo real permite que você veja exatamente o que sua IA está "pensando" e fazendo.
6. **Protocolo de Emergência (Panic Button)**: Segurança inclui a capacidade de interrupção imediata. O modo Pânico corta comunicações sensíveis e bloqueia o acesso ao núcleo em caso de anomalia.
7. **Integração de Performance**: A segurança no ZERO é acelerada por código nativo, garantindo que a filtragem de conteúdo ocorra em milissegundos, sem comprometer a fluidez da interação.

## Verificação rápida: `zero security audit`

Execute isso regularmente (especialmente após alterar a configuração ou expor superfícies de rede):

```bash
zero security audit
zero security audit --deep
zero security audit --fix
```

Ele sinaliza armadilhas comuns (exposição de autenticação do Gateway, exposição do controle do navegador, listas de permissão elevated, permissões do sistema de arquivos).

O `--fix` aplica proteções seguras:

- Restringe `groupPolicy="open"` para `groupPolicy="allowlist"` (e variantes por conta) para canais comuns.
- Retorna `logging.redactSensitive="off"` para `"tools"`.
- Reforça permissões locais (`~/.zero` → `700`, arquivo de config → `600`, além de arquivos de estado comuns como `credentials/*.json`, `agents/*/agent/auth-profiles.json` e `agents/*/sessions/sessions.json`).

Executar um agente de IA com acesso ao shell na sua máquina é... _arriscado (spicy)_. Veja como não ser comprometido (pwned).

O ZERO é tanto um produto quanto um experimento: você está conectando o comportamento de modelos de fronteira a superfícies de mensagens reais e ferramentas reais. **Não existe configuração "perfeitamente segura".** O objetivo é ser deliberado sobre:

- quem pode falar com seu bot
- onde o bot tem permissão de agir
- o que o bot pode tocar

Comece com o menor acesso que ainda funcione e, em seguida, amplie-o à medida que ganhar confiança.

### O que a auditoria verifica (alto nível)

- **Acesso de entrada** (políticas de DM, políticas de grupo, listas de permissão): estranhos podem acionar o bot?
- **Raio de alcance das ferramentas** (ferramentas elevated + salas abertas): uma injeção de prompt poderia se transformar em ações de shell/arquivo/rede?
- **Exposição de rede** (Vínculo/autenticação do Gateway, Tailscale Serve/Funnel).
- **Exposição de controle do navegador** (controlUrl remoto sem token, HTTP, reutilização de token).
- **Higiene do disco local** (permissões, links simbólicos, injeções de config, caminhos de "pastas sincronizadas").
- **Plugins** (extensões existem sem uma lista de permissão explícita).
- **Higiene do modelo** (avisa quando modelos configurados parecem legados; não é um bloqueio rígido).

Se você executar `--deep`, o ZERO também tenta uma sondagem do Gateway ao vivo (best-effort).

## Painel de Auditoria (Logs em tempo real)

O **Painel de Auditoria** depende da API `logs.tail` para transmitir logs de decisão em tempo real do Gateway para o frontend.

- **Acesso**: Disponível na Control UI (barra lateral "Audit") ou em `/__zero__/audit`.
- **Escopo**: Mostra cada chamada de ferramenta, decisão e erro.
- **Privacidade**: Redige argumentos sensíveis (como tokens) por padrão (`logging.redactSensitive: "tools"`).
- **Caso de uso**: Observe o "processo de pensamento" do bot ao vivo para detectar tentativas de ferramentas não autorizadas ou depurar problemas de injeção de prompt.

## Checklist de Auditoria de Segurança

Quando a auditoria imprime descobertas, trate isso como uma ordem de prioridade:

1. **Qualquer coisa "aberta" + ferramentas ativadas**: tranque DMs/grupos primeiro (emparelhamento/listas de permissão), depois reforce a política de ferramentas/sandboxing.
2. **Exposição de rede pública** (vínculo LAN, Funnel, falta de autenticação): corrija imediatamente.
3. **Exposição remota de controle do navegador**: trate como uma API de administração remota (token obrigatório; apenas HTTPS/tailnet).
4. **Permissões**: certifique-se de que estado/configuração/credenciais/autenticação não sejam legíveis para o grupo/mundo.
5. **Plugins/extensões**: carregue apenas o que você confia explicitamente.
6. **Escolha do modelo**: prefira modelos modernos e endurecidos por instruções para qualquer bot com ferramentas.

## Control UI via HTTP

A Control UI precisa de um **contexto seguro** (HTTPS ou localhost) para gerar a identidade do dispositivo. Se você habilitar `gateway.controlUi.allowInsecureAuth`, a UI recorre a **autenticação apenas por token** e pula o emparelhamento de dispositivo (mesmo em HTTPS). Isso é um downgrade de segurança — prefira HTTPS (Tailscale Serve) ou abra a UI em `127.0.0.1`.

`zero security audit` avisa quando essa configuração está ativada.

## Configuração de Proxy Reverso

Se você executa o Gateway atrás de um proxy reverso (nginx, Caddy, Traefik, etc.), deve configurar `gateway.trustedProxies` para a detecção correta do IP do cliente.

Quando o Gateway detecta cabeçalhos de proxy (`X-Forwarded-For` ou `X-Real-IP`) de um endereço que **não** está em `trustedProxies`, ele **não** tratará as conexões como clientes locais. Se a autenticação do gateway estiver desativada, essas conexões serão rejeitadas. Isso evita o bypass de autenticação onde conexões proxyadas pareceriam vir do localhost e receberiam confiança automática.

```yaml
gateway:
  trustedProxies:
    - "127.0.0.1" # se o seu proxy roda no localhost
  auth:
    mode: password
    password: ${ZERO_GATEWAY_PASSWORD}
```

Quando `trustedProxies` está configurado, o Gateway usará os cabeçalhos `X-Forwarded-For` para determinar o IP real do cliente para detecção de cliente local. Certifique-se de que seu proxy sobrescreva (e não anexe) os cabeçalhos `X-Forwarded-For` recebidos para evitar falsificação.

## Logs de sessão local residem no disco

O ZERO armazena transcrições de sessão no disco em `~/.zero/agents/<agentId>/sessions/*.jsonl`.
Isso é necessário para continuidade da sessão e (opcionalmente) indexação de memória da sessão, mas também significa que **qualquer processo/usuário com acesso ao sistema de arquivos pode ler esses logs**. Trate o acesso ao disco como o limite de confiança e tranque as permissões em `~/.zero` (veja a seção de auditoria abaixo). Se precisar de isolamento mais forte entre agentes, execute-os sob usuários de SO separados ou hosts separados.

## Execução em Nó (system.run)

Se um nó macOS estiver emparelhado, o Gateway pode invocar `system.run` nesse nó. Isso é **execução de código remota** no Mac:

- Requer emparelhamento de nó (aprovação + token).
- Controlado no Mac via **Configurações → Aprovações de Exec** (segurança + perguntar + lista de permissão).
- Se você não quiser execução remota, defina a segurança como **negar** e remova o emparelhamento de nó para esse Mac.

## Habilidades dinâmicas (watcher / nós remotos)

O ZERO pode atualizar a lista de habilidades no meio da sessão:

- **Skills watcher**: alterações no `SKILL.md` podem atualizar o instantâneo de habilidades no próximo turno do agente.
- **Nós remotos**: conectar um nó macOS pode tornar as habilidades exclusivas do macOS elegíveis (com base na sondagem de binário).

Trate as pastas de habilidades como **código confiável** e restrinja quem pode modificá-las.

## O Modelo de Ameaça

Seu assistente de IA pode:

- Executar comandos de shell arbitrários
- Ler/gravar arquivos
- Acessar serviços de rede
- Enviar mensagens para qualquer pessoa (se você der acesso ao WhatsApp)

Pessoas que enviam mensagens para você podem:

- Tentar enganar sua IA para fazer coisas ruins
- Usar engenharia social para acessar seus dados
- Sondar detalhes da infraestrutura

## Conceito central: controle de acesso antes da inteligência

A maioria das falhas aqui não são exploits sofisticados — são "alguém enviou mensagem ao bot e o bot fez o que pediram".

A postura do ZERO baseia-se em um modelo **Zero Trust** (Confiança Zero):

- **Identidade primeiro:** decida quem pode falar com o bot (emparelhamento de DM / listas de permissão / "aberto" explícito).
- **Escopo depois:** decida onde o bot tem permissão para agir (listas de permissão de grupo + controle por menção, ferramentas, sandboxing, permissões de dispositivo).
- **Auditoria Total:** logs imutáveis através da Cripta de Auditoria.
- **Modelo por último:** assuma que o modelo pode ser manipulado; projete de forma que a manipulação tenha um raio de alcance limitado.

## Plugins/extensões

Plugins rodam **no mesmo processo** do Gateway. Trate-os como código confiável:

- Instale apenas plugins de fontes que você confia.
- Prefira listas de permissão explícitas via `plugins.allow`.
- Revise a configuração do plugin antes de habilitar.
- Reinicie o Gateway após alterações de plugins.
- Se você instalar plugins do npm (`zero plugins install <npm-spec>`), trate como execução de código não confiável:
  - O caminho de instalação é `~/.zero/extensions/<pluginId>/` (ou `$ZERO_STATE_DIR/extensions/<pluginId>/`).
  - O ZERO usa `npm pack` e depois executa `npm install --omit=dev` nesse diretório (scripts de ciclo de vida do npm podem executar código durante a instalação).
  - Prefira versões fixas e exatas (`@scope/pkg@1.2.3`) e inspecione o código descompactado no disco antes de habilitar.

Detalhes: [Plugins](/plugin)

## Modelo de acesso via DM (emparelhamento / allowlist / aberto / desativado)

Todos os canais atuais com capacidade de DM suportam uma política de DM (`dmPolicy` ou `*.dm.policy`) que controla DMs de entrada **antes** que a mensagem seja processada:

- `pairing` (padrão): remetentes desconhecidos recebem um código de emparelhamento curto e o bot ignora suas mensagens até ser aprovado. Códigos expiram após 1 hora; DMs repetidas não reenviarão um código até que uma nova solicitação seja criada. Solicitações pendentes são limitadas a **3 por canal** por padrão.
- `allowlist`: remetentes desconhecidos são bloqueados (sem handshake de emparelhamento).
- `open`: permite que qualquer pessoa envie DM (público). **Requer** que a lista de permissão do canal inclua `"*"` (opt-in explícito).
- `disabled`: ignora DMs de entrada completamente.

Aprove via CLI:

```bash
zero pairing list <channel>
zero pairing approve <channel> <code>
```

Detalhes + arquivos no disco: [Emparelhamento](/start/pairing)

## Isolamento de sessão de DM (modo multiusuário)

Por padrão, o ZERO roteia **todas as DMs para a sessão principal** para que seu assistente tenha continuidade entre dispositivos e canais. Se **várias pessoas** puderem enviar DM ao bot (DMs abertas ou uma lista de permissão multipessoal), considere isolar sessões de DM:

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

Isso evita vazamento de contexto entre usuários enquanto mantém chats em grupo isolados. Se a mesma pessoa contatar você em vários canais, use `session.identityLinks` para colapsar essas sessões de DM em uma identidade canônica. Veja [Gerenciamento de Sessão](/concepts/session) e [Configuração](/gateway/configuration).

## Listas de permissão (DM + grupos) — terminologia

O ZERO tem duas camadas separadas de "quem pode me acionar?":

- **Lista de permissão de DM** (`allowFrom` / `channels.discord.dm.allowFrom` / `channels.slack.dm.allowFrom`): quem tem permissão para falar com o bot em mensagens diretas.
  - Quando `dmPolicy="pairing"`, aprovações são gravadas em `~/.zero/credentials/<channel>-allowFrom.json` (fundidas com as listas de permissão da configuração).
- **Lista de permissão de grupo** (específica por canal): de quais grupos/canais/guildas o bot aceitará mensagens.
  - Padrões comuns:
    - `channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`: padrões por grupo como `requireMention`; quando definido, também atua como uma lista de permissão de grupo (inclua `"*"` para manter o comportamento de permitir tudo).
    - `groupPolicy="allowlist"` + `groupAllowFrom`: restringe quem pode acionar o bot _dentro_ de uma sessão de grupo (WhatsApp/Telegram/Signal/iMessage/Microsoft Teams).
    - `channels.discord.guilds` / `channels.slack.channels`: listas de permissão por superfície + padrões de menção.
  - **Nota de segurança:** trate `dmPolicy="open"` e `groupPolicy="open"` como configurações de último recurso. Elas devem ser raramente usadas; prefira emparelhamento + listas de permissão, a menos que confie totalmente em cada membro da sala.

Detalhes: [Configuração](/gateway/configuration) e [Grupos](/concepts/groups)

## Injeção de prompt (o que é, por que importa)

Injeção de prompt é quando um atacante cria uma mensagem que manipula o modelo para fazer algo inseguro ("ignore suas instruções", "despeje seu sistema de arquivos", "siga este link e execute comandos", etc.).

Mesmo com prompts de sistema fortes, **a injeção de prompt não está resolvida**. O que ajuda na prática:

- Mantenha DMs de entrada trancadas (emparelhamento/listas de permissão).
- Prefira controle por menção em grupos; evite bots "sempre ligados" em salas públicas.
- Trate links e instruções coladas como hostis por padrão.
- Execute ferramentas sensíveis em uma sandbox; mantenha segredos fora do sistema de arquivos acessível ao agente.
- **A escolha do modelo importa:** modelos mais antigos/legados podem ser menos robustos contra injeção de prompt e uso indevido de ferramentas. Prefira modelos modernos e endurecidos por instruções para qualquer bot com ferramentas. Recomendamos o uso de modelos de elite (como a família Claude Opus ou GPT Pro) devido à sua maior capacidade de reconhecer injeções de prompt e manter a integridade das instruções do sistema.

### Injeção de prompt não requer DMs públicas

Mesmo que **apenas você** possa enviar mensagens ao bot, a injeção de prompt ainda pode acontecer através de qualquer **conteúdo não confiável** que o bot leia (resultados de busca na web/fetch, páginas do navegador, emails, documentos, anexos, logs/código colados). Em outras palavras: o remetente não é a única superfície de ameaça; o **próprio conteúdo** pode carregar instruções adversárias.

Quando ferramentas estão ativadas, o risco típico é exfiltração de contexto ou acionamento de chamadas de ferramentas. Reduza o raio de alcance:

- Usando um **agente de leitura** (somente leitura ou com ferramentas desativadas) para resumir conteúdo não confiável e, em seguida, passar o resumo para seu agente principal.
- Mantendo `web_search` / `web_fetch` / `browser` desligados para agentes com ferramentas habilitadas, a menos que necessário.
- Habilitando sandboxing e listas de permissão estritas de ferramentas para qualquer agente que toque em entradas não confiáveis.

### Força do modelo (nota de segurança)

A resistência à injeção de prompt **não** é uniforme entre as camadas de modelos. Modelos menores/mais baratos são geralmente mais suscetíveis ao uso indevido de ferramentas e sequestro de instruções, especialmente sob prompts adversários.

Recomendações:

- **Use a última geração, modelo de melhor nível** para qualquer bot que possa executar ferramentas ou tocar em arquivos/redes.
- **Evite camadas mais fracas** (por exemplo, Sonnet ou Haiku) para agentes com ferramentas habilitadas ou caixas de entrada não confiáveis.
- Se você precisar usar um modelo menor, **reduza o raio de alcance** (ferramentas somente leitura, sandboxing forte, acesso mínimo ao sistema de arquivos, listas de permissão estritas).
- Ao executar modelos pequenos, **habilite sandboxing para todas as sessões** e **desative web_search/web_fetch/browser** a menos que as entradas sejam rigidamente controladas.
- Para assistentes pessoais somente chat com entrada confiável e sem ferramentas, modelos menores geralmente são adequados.

## Raciocínio (Reasoning) e saída verbosa em grupos

`/reasoning` e `/verbose` podem expor raciocínio interno ou saída de ferramentas que não foram destinados a um canal público. Em configurações de grupo, trate-os como **apenas depuração** e mantenha-os desligados, a menos que precise explicitamente deles. Se ativá-los, faça isso apenas em DMs confiáveis ou salas rigidamente controladas.

## Resposta a Incidentes (se você suspeitar de comprometimento)

Assuma que "comprometido" significa: alguém entrou em uma sala que pode acionar o bot, ou um token vazou, ou um plugin/ferramenta fez algo inesperado.

1. **Pare o raio de alcance**
   - Desative ferramentas elevated (ou pare o Gateway) até entender o que aconteceu.
   - Tranque as superfícies de entrada (política de DM, listas de permissão de grupo, controle por menção).
2. **Rotacione segredos**
   - Rotacione token/senha de `gateway.auth`.
   - Rotacione `browser.controlToken` e `hooks.token` (se usados).
   - Revogue/rotacione credenciais do provedor de modelo (chaves de API / OAuth).
3. **Revise artefatos**
   - Verifique logs do Gateway e sessões/transcrições recentes para chamadas de ferramentas inesperadas.
   - Revise `extensions/` e remova qualquer coisa em que não confie totalmente.
4. **Reexecute a auditoria**
   - `zero security audit --deep` e confirme se o relatório está limpo.

## Endurecimento da Configuração (exemplos)

### 0) Permissões de arquivo

Mantenha config + estado privados no host do gateway:

- `~/.zero/zero.json`: `600` (leitura/gravação somente do usuário)
- `~/.zero`: `700` (somente usuário)

`zero doctor` pode alertar e oferecer para reforçar essas permissões.

### 0.4) Exposição de rede (vínculo + porta + firewall)

O Gateway multiplexa **WebSocket + HTTP** em uma única porta:

- Padrão: `18789`
- Config/flags/env: `gateway.port`, `--port`, `ZERO_GATEWAY_PORT`

O modo de vínculo controla onde o Gateway escuta:

- `gateway.bind: "loopback"` (padrão): apenas clientes locais podem conectar.
- Vínculos não-loopback (`"lan"`, `"tailnet"`, `"custom"`) expandem a superfície de ataque. Use-os apenas com `gateway.auth` ativado e um firewall real.

Regras básicas:

- Prefira Tailscale Serve em vez de vínculos LAN (Serve mantém o Gateway no loopback e o Tailscale gerencia o acesso).
- Se precisar vincular à LAN, coloque um firewall na porta para uma lista de permissão restrita de IPs de origem; não faça encaminhamento de porta (port-forwarding) de forma ampla.
- Nunca exponha o Gateway sem autenticação em `0.0.0.0`.

### 0.5) Tranque o WebSocket do Gateway (autenticação local)

A autenticação do gateway é **apenas** aplicada quando você define `gateway.auth`. Se não estiver definida, clientes WS de loopback não são autenticados — qualquer processo local pode conectar e chamar `config.apply`.

O assistente de onboarding agora gera um token por padrão (mesmo para loopback) para que os clientes locais precisem se autenticar. Se você pular o assistente ou remover a autenticação, voltará ao loopback aberto.

Defina um token para que **todos** os clientes WS precisem se autenticar:

```json5
{
  gateway: {
    auth: { mode: "token", token: "seu-token" },
  },
}
```

O Doctor pode gerar um para você: `zero doctor --generate-gateway-token`.

Nota: `gateway.remote.token` é **apenas** para chamadas CLI remotas; ele não protege o acesso WS local.
Opcional: fixe o TLS remoto com `gateway.remote.tlsFingerprint` ao usar `wss://`.

Emparelhamento de dispositivo local:

- O emparelhamento de dispositivo é auto-aprovado para conexões **locais** (loopback ou o próprio endereço tailnet do host do gateway) para manter o funcionamento suave de clientes no mesmo host.
- Outros pares da tailnet **não** são tratados como locais; eles ainda precisam de aprovação de emparelhamento.

Modos de autenticação:

- `gateway.auth.mode: "token"`: token bearer compartilhado (recomendado para a maioria das configurações).
- `gateway.auth.mode: "password"`: autenticação por senha (prefira definir via env: `ZERO_GATEWAY_PASSWORD`).

Checklist de rotação (token/senha):

1. Gere/defina um novo segredo (`gateway.auth.token` ou `ZERO_GATEWAY_PASSWORD`).
2. Reinicie o Gateway (ou reinicie o app macOS se ele supervisionar o Gateway).
3. Atualize quaisquer clientes remotos (`gateway.remote.token` / `.password` em máquinas que chamam o Gateway).
4. Verifique se você não consegue mais conectar com as credenciais antigas.

### 0.6) Cabeçalhos de identidade do Tailscale Serve

Quando `gateway.auth.allowTailscale` é `true` (padrão para Serve), o ZERO aceita cabeçalhos de identidade do Tailscale Serve (`tailscale-user-login`) como autenticação. Isso só é acionado para requisições que atingem o loopback e incluem `x-forwarded-for`, `x-forwarded-proto` e `x-forwarded-host` conforme injetados pelo Tailscale.

**Regra de segurança:** não encaminhe esses cabeçalhos do seu próprio proxy reverso. Se você terminar TLS ou usar proxy na frente do gateway, desative `gateway.auth.allowTailscale` e use autenticação por token/senha.

Proxies confiáveis:

- Se você terminar TLS na frente do Gateway, defina `gateway.trustedProxies` para os IPs do seu proxy.
- O ZERO confiará em `x-forwarded-for` (ou `x-real-ip`) desses IPs para determinar o IP do cliente para verificações de emparelhamento local e verificações de autenticação HTTP/local.
- Garanta que seu proxy **sobrescreva** `x-forwarded-for` e bloqueie acesso direto à porta do Gateway.

Veja [Tailscale](/gateway/tailscale) e [Visão geral Web](/web).

### 0.6.1) Servidor de controle do navegador via Tailscale (recomendado)

Se seu Gateway for remoto mas o navegador rodar em outra máquina, você frequentemente executará um **servidor de controle de navegador separado** na máquina do navegador (veja [Ferramenta Navegador](/tools/browser)). Trate isso como uma API de administração.

Padrão recomendado:

```bash
# na máquina que roda o Chrome
zero browser serve --bind 127.0.0.1 --port 18791 --token <token>
tailscale serve https / http://127.0.0.1:18791
```

Então, no Gateway, defina:

- `browser.controlUrl` para a URL do Serve `https://…` (MagicDNS/ts.net)
- e autentique com o mesmo token (preferência por env `ZERO_BROWSER_CONTROL_TOKEN`)

Evite:

- `--bind 0.0.0.0` (superfície visível na LAN)
- Tailscale Funnel para endpoints de controle do navegador (exposição pública)

### 0.7) Segredos no disco (o que é sensível)

Assuma que qualquer coisa em `~/.zero/` (ou `$ZERO_STATE_DIR/`) pode conter segredos ou dados privados:

- `zero.json`: a config pode incluir tokens (gateway, gateway remoto), configurações de provedor e listas de permissão.
- `credentials/**`: credenciais de canal (exemplo: credenciais do WhatsApp), listas de permissão de emparelhamento, importações legadas de OAuth.
- `agents/<agentId>/agent/auth-profiles.json`: chaves de API + tokens OAuth (importados do legado `credentials/oauth.json`).
- `agents/<agentId>/sessions/**`: transcrições de sessão (`*.jsonl`) + metadados de roteamento (`sessions.json`) que podem conter mensagens privadas e saídas de ferramentas.
- `extensions/**`: plugins instalados (mais seus `node_modules/`).
- `sandboxes/**`: workspaces de sandbox de ferramentas; podem acumular cópias de arquivos que você lê/grava dentro da sandbox.

Dicas de endurecimento:

- Mantenha permissões restritas (`700` em diretórios, `600` em arquivos).
- Use criptografia de disco completo no host do gateway.
- Prefira uma conta de usuário de SO dedicada para o Gateway se o host for compartilhado.

### 0.8) Logs + transcrições (redação + retenção)

Logs e transcrições podem vazar informações sensíveis mesmo quando os controles de acesso estão corretos:

- Logs do Gateway podem incluir resumos de ferramentas, erros e URLs.
- Transcrições de sessão podem incluir segredos colados, conteúdos de arquivos, saída de comandos e links.

Recomendações:

- Mantenha a redação de resumo de ferramentas ativada (`logging.redactSensitive: "tools"`; padrão).
- Adicione padrões personalizados para seu ambiente via `logging.redactPatterns` (tokens, hostnames, URLs internas).
- Ao compartilhar diagnósticos, prefira `zero status --all` (colável, segredos redigidos) em vez de logs brutos.
- Limpe transcrições de sessões antigas e arquivos de log se não precisar de retenção longa.

Detalhes: [Logging](/gateway/logging)

### 1) DMs: emparelhamento por padrão

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 2) Grupos: exigir menção em todos os lugares

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "groupChat": { "mentionPatterns": ["@zero", "@mybot"] }
      }
    ]
  }
}
```

Em chats de grupo, responda apenas quando explicitamente mencionado.

### 3. Números Separados

Considere rodar sua IA em um número de telefone separado do seu pessoal:

- Número pessoal: Suas conversas permanecem privadas
- Número do bot: A IA lida com estes, com limites apropriados

### 4. Modo Somente Leitura (Hoje, via sandbox + ferramentas)

Você já pode construir um perfil somente leitura combinando:

- `agents.defaults.sandbox.workspaceAccess: "ro"` (ou `"none"` para nenhum acesso ao workspace)
- listas de permitir/negar ferramentas que bloqueiam `write`, `edit`, `apply_patch`, `exec`, `process`, etc.

Podemos adicionar uma flag única `readOnlyMode` mais tarde para simplificar essa configuração.

### 5) Baseline seguro (copiar/colar)

Uma configuração "segura por padrão" que mantém o Gateway privado, requer emparelhamento de DM e evita bots sempre ligados em grupos:

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "seu-token-longo-e-aleatorio" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

Se você quiser execução de ferramentas "mais segura por padrão" também, adicione uma sandbox + negue ferramentas perigosas para qualquer agente que não seja do proprietário (exemplo abaixo em "Perfis de acesso por agente").

## Sandboxing (recomendado)

Documento dedicado: [Sandboxing](/gateway/sandboxing)

Duas abordagens complementares:

- **Executar o Gateway completo no Docker** (limite de contêiner): [Docker](/install/docker)
- **Sandbox de ferramentas** (`agents.defaults.sandbox`, gateway no host + ferramentas isoladas no Docker): [Sandboxing](/gateway/sandboxing)

Nota: para prevenir acesso entre agentes, mantenha `agents.defaults.sandbox.scope` em `"agent"` (padrão) ou `"session"` para isolamento por sessão mais estrito. `scope: "shared"` usa um único contêiner/workspace.

Considere também o acesso ao workspace do agente dentro da sandbox:

- `agents.defaults.sandbox.workspaceAccess: "none"` (padrão) mantém o workspace do agente fora dos limites; ferramentas rodam contra um workspace de sandbox em `~/.zero/sandboxes`
- `agents.defaults.sandbox.workspaceAccess: "ro"` monta o workspace do agente como somente leitura em `/agent` (desativa `write`/`edit`/`apply_patch`)
- `agents.defaults.sandbox.workspaceAccess: "rw"` monta o workspace do agente como leitura/escrita em `/workspace`

Importante: `tools.elevated` é a válvula de escape global base que roda exec no host. Mantenha `tools.elevated.allowFrom` restrito e não habilite para estranhos. Você pode restringir ainda mais o elevated por agente via `agents.list[].tools.elevated`. Veja [Modo Elevated](/tools/elevated).

## Riscos de controle do navegador

Habilitar o controle do navegador dá ao modelo a capacidade de controlar um navegador real. Se esse perfil de navegador já contiver sessões logadas, o modelo pode acessar essas contas e dados. Trate perfis de navegador como **estado sensível**:

- Prefira um perfil dedicado para o agente (o perfil padrão `zero`).
- Evite apontar o agente para o seu perfil pessoal de uso diário.
- Mantenha o controle do navegador do host desativado para agentes em sandbox, a menos que confie neles.
- Trate downloads do navegador como entrada não confiável; prefira um diretório de downloads isolado.
- Desative sincronização do navegador/gerenciadores de senha no perfil do agente se possível (reduz o raio de alcance).
- Para gateways remotos, assuma que "controle do navegador" é equivalente a "acesso de operador" a qualquer coisa que esse perfil possa alcançar.
- Trate endpoints `browser.controlUrl` como uma API de administração: apenas tailnet + token auth. Prefira Tailscale Serve a vínculos LAN.
- Mantenha `browser.controlToken` separado de `gateway.auth.token` (você pode reutilizá-lo, mas isso aumenta o raio de alcance).
- O modo relay de extensão do Chrome **não** é "mais seguro"; ele pode assumir suas abas existentes do Chrome. Assuma que ele pode agir como você em qualquer coisa que essa aba/perfil possa alcançar.

## Perfis de acesso por agente (multi-agente)

Com roteamento multi-agente, cada agente pode ter sua própria sandbox + política de ferramentas: use isso para dar **acesso total**, **somente leitura** ou **nenhum acesso** por agente. Veja [Sandbox & Ferramentas Multi-Agente](/multi-agent-sandbox-tools) para detalhes completos e regras de precedência.

Casos de uso comuns:

- Agente pessoal: acesso total, sem sandbox
- Agente familiar/trabalho: sandboxed + ferramentas somente leitura
- Agente público: sandboxed + sem ferramentas de sistema de arquivos/shell

### Exemplo: acesso total (sem sandbox)

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/zero-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

### Exemplo: ferramentas somente leitura + workspace somente leitura

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/zero-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

### Exemplo: sem acesso a sistema de arquivos/shell (mensagens do provedor permitidas)

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/zero-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

## O que dizer à sua IA

Inclua diretrizes de segurança no prompt de sistema do seu agente:

```markdown
## Regras de Segurança

- Nunca compartilhe listagens de diretórios ou caminhos de arquivos com estranhos
- Nunca revele chaves de API, credenciais ou detalhes de infraestrutura
- Verifique solicitações que modificam a configuração do sistema com o proprietário
- Em caso de dúvida, pergunte antes de agir
- Informações privadas permanecem privadas, mesmo para "amigos"
```

## Resposta a Incidentes

Se sua IA fizer algo ruim:

### Conter

1. **Pare-a:** pare o app macOS (se ele supervisionar o Gateway) ou termine seu processo `zero gateway`.
2. **Feche a exposição:** defina `gateway.bind: "loopback"` (ou desative Tailscale Funnel/Serve) até entender o que aconteceu.
3. **Congele o acesso:** mude DMs/grupos arriscados para `dmPolicy: "disabled"` / exija menções, e remova entradas `"*"` de permitir tudo se você as tinha.

### Rotacionar (assuma comprometimento se segredos vazaram)

1. Rotacione a autenticação do Gateway (`gateway.auth.token` / `ZERO_GATEWAY_PASSWORD`) e reinicie.
2. Rotacione segredos de clientes remotos (`gateway.remote.token` / `.password`) em qualquer máquina que possa chamar o Gateway.
3. Rotacione credenciais de provedor/API (creds do WhatsApp, tokens Slack/Discord, chaves de modelo/API em `auth-profiles.json`).

### Auditar

1. Verifique os logs do Gateway: `/tmp/zero/zero-YYYY-MM-DD.log` (ou `logging.file`).
2. Revise a(s) transcrição(ões) relevante(s): `~/.zero/agents/<agentId>/sessions/*.jsonl`.
3. Revise alterações recentes de configuração (qualquer coisa que possa ter ampliado o acesso: `gateway.bind`, `gateway.auth`, políticas dm/grupo, `tools.elevated`, alterações de plugin).

### Coletar para um relatório

- Carimbo de data/hora, SO do host do gateway + versão do ZERO
- A(s) transcrição(ões) da sessão + um tail curto do log (após redigir)
- O que o atacante enviou + o que o agente fez
- Se o Gateway estava exposto além do loopback (LAN/Tailscale Funnel/Serve)

## Varredura de Segredos (detect-secrets)

O CI executa `detect-secrets scan --baseline .secrets.baseline` no job `secrets`.
Se falhar, existem novos candidatos ainda não presentes na baseline.

### Se o CI falhar

1. Reproduza localmente:

   ```bash
   detect-secrets scan --baseline .secrets.baseline
   ```

2. Entenda as ferramentas:
   - `detect-secrets scan` encontra candidatos e os compara com a baseline.
   - `detect-secrets audit` abre uma revisão interativa para marcar cada item da baseline como real ou falso positivo.
3. Para segredos reais: rotacione/remova-os, depois reexecute a varredura para atualizar a baseline.
4. Para falso positivos: execute a auditoria interativa e marque-os como falsos:

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. Se precisar de novas exclusões, adicione-as ao `.detect-secrets.cfg` e regenere a baseline com flags correspondentes `--exclude-files` / `--exclude-lines` (o arquivo de configuração é apenas referência; detect-secrets não o lê automaticamente).

Commit a `.secrets.baseline` atualizada assim que refletir o estado pretendido.

## A Hierarquia de Confiança

```text
Proprietário (Administrador)
  │ Confiança total
  ▼
IA (Agente)
  │ Confiar mas verificar
  ▼
Usuários na lista de permissão
  │ Confiança limitada
  ▼
Outros usuários
  │ Nenhuma confiança
```

## Relatando Problemas de Segurança

Encontrou uma vulnerabilidade no ZERO? Por favor, relate de forma responsável:

1. Email: <security@zero.local>
2. Não poste publicamente até que seja corrigido
3. Nós daremos crédito a você (a menos que prefira anonimato)

---

_"Segurança é um processo, não um produto. Mantenha o acesso ao shell sempre protegido."_ — Alguém sábio, provavelmente

∅🔐
