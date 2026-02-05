---
summary: "Kit de Testes: suítes unitárias/e2e/live, executores Docker e o que cada teste cobre"
read_when:
  - Ao executar testes localmente ou em CI
  - Ao adicionar regressões para bugs de modelos/provedores
  - Ao depurar o comportamento do gateway + agente
---

# Testes

O ZERO possui três suítes Vitest (unitário/integração, e2e, live) e um pequeno conjunto de executores Docker.

Este documento é um guia sobre "como testamos":

- O que cada suíte cobre (e o que ela deliberadamente *não* cobre)
- Quais comandos executar para fluxos de trabalho comuns (local, pré-push, depuração)
- Como os testes live descobrem credenciais e selecionam modelos/provedores
- Como adicionar regressões para problemas reais de modelos/provedores

## Início rápido

No dia a dia:

- Validação completa (esperada antes do push): `pnpm lint && pnpm build && pnpm test`

Quando você altera testes ou deseja confiança extra:

- Validação de cobertura: `pnpm test:coverage`
- Suíte E2E: `pnpm test:e2e`

Ao depurar provedores/modelos reais (requer credenciais reais):

- Suíte Live (sondas de modelos + ferramentas/imagens do gateway): `pnpm test:live`

Dica: quando você precisar apenas de um caso de falha, prefira filtrar os testes live via variáveis de ambiente de lista de permissão descritas abaixo.

## Suítes de teste (o que roda onde)

Pense nas suítes como "níveis crescentes de realismo" (e aumento de instabilidade/custo):

### Unitário / Integração (padrão)

- Comando: `pnpm test`
- Configuração: `vitest.config.ts`
- Arquivos: `src/**/*.test.ts`
- Escopo:
  - Testes unitários puros.
  - Testes de integração em processo (autenticação do gateway, roteamento, ferramentas, análise, configuração).
  - Regressões determinísticas para bugs conhecidos.
- Expectativas:
  - Executa no CI.
  - Não requer chaves reais.
  - Deve ser rápido e estável.

### E2E (smoke test do gateway)

- Comando: `pnpm test:e2e`
- Configuração: `vitest.e2e.config.ts`
- Arquivos: `src/**/*.e2e.test.ts`
- Escopo:
  - Comportamento de ponta a ponta do gateway com múltiplas instâncias.
  - Superfícies WebSocket/HTTP, pareamento de nós e rede mais robusta.
- Expectativas:
  - Executa no CI (quando ativado no pipeline).
  - Não requer chaves reais.
  - Possui mais partes móveis que os testes unitários (pode ser mais lento).

### Live (provedores reais + modelos reais)

- Comando: `pnpm test:live`
- Configuração: `vitest.live.config.ts`
- Arquivos: `src/**/*.live.test.ts`
- Padrão: **ativado** por `pnpm test:live` (define `ZERO_LIVE_TEST=1`)
- Escopo:
  - "Este provedor/modelo realmente funciona *hoje* com credenciais reais?"
  - Captura mudanças no formato do provedor, peculiaridades na chamada de ferramentas, problemas de autenticação e comportamento de limite de taxa (rate limit).
- Expectativas:
  - Não é estável para CI por design (redes reais, políticas reais de provedores, cotas, interrupções).
  - Gera custos / utiliza limites de taxa.
  - Prefira executar subconjuntos filtrados em vez de "tudo".
  - Execuções live carregarão o `~/.profile` para buscar chaves de API ausentes.
  - Rotação de chaves Anthropic: defina `ZERO_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."` (ou `ZERO_LIVE_ANTHROPIC_KEY=sk-...`) ou múltiplas variáveis `ANTHROPIC_API_KEY*`; os testes tentarão novamente em caso de limites de taxa.

## Qual suíte devo executar?

Use esta tabela de decisão:

- Editando lógica/testes: execute `pnpm test` (e `pnpm test:coverage` se alterou muita coisa).
- Alterando rede do gateway / protocolo WS / pareamento: adicione `pnpm test:e2e`.
- Depurando "meu bot está fora do ar" / falhas específicas de provedores / chamadas de ferramentas: execute um `pnpm test:live` filtrado.

## Live: smoke test de modelo (chaves do perfil)

Os testes live são divididos em duas camadas para que possamos isolar falhas:

- "Modelo Direto" nos diz se o provedor/modelo consegue responder algo com a chave fornecida.
- "Smoke do Gateway" nos diz se o pipeline completo gateway+agente funciona para aquele modelo (sessões, histórico, ferramentas, política de sandbox, etc.).

### Camada 1: Conclusão direta do modelo (sem gateway)

- Teste: `src/agents/models.profiles.live.test.ts`
- Objetivo:
  - Enumerar modelos descobertos.
  - Usar `getApiKeyForModel` para selecionar modelos para os quais você tem credenciais.
  - Executar uma pequena conclusão por modelo (e regressões direcionadas onde necessário).
- Como ativar:
  - `pnpm test:live` (ou `ZERO_LIVE_TEST=1` se invocar o Vitest diretamente).
- Defina `ZERO_LIVE_MODELS=modern` (ou `all`, apelido para modern) para realmente executar esta suíte; caso contrário, ela será ignorada para manter o `pnpm test:live` focado no smoke do gateway.
- Como selecionar modelos:
  - `ZERO_LIVE_MODELS=modern` para executar a lista de permissão moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.1, Grok 4).
  - `ZERO_LIVE_MODELS=all` é um apelido para a lista moderna.
  - Ou `ZERO_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."` (lista separada por vírgulas).
- Como selecionar provedores:
  - `ZERO_LIVE_PROVIDERS="google,google-cloud-auth,google-gemini-cli"` (lista separada por vírgulas).
- De onde vêm as chaves:
  - Por padrão: armazenamento de perfis e fallbacks de ambiente.
  - Defina `ZERO_LIVE_REQUIRE_PROFILE_KEYS=1` para forçar o uso **apenas** do armazenamento de perfis.
- Por que isso existe:
  - Separa "API do provedor quebrada / chave inválida" de "pipeline do agente do gateway quebrado".
  - Contém regressões pequenas e isoladas (exemplo: replay de raciocínio OpenAI Responses/Codex + fluxos de chamada de ferramentas).

### Camada 2: Smoke de Gateway + agente dev (o que o "@zero" realmente faz)

- Teste: `src/gateway/gateway-models.profiles.live.test.ts`
- Objetivo:
  - Iniciar um gateway em processo.
  - Criar/aplicar patch em uma sessão `agent:dev:*` (sobrescrita de modelo por execução).
  - Iterar modelos com chaves e validar:
    - Resposta "significativa" (sem ferramentas).
    - Uma invocação de ferramenta real funciona (sonda de leitura - read probe).
    - Sondas extras opcionais de ferramentas (sonda de exec+read).
    - Caminhos de regressão OpenAI (apenas chamada de ferramenta → acompanhamento) continuam funcionando.
- Detalhes das sondas (probes) para explicar falhas rapidamente:
  - Sonda `read`: o teste grava um arquivo temporário no workspace e pede ao agente para ler (`read`) e repetir o conteúdo.
  - Sonda `exec+read`: o teste pede ao agente para gravar um valor em um arquivo temporário via `exec` e depois lê-lo de volta via `read`.
  - Sonda de imagem: o teste anexa um PNG gerado (gato + código aleatório) e espera que o modelo retorne `cat <CÓDIGO>`.
  - Referência de implementação: `src/gateway/gateway-models.profiles.live.test.ts` e `src/gateway/live-image-probe.ts`.
- Como ativar:
  - `pnpm test:live` (ou `ZERO_LIVE_TEST=1` se invocar o Vitest diretamente).
- Como selecionar modelos:
  - Padrão: lista moderna (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.1, Grok 4).
  - `ZERO_LIVE_GATEWAY_MODELS=all` é um apelido para a lista moderna.
  - Ou defina `ZERO_LIVE_GATEWAY_MODELS="provider/model"` (ou lista por vírgulas) para filtrar.
- Como selecionar provedores (evite o "OpenRouter para tudo"):
  - `ZERO_LIVE_GATEWAY_PROVIDERS="google,google-cloud-auth,google-gemini-cli,openai,anthropic,zai,minimax"` (lista separada por vírgulas).
- Sondas de ferramentas e imagem estão sempre ativadas neste teste live:
  - Sonda `read` + sonda `exec+read`.
  - Sonda de imagem executa quando o modelo anuncia suporte para entrada de imagem.
  - Fluxo (nível alto):
    - O teste gera um PNG minúsculo com "CAT" + código aleatório (`src/gateway/live-image-probe.ts`).
    - Envia via `agent` com `attachments: [{ mimeType: "image/png", content: "<base64>" }]`.
    - O gateway analisa os anexos em `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`).
    - O agente embutido encaminha uma mensagem multimodal do usuário para o modelo.
    - Validação: a resposta contém `cat` + o código (tolerância OCR: pequenos erros permitidos).

Dica: para ver o que você pode testar na sua máquina (e os IDs exatos de `provedor/modelo`), execute:

```bash
zero models list
zero models list --json
```

## Live: Smoke de setup-token Anthropic

- Teste: `src/agents/anthropic.setup-token.live.test.ts`
- Objetivo: verificar se o setup-token da CLI do Claude Code (ou um perfil de setup-token colado) consegue completar um prompt da Anthropic.
- Ativar:
  - `pnpm test:live` (ou `ZERO_LIVE_TEST=1` se invocar o Vitest diretamente).
  - `ZERO_LIVE_SETUP_TOKEN=1`
- Fontes de token (escolha uma):
  - Perfil: `ZERO_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Token bruto: `ZERO_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Sobrescrita de modelo (opcional):
  - `ZERO_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

Exemplo de configuração:

```bash
zero models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
ZERO_LIVE_SETUP_TOKEN=1 ZERO_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: Smoke de backend CLI (Claude Code CLI ou outras CLIs locais)

- Teste: `src/gateway/gateway-cli-backend.live.test.ts`
- Objetivo: validar o pipeline Gateway + agente usando um backend CLI local, sem tocar na sua configuração padrão.
- Ativar:
  - `pnpm test:live` (ou `ZERO_LIVE_TEST=1` se invocar o Vitest diretamente).
  - `ZERO_LIVE_CLI_BACKEND=1`
- Padrões:
  - Modelo: `claude-cli/claude-sonnet-4-5`
  - Comando: `claude`
  - Argumentos: `["-p","--output-format","json","--dangerously-skip-permissions"]`
- Sobrescritas (opcionais):
  - `ZERO_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-5"`
  - `ZERO_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2-codex"`
  - `ZERO_LIVE_CLI_BACKEND_COMMAND="/caminho/completo/para/claude"`
  - `ZERO_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `ZERO_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `ZERO_LIVE_CLI_BACKEND_IMAGE_PROBE=1` para enviar um anexo de imagem real (os caminhos são injetados no prompt).
  - `ZERO_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` para passar caminhos de arquivos de imagem como argumentos da CLI em vez de injeção no prompt.
  - `ZERO_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) para controlar como os argumentos de imagem são passados quando `IMAGE_ARG` está definido.
  - `ZERO_LIVE_CLI_BACKEND_RESUME_PROBE=1` para enviar uma segunda rodada e validar o fluxo de retomada (resume).
- `ZERO_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` para manter a configuração MCP da CLI do Claude Code ativada (o padrão desativa a configuração MCP com um arquivo vazio temporário).

Exemplo:

```bash
ZERO_LIVE_CLI_BACKEND=1 \
  ZERO_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Receitas recomendadas de testes live

Listas de permissão explícitas e restritas são mais rápidas e menos instáveis:

- Modelo único, direto (sem gateway):
  - `ZERO_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modelo único, smoke test do gateway:
  - `ZERO_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Chamada de ferramentas em vários provedores:
  - `ZERO_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Foco no Google (chave de API Gemini + Google Cloud Auth):
  - Gemini (chave de API): `ZERO_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Google Cloud Auth (OAuth): `ZERO_LIVE_GATEWAY_MODELS="google-cloud-auth/claude-opus-4-5-thinking,google-cloud-auth/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notas:

- `google/...` usa a API Gemini (chave de API).
- `google-cloud-auth/...` usa a ponte OAuth Google Cloud Auth (endpoint do agente estilo Cloud Code Assist).
- `google-gemini-cli/...` usa a CLI local do Gemini na sua máquina (autenticação separada + peculiaridades de ferramentas).
- API Gemini vs CLI Gemini:
  - API: O ZERO chama a API Gemini hospedada pelo Google via HTTP (chave de API / autenticação de perfil); é o que a maioria dos usuários entende por "Gemini".
  - CLI: O ZERO executa um binário `gemini` local; possui sua própria autenticação e pode se comportar de forma diferente (suporte a streaming/ferramentas/versões).

## Live: matriz de modelos (o que cobrimos)

Não há uma "lista fixa de modelos para o CI" (os testes live são opcionais), mas estes são os modelos **recomendados** para serem cobertos regularmente em uma máquina de desenvolvimento com chaves.

### Conjunto moderno de fumaça (chamada de ferramentas + imagem)

Este é o conjunto de "modelos comuns" que esperamos manter funcionando:

- OpenAI (não-Codex): `openai/gpt-5.2` (opcional: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.2` (opcional: `openai-codex/gpt-5.2-codex`)
- Anthropic: `anthropic/claude-opus-4-5` (ou `anthropic/claude-sonnet-4-5`)
- Google (API Gemini): `google/gemini-3-pro-preview` e `google/gemini-3-flash-preview` (evite modelos Gemini 2.x mais antigos)
- Google (Google Cloud Auth): `google-cloud-auth/claude-opus-4-5-thinking` e `google-cloud-auth/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

Execute o smoke do gateway com ferramentas + imagem:
`ZERO_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-cloud-auth/claude-opus-4-5-thinking,google-cloud-auth/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Base: chamada de ferramentas (Leitura + opcional Execução)

Escolha pelo menos um por família de provedores:

- OpenAI: `openai/gpt-5.2` (ou `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-5` (ou `anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview` (ou `google/gemini-3-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

Cobertura adicional opcional:

- xAI: `xai/grok-4` (ou o mais recente disponível).
- Mistral: `mistral/`… (escolha um modelo capaz de usar ferramentas que você tenha ativado).
- Cerebras: `cerebras/`… (se você tiver acesso).
- LM Studio: `lmstudio/`… (local; a chamada de ferramentas depende do modo da API).

### Visão: envio de imagem (anexo → mensagem multimodal)

Inclua pelo menos um modelo com capacidade de visão em `ZERO_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI capazes de visão, etc.) para exercitar a sonda de imagem.

### Agregadores / Gateways alternativos

Se você tiver chaves ativadas, também oferecemos suporte para testes via:

- OpenRouter: `openrouter/...` (centenas de modelos; use `zero models scan` para encontrar candidatos capazes de lidar com ferramentas e imagens).
- OpenCode Zen: `opencode/...` (autenticação via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`).

Mais provedores que você pode incluir na matriz live (se tiver credenciais/configuração):

- Integrados: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-cloud-auth`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`.
- Via `models.providers` (endpoints personalizados): `minimax` (nuvem/API), além de qualquer proxy compatível com OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.).

Dica: não tente codificar "todos os modelos" nos documentos. A lista autoritativa é o que o `discoverModels(...)` retornar na sua máquina + as chaves disponíveis.

## Credenciais (nunca faça commit)

Os testes live descobrem credenciais da mesma forma que a CLI. Implicações práticas:

- Se a CLI funciona, os testes live devem encontrar as mesmas chaves.
- Se um teste live disser "sem credenciais", depure da mesma forma que depuraria o `zero models list` / seleção de modelos.

- Armazenamento de perfis: `~/.zero/credentials/` (preferencial; o que "chaves de perfil" significa nos testes).
- Configuração: `~/.zero/zero.json` (ou `ZERO_CONFIG_PATH`).

Se você quiser depender de chaves de ambiente (ex: exportadas no seu `~/.profile`), execute os testes locais após o comando `source ~/.profile`, ou use os executores Docker abaixo (eles podem montar o seu `~/.profile` no container).

## Deepgram Live (transcrição de áudio)

- Teste: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Ativar: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Executores Docker (opcional - verificações "funciona no Linux")

Estes executam o `pnpm test:live` dentro da imagem Docker do repositório, montando o seu diretório de configuração local e o workspace (e carregando o `~/.profile` se montado):

- Modelos diretos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`).
- Gateway + agente dev: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`).
- Assistente de integração (TTY, scaffolding completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`).
- Rede do gateway (dois containers, autenticação WS + saúde): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`).
- Plugins (carregamento de extensões personalizadas + fumaça do registro): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`).

Variáveis de ambiente úteis:

- `ZERO_CONFIG_DIR=...` (padrão: `~/.zero`) montado em `/home/node/.zero`.
- `ZERO_WORKSPACE_DIR=...` (padrão: `~/zero`) montado em `/home/node/zero`.
- `ZERO_PROFILE_FILE=...` (padrão: `~/.profile`) montado em `/home/node/.profile` e carregado antes da execução dos testes.
- `ZERO_LIVE_GATEWAY_MODELS=...` / `ZERO_LIVE_MODELS=...` para filtrar a execução.
- `ZERO_LIVE_REQUIRE_PROFILE_KEYS=1` para garantir que as credenciais venham do armazenamento de perfis (não do ambiente).

## Sanidade dos Documentos

Execute verificações de documentos após edições: `pnpm docs:list`.

## Regressão Offline (segura para CI)

Estas são regressões do "pipeline real" sem provedores reais:

- Chamada de ferramentas do Gateway (mock OpenAI, gateway real + loop de agente): `src/gateway/gateway.tool-calling.mock-openai.test.ts`.
- Assistente do Gateway (WS `wizard.start`/`wizard.next`, grava config + autenticação obrigatória): `src/gateway/gateway.wizard.e2e.test.ts`.

## Evals de confiabilidade do agente (skills)

Já temos alguns testes seguros para CI que se comportam como "evals de confiabilidade do agente":

- Chamada de ferramenta mock através do gateway real + loop de agente (`src/gateway/gateway.tool-calling.mock-openai.test.ts`).
- Fluxos de integração de ponta a ponta que validam a fiação da sessão e os efeitos da configuração (`src/gateway/gateway.wizard.e2e.test.ts`).

O que ainda falta para habilidades (Skills) (veja [Habilidades](/tools/skills)):

- **Decisão:** quando as habilidades são listadas no prompt, o agente escolhe a habilidade correta (ou evita as irrelevantes)?
- **Conformidade:** o agente lê o `SKILL.md` antes do uso e segue os passos/argumentos necessários?
- **Contratos de fluxo de trabalho:** cenários de múltiplas rodadas que validam a ordem das ferramentas, a manutenção do histórico da sessão e as fronteiras da sandbox.

Evals futuras devem permanecer determinísticas primeiro:

- Um executor de cenários usando provedores mock para validar chamadas de ferramentas + ordem, leitura de arquivos de habilidades e fiação da sessão.
- Uma pequena suíte de cenários focados em habilidades (usar vs evitar, controle de acesso, injeção de prompt).
- Evals live opcionais (opt-in, via variáveis de ambiente) apenas após a suíte segura para CI estar implementada.

## Adicionando regressões (orientação)

Quando você corrigir um problema de provedor/modelo descoberto em live:

- Adicione uma regressão segura para CI se possível (provedor mock/stub, ou capture a transformação exata do formato da requisição).
- Se for inerentemente apenas para live (limites de taxa, políticas de autenticação), mantenha o teste live filtrado e opcional via variáveis de ambiente.
- Prefira atingir a camada mais baixa que captura o bug:
  - bug de conversão/replay de requisição do provedor → teste de modelos diretos.
  - bug no pipeline de sessão/histórico/ferramentas do gateway → smoke live do gateway ou teste de mock de gateway seguro para CI.
