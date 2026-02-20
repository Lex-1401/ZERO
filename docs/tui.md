---
summary: "Interface de Usuário de Terminal (TUI): conecte-se ao Gateway a partir de qualquer máquina"
read_when:
  - Você deseja um passo a passo amigável da TUI
  - Você precisa da lista completa de recursos, comandos e atalhos da TUI
---

# TUI (Interface de Usuário de Terminal)

## Início rápido

1) Inicie o Gateway.

```bash
zero gateway
```

1) Abra a TUI.

```bash
zero tui
```

1) Digite uma mensagem e pressione Enter.

Gateway Remoto:

```bash
zero tui --url ws://<host>:<porta> --token <token-do-gateway>
```

Use `--password` se o seu Gateway utilizar autenticação por senha.

## O que você vê

- **Cabeçalho (Header):** URL de conexão, agente atual, sessão atual.
- **Log do Chat:** Mensagens do usuário, respostas do assistente, avisos do sistema, cartões de ferramentas.
- **Linha de Status:** Estado da conexão/execução (conectando, rodando, transmitindo, ocioso, erro).
- **Rodapé (Footer):** Estado da conexão + agente + sessão + modelo + think/verbose/reasoning + contagem de tokens + entrega (deliver).
- **Entrada (Input):** Editor de texto com autocompletar.

## Modelo Mental: agentes + sessões

- Agentes são identificadores (slugs) únicos (ex: `main`, `research`). O Gateway expõe a lista.
- Sessões pertencem ao agente atual.
- As chaves das sessões são armazenadas como `agent:<agentId>:<sessionKey>`.
  - Se você digitar `/session main`, a TUI expande para `agent:<agenteAtual>:main`.
  - Se digitar `/session agent:outro:main`, você troca explicitamente para a sessão daquele agente.
- Escopo da sessão:
  - `per-sender` (padrão): cada agente tem muitas sessões.
  - `global`: a TUI sempre usa a sessão `global` (o seletor pode estar vazio).
- O agente e a sessão atuais estão sempre visíveis no rodapé.

## Envio + Entrega (Delivery)

- As mensagens são enviadas para o Gateway; a entrega para os provedores (channels) está desativada por padrão na TUI.
- Ative a entrega:
  - `/deliver on`
  - ou via painel de Configurações (Settings)
  - ou inicie com `zero tui --deliver`

## Seletores + Sobreposições

- **Seletor de Modelo:** Lista modelos disponíveis e define a sobrescrita da sessão.
- **Seletor de Agente:** Escolha um agente diferente.
- **Seletor de Sessão:** Mostra apenas sessões para o agente atual.
- **Configurações:** Alterna entrega, expansão de saída de ferramentas e visibilidade do pensamento (thinking).

## Atalhos de Teclado

- **Enter:** Enviar mensagem.
- **Esc:** Abortar execução ativa.
- **Ctrl+C:** Limpar entrada (pressione duas vezes para sair).
- **Ctrl+D:** Sair.
- **Ctrl+L:** Seletor de modelo.
- **Ctrl+G:** Seletor de agente.
- **Ctrl+P:** Seletor de sessão.
- **Ctrl+O:** Alternar expansão de saída de ferramentas.
- **Ctrl+T:** Alternar visibilidade do pensamento (recarrega o histórico).

## Comandos Slash

**Principais:**

- `/help`
- `/status`
- `/agent <id>` (ou `/agents`)
- `/session <key>` (ou `/sessions`)
- `/model <provedor/modelo>` (ou `/models`)

**Controles de Sessão:**

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (apelido: `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

**Ciclo de Vida da Sessão:**

- `/new` ou `/reset` (reiniciar a sessão).
- `/abort` (abortar a execução ativa).
- `/settings`
- `/exit`

Outros comandos slash do Gateway (por exemplo, `/context`) são encaminhados para o Gateway e exibidos como saída do sistema. Consulte [Comandos Slash](/tools/slash-commands).

## Comandos de Shell Local

- Prefixe uma linha com `!` para executar um comando de shell local no host da TUI.
- A TUI perguntará uma vez por sessão se permite a execução local; recusar mantém o `!` desativado para a sessão.
- Os comandos rodam em um shell novo e não interativo no diretório de trabalho da TUI (sem `cd`/env persistente).
- Um `!` isolado é enviado como uma mensagem normal; espaços iniciais não disparam a execução local.

## Saída de Ferramentas

- Chamadas de ferramentas aparecem como cartões com argumentos + resultados.
- **Ctrl+O** alterna entre visualizações recolhidas e expandidas.
- Enquanto as ferramentas rodam, atualizações parciais são transmitidas no mesmo cartão.

## Histórico + Streaming

- Ao conectar, a TUI carrega o histórico mais recente (padrão: 200 mensagens).
- Respostas transmitidas (streaming) são atualizadas no local até serem finalizadas.
- A TUI também monitora eventos de ferramentas do agente para cartões de ferramentas mais ricos.

## Detalhes de Conexão

- A TUI registra-se no Gateway como `mode: "tui"`.
- Reconexões mostram uma mensagem do sistema; lacunas de eventos são sinalizadas no log.

## Opções

- `--url <url>`: URL WebSocket do Gateway (padrão via config ou `ws://127.0.0.1:<porta>`).
- `--token <token>`: Token do Gateway (se necessário).
- `--password <senha>`: Senha do Gateway (se necessário).
- `--session <chave>`: Chave da sessão (padrão: `main`, ou `global` quando o escopo é global).
- `--deliver`: Entrega as respostas do assistente ao provedor (padrão: off).
- `--thinking <nivel>`: Sobrescreve o nível de pensamento nos envios.
- `--timeout-ms <ms>`: Tempo limite do agente em ms.
- `--history-limit <n>`: Número de entradas no histórico a carregar (padrão: 200).

## Resolução de Problemas

**Sem saída após enviar uma mensagem:**

- Execute `/status` na TUI para confirmar se o Gateway está conectado e ocioso/ocupado.
- Verifique os logs do Gateway: `zero logs --follow`.
- Confirme se o agente pode rodar: `zero status` e `zero models status`.
- Se você espera mensagens em um canal de chat, ative a entrega (`/deliver on` ou `--deliver`).

**Outros:**

- `disconnected`: verifique se o Gateway está rodando e se `--url/--token/--password` estão corretos.
- Nenhum agente no seletor: verifique `zero agents list` e sua configuração de roteamento.
- Seletor de sessões vazio: você pode estar no escopo global ou ainda não ter sessões.
