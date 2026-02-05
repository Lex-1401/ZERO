---
summary: "Perguntas frequentes sobre a instalação, configuração e uso do ZERO"
---
# FAQ

Respostas rápidas e solução de problemas aprofundada para configurações do mundo real (desenvolvimento local, VPS, multi-agente, chaves OAuth/API, failover de modelo). Para diagnósticos de tempo de execução, consulte [Solução de Problemas](/gateway/troubleshooting). Para a referência completa de configuração, consulte [Configuração](/gateway/configuration).

## Tabela de conteúdos

- [Início rápido e configuração de primeira execução](#inicio-rapido-e-configuracao-de-primeira-execucao)
  - [Estou travado, qual é a maneira mais rápida de destravar?](#estou-travado-qual-e-a-maneira-mais-rapida-de-destravar)
  - [Qual é a maneira recomendada de instalar e configurar o ZERO?](#qual-e-a-maneira-recomendada-de-instalar-e-configurar-o-zero)
  - [Como abro o dashboard após a integração?](#como-abro-o-dashboard-apos-a-integracao)
  - [Como autentico o token do dashboard em localhost vs remoto?](#como-autentico-o-token-do-dashboard-em-localhost-vs-remoto)
  - [De qual runtime eu preciso?](#de-qual-runtime-eu-preciso)
  - [Ele roda em Raspberry Pi?](#ele-roda-em-raspberry-pi)
  - [Alguma dica para instalações em Raspberry Pi?](#alguma-dica-para-instalacoes-em-raspberry-pi)
  - [Está travado em "wake up my friend" / a integração não choca. E agora?](#esta-travado-em-wake-up-my-friend-a-integracao-nao-choca-e-agora)
  - [Posso migrar minha configuração para uma nova máquina (Mac mini) sem refazer a integração?](#posso-migrar-minha-configuracao-para-uma-nova-maquina-mac-mini-sem-refazer-a-integracao)
  - [Onde vejo o que há de novo na versão mais recente?](#onde-vejo-o-que-ha-de-novo-na-versao-mais-recente)
  - [Não consigo acessar docs.zero.local (erro de SSL). E agora?](#nao-consigo-acessar-docszero-erro-de-ssl-e-agora)
  - [Qual é a diferença entre stable e beta?](#qual-e-a-diferença-entre-stable-e-beta)
- [Como instalo a versão beta e qual é a diferença entre beta e dev?](#como-instalo-a-versão-beta-e-qual-e-a-diferenca-entre-beta-e-dev)
  - [Como experimento as últimas novidades?](#como-experimento-as-ultimas-novidades)
  - [Quanto tempo costuma levar a instalação e a integração?](#quanto-tempo-costuma-levar-a-instalacao-e-a-integracao)
  - [Instalador travado? Como obtenho mais feedback?](#instalador-travado-como-obtenho-mais-feedback)
  - [A instalação no Windows diz que o git não foi encontrado ou zero não é reconhecido](#a-instalacao-no-windows-diz-que-o-git-nao-foi-encontrado-ou-zero-nao-e-reconhecido)
  - [Os documentos não responderam à minha pergunta - como obtenho uma resposta melhor?](#os-documentos-nao-responderam-a-minha-pergunta-como-obtenho-uma-resposta-melhor)
  - [Como instalo o ZERO no Linux?](#como-instalo-o-zero-no-linux)
  - [Como instalo o ZERO em uma VPS?](#como-instalo-o-zero-em-uma-vps)
  - [Onde estão os guias de instalação em nuvem/VPS?](#onde-estao-os-guias-de-instalacao-em-nuvemvps)
  - [Posso pedir para o Zero se atualizar?](#posso-pedir-para-o-zero-se-atualizar)
  - [O que o assistente de integração realmente faz?](#o-que-o-assistente-de-integracao-realmente-faz)
  - [Preciso de uma assinatura do Claude ou OpenAI para rodar isso?](#preciso-de-uma-assinatura-do-claude-ou-openai-para-rodar-isso)
  - [Posso usar a assinatura Claude Max sem uma chave de API?](#posso-usar-a-assinatura-claude-max-sem-uma-chave-de-api)
  - [Como funciona a autenticação "setup-token" da Anthropic?](#como-funciona-a-autenticacao-setuptoken-da-anthropic)
  - [Onde encontro um setup-token da Anthropic?](#onde-encontro-um-setuptoken-da-anthropic)
  - [Vocês suportam autenticação por assinatura Claude (OAuth do Claude Code)?](#voces-suportam-autenticacao-por-assinatura-claude-oauth-do-claude-code)
  - [Por que estou vendo `HTTP 429: rate_limit_error` da Anthropic?](#por-que-estou-vendo-http-429-ratelimiterror-da-anthropic)
  - [O AWS Bedrock é suportado?](#o-aws-bedrock-e-suportado)
  - [Como funciona a autenticação do Codex?](#como-funciona-a-autenticacao-do-codex)
  - [Vocês suportam autenticação por assinatura OpenAI (OAuth do Codex)?](#voces-suportam-autenticacao-por-assinatura-openai-oauth-do-codex)
  - [Como configuro o OAuth da CLI do Gemini?](#como-configuro-o-oauth-da-cli-do-gemini)
  - [Um modelo local é bom para conversas casuais?](#um-modelo-local-e-bom-para-conversas-casuais)
  - [Como mantenho o tráfego do modelo hospedado em uma região específica?](#como-mantenho-o-trafego-do-modelo-hospedado-em-uma-regiao-especifica)
  - [Tenho que comprar um Mac Mini para instalar isso?](#tenho-que-comprar-um-mac-mini-para-instalar-isso)
  - [Preciso de um Mac mini para suporte ao iMessage?](#preciso-de-un-mac-mini-para-suporte-ao-imessage)
  - [Se eu comprar um Mac mini para rodar o ZERO, posso conectá-lo ao meu MacBook Pro?](#se-eu-comprar-um-mac-mini-para-rodar-o-zero-posso-conecta-lo-ao-meu-macbook-pro)
  - [Posso usar o Bun?](#posso-usar-o-bun)
  - [Telegram: o que vai em `allowFrom`?](#telegram-o-que-vai-em-allowfrom)
  - [Várias pessoas podem usar um único número de WhatsApp com ZEROs diferentes?](#varias-pessoas-podem-usar-um-unico-numero-de-whatsapp-com-zeros-diferentes)
  - [Posso rodar um agente de "chat rápido" e um agente "Opus para codificação"?](#posso-rodar-um-agente-de-chat-rapido-e-um-agente-opus-para-codificacao)
  - [O Homebrew funciona no Linux?](#o-homebrew-funciona-no-linux)
  - [Qual é a diferença entre a instalação hackeável (git) e a instalação npm?](#qual-e-a-diferenca-entre-a-instalacao-hackeavel-git-e-a-instalacao-npm)
  - [Posso alternar entre instalações npm e git mais tarde?](#posso-alternar-entre-instalacoes-npm-e-git-mais-tarde)
  - [Devo rodar o Gateway no meu laptop ou em uma VPS?](#devo-rodar-o-gateway-no-meu-laptop-ou-em-uma-vps)
  - [Quão importante é rodar o ZERO em uma máquina dedicada?](#quao-importante-e-rodar-o-zero-em-uma-maquina-dedicada)
  - [Quais são os requisitos mínimos de VPS e o SO recomendado?](#quais-sao-os-requisitos-minimos-de-vps-e-o-so-recomendado)
  - [Posso rodar o ZERO em uma VM e quais são os requisitos?](#posso-rodar-o-zero-em-uma-vm-e-quais-sao-os-requisitos)
- [O que é o ZERO?](#o-que-e-o-zero)
  - [O que é o ZERO, em um parágrafo?](#o-que-e-o-zero-em-um-paragrafo)
  - [Qual é a proposta de valor?](#qual-e-a-proposta-de-valor)
  - [Acabei de configurar, o que devo fazer primeiro?](#acabei-de-configurar-o-que-devo-fazer-primeiro)
  - [Quais são os cinco principais casos de uso diário do ZERO?](#quais-sao-os-cinco-principais-casos-de-uso-diario-do-zero)
  - [O ZERO pode ajudar com anúncios de divulgação de geração de leads e blogs para um SaaS?](#o-zero-pode-ajudar-com-anuncios-de-divulgacao-de-geracao-de-leads-e-blogs-para-um-saas)
  - [Quais são as vantagens vs Claude Code para desenvolvimento web?](#quais-sao-as-vantagens-vs-claude-code-para-desenvolvimento-web)
- [Habilidades e automação](#habilidades-e-automacao)
  - [Como personalizo habilidades sem manter o repositório sujo?](#como-personalizo-habilidades-sem-manter-o-repositorio-sujo)
  - [Posso carregar habilidades de uma pasta personalizada?](#posso-carregar-habilidades-de-uma-pasta-personalizada)
  - [Como posso usar modelos diferentes para tarefas diferentes?](#como-posso-usar-modelos-diferentes-para-tarefas-diferentes)
  - [O bot congela enquanto faz um trabalho pesado. Como eu transfiro isso?](#o-bot-congela-enquanto-faz-um-trabalho-pesado-como-eu-transfiro-isso)
  - [Cron ou lembretes não disparam. O que devo verificar?](#cron-ou-lembretes-nao-disparam-o-que-devo-verificar)
  - [Como instalo habilidades no Linux?](#como-instalo-habilidades-no-linux)
  - [O ZERO pode executar tarefas em um cronograma ou continuamente em segundo plano?](#o-zero-pode-executar-tarefas-em-um-cronograma-ou-continuamente-em-segundo-plano)
  - [Posso executar habilidades exclusivas para Apple/macOS a partir do Linux?](#posso-executar-habilidades-exclusivas-para-applemacos-a-partir-do-linux)
  - [Vocês têm uma integração com o Notion ou HeyGen?](#voces-tem-uma-integracao-com-o-notion-ou-heygen)
  - [Como instalo a extensão do Chrome para controle do navegador?](#como-instalo-a-extensao-do-chrome-para-controle-do-navegador)
- [Sandboxing e memória](#sandboxing-e-memoria)
  - [Existe um documento dedicado ao sandboxing?](#existe-um-documento-dedicado-ao-sandboxing)
  - [Como vinculo uma pasta do host ao sandbox?](#como-vinculo-uma-pasta-do-host-ao-sandbox)
  - [Como funciona a memória?](#como-funciona-a-memoria)
  - [A memória continua esquecendo as coisas. Como faço para que elas grudem?](#a-memoria-continua-esquecendo-as-coisas-como-faco-para-que-elas-grudem)
  - [A memória persiste para sempre? Quais são os limites?](#a-memoria-persiste-para-sempre-quais-sao-os-limites)
  - [A busca de memória semântica requer uma chave de API da OpenAI?](#a-busca-de-memoria-semantica-requer-uma-chave-de-api-da-openai)
- [Onde as coisas vivem no disco](#onde-as-coisas-vivem-no-disco)
  - [Todos os dados usados com o ZERO são salvos localmente?](#todos-os-dados-usados-com-o-zero-sao-salvos-localmente)
  - [Onde o ZERO armazena seus dados?](#onde-o-zero-armazena-seus-dados)
  - [Onde devem viver AGENTS.md / SOUL.md / USER.md / MEMORY.md?](#onde-devem-viver-agentsmd-soulmd-usermd-memorymd)
  - [Qual é a estratégia de backup recomendada?](#qual-e-a-estrategia-de-backup-recomendada)
  - [Como desinstalo completamente o ZERO?](#como-desinstalo-completamente-o-zero)
  - [Os agentes podem trabalhar fora do espaço de trabalho (workspace)?](#os-agentes-podem-trabalhar-fora-do-espaco-de-trabalho-workspace)
  - [Estou no modo remoto - onde está o armazenamento da sessão?](#estou-no-modo-remoto-onde-esta-o-armazenamento-da-sessao)
- [Básicos de configuração](#basicos-de-configuracao)
  - [Qual é o formato da configuração? Onde ela está?](#qual-e-o-formato-da-configuracao-onde-ela-esta)
  - [Defini `gateway.bind: "lan"` (ou `"tailnet"`) e agora nada escuta / a UI diz não autorizado](#defini-gatewaybind-lan-ou-tailnet-e-agora-nada-escuta-a-ui-diz-nao-autorizado)
  - [Por que preciso de um token no localhost agora?](#por-que-preciso-de-um-token-no-localhost-agora)
  - [Tenho que reiniciar após alterar a configuração?](#tenho-que-reiniciar-apos-alterar-a-configuracao)
  - [Como habilito a busca na web (e o web fetch)?](#como-habilito-a-busca-na-web-e-o-web-fetch)
  - [config.apply limpou minha configuração. Como recupero e evito isso?](#configapply-limpou-minha-configuracao-como-recupero-e-evito-isso)
  - [Como executo um Gateway central com trabalhadores especializados em vários dispositivos?](#como-executo-um-gateway-central-com-trabalhadores-especializados-em-varios-dispositivos)
  - [O navegador do ZERO pode rodar headless?](#o-navegador-do-zero-pode-rodar-headless)
  - [Como uso o Brave para controle do navegador?](#como-uso-o-brave-para-controle-do-navegador)
- [Gateways remotos + nós](#gateways-remotos-nos)
  - [Como os comandos se propagam entre o Telegram, o gateway e os nós?](#como-os-comandos-se-propagam-entre-o-telegram-o-gateway-e-os-nos)
  - [Como meu agente pode acessar meu computador se o Gateway está hospedado remotamente?](#como-meu-agente-pode-acessar-meu-computador-se-o-gateway-esta-hospedado-remotamente)
  - [O Tailscale está conectado, mas não recebo respostas. E agora?](#o-tailscale-esta-conectado-mas-nao-recebo-respostas-e-agora)
  - [Dois ZEROs podem conversar entre si (local + VPS)?](#dois-zeros-podem-conversar-entre-si-local-vps)
  - [Preciso de VPSes separadas para múltiplos agentes?](#preciso-de-vpses-separadas-para-multiplos-agentes)
  - [Existe algum benefício em usar um nó em meu laptop pessoal em vez de SSH a partir de uma VPS?](#existe-algum-benefício-em-usar-um-no-em-meu-laptop-pessoal-em-vez-de-ssh-a-partir-de-uma-vps)
  - [Os nós executam um serviço de gateway?](#os-nos-executam-um-servico-de-gateway)
  - [Existe uma maneira de API / RPC para aplicar configuração?](#existe-uma-maneira-de-api-rpc-para-aplicar-configuracao)
  - [Qual é uma configuração "sensata" mínima para uma primeira instalação?](#qual-e-uma-configuracao-sensata-minima-para-uma-primeira-instalacao)
  - [Como configuro o Tailscale em uma VPS e me conecto a partir do meu Mac?](#como-configuro-o-tailscale-em-uma-vps-e-me-conecto-a-partir-do-meu-mac)
  - [Como conecto um nó Mac a um Gateway remoto (Tailscale Serve)?](#como-conecto-um-no-mac-a-um-gateway-remoto-tailscale-serve)
  - [Devo instalar em um segundo laptop ou apenas adicionar um nó?](#devo-instalar-em-um-segundo-laptop-ou-apenas-adicionar-um-no)
- [Variáveis de ambiente e carregamento de .env](#variaveis-de-ambiente-e-carregamento-de-env)
  - [Como o ZERO carrega as variáveis de ambiente?](#como-o-zero-carrega-as-variaveis-de-ambiente)
  - [“Iniciei o Gateway via serviço e minhas variáveis de ambiente desapareceram.” E agora?](#iniciei-o-gateway-via-servico-e-minhas-variaveis-de-ambiente-desapareceram-e-agora)
  - [Defini `COPILOT_GITHUB_TOKEN`, mas o status dos modelos mostra “Shell env: off.” Por quê?](#defini-copilotgithubtoken-mas-o-status-dos-modelos-mostra-shell-env-off-por-que)
- [Sessões e múltiplos chats](#sessoes-e-multiplos-chats)
  - [Como começo uma conversa nova?](#como-comeco-uma-conversa-nova)
  - [As sessões reiniciam automaticamente se eu nunca enviar `/new`?](#as-sessoes-reiniciam-automaticamente-se-eu-nunca-enviar-new)
  - [Existe uma maneira de criar uma equipe de ZEROs, sendo um CEO e muitos agentes?](#existe-uma-maneira-de-criar-uma-equipe-de-zeros-sendo-um-ceo-e-muitos-agentes)
  - [Por que o contexto foi truncado no meio da tarefa? Como evitar isso?](#por-que-o-contexto-foi-truncado-no-meio-da-tarefa-como-evitar-isso)
  - [Como eu reinicio completamente o ZERO mas o mantenho instalado?](#como-eu-reinicio-completamente-o-zero-mas-o-mantenho-instalado)
  - [Estou recebendo erros de “contexto muito grande” - como eu reinicio ou compacto?](#estou-recebendo-erros-de-contexto-muito-grande-como-eu-reinicio-ou-compacto)
  - [Por que estou vendo “LLM request rejected: messages.N.content.X.tool_use.input: Field required”?](#por-que-estou-vendo-llm-request-rejected-messagesncontentxtooluseinput-field-required)
  - [Por que estou recebendo mensagens de heartbeat a cada 30 minutos?](#por-que-estou-recebendo-mensagens-de-heartbeat-a-cada-30-minutos)
  - [Preciso adicionar uma “conta de bot” em um grupo de WhatsApp?](#preciso-adicionar-uma-conta-de-bot-em-um-grupo-de-whatsapp)
  - [Como obtenho o JID de um grupo de WhatsApp?](#como-obtenho-o-jid-de-um-grupo-de-whatsapp)
  - [Por que o ZERO não responde em um grupo?](#por-que-o-zero-nao-responde-em-um-grupo)
  - [Grupos/threads compartilham o contexto com DMs?](#grupos-threads-compartilham-o-contexto-com-dms)
  - [Quantos espaços de trabalho e agentes eu posso criar?](#quantos-espacos-de-trabalho-e-agentes-eu-posso-criar)
  - [Posso executar múltiplos bots ou chats ao mesmo tempo (Slack), e como devo configurar isso?](#posso-executar-multiplos-bots-ou-chats-ao-mesmo-tempo-slack-e-como-devo-configurar-isso)
- [Modelos: padrões, seleção, aliases, troca](#modelos-padroes-selecao-aliases-troca)
  - [O que é o “modelo padrão”?](#o-que-e-o-modelo-padrao)
  - [Qual modelo vocês recomendam?](#qual-modelo-voces-recomendam)
  - [Como eu troco os modelos sem apagar minha configuração?](#como-eu-troco-os-modelos-sem-apagar-minha-configuracao)
  - [Posso usar modelos auto-hospedados (llama.cpp, vLLM, Ollama)?](#posso-usar-modelos-auto-hospedados-llamacpp-vllm-ollama)
  - [O que Zero, Flawd e Krill usam para modelos?](#o-que-zero-flawd-e-krill-usam-para-modelos)
  - [Como eu troco os modelos em tempo real (sem reiniciar)?](#como-eu-troco-os-modelos-em-tempo-real-sem-reiniciar)
  - [Posso usar GPT 5.2 para tarefas diárias e Codex 5.2 para codificação?](#posso-usar-gpt-52-para-tarefas-diarias-e-codex-52-para-codificacao)
  - [Por que vejo “Model … is not allowed” e depois nenhuma resposta?](#por-que-vejo-model-is-not-allowed-e-depois-nenhuma-resposta)
  - [Por que vejo “Unknown model: minimax/MiniMax-M2.1”?](#por-que-vejo-unknown-model-minimaxminimaxm21)
  - [Posso usar o MiniMax como meu padrão e OpenAI para tarefas complexas?](#posso-usar-o-minimax-como-meu-padrao-e-openai-para-tarefas-complexas)
  - [Opus / sonnet / gpt são atalhos integrados?](#opus-sonnet-gpt-sao-atalhos-integrados)
  - [Como eu defino/sobrescrevo atalhos de modelo (aliases)?](#como-eu-defino-sobrescrevo-atalhos-de-modelo-aliases)
  - [Como eu adiciono modelos de outros provedores como OpenRouter ou Z.AI?](#como-eu-adiciono-modelos-de-outros-provedores-como-openrouter-ou-zai)
- [Failover de modelo e “All models failed”](#failover-de-modelo-e-all-models-failed)
  - [Como funciona o failover?](#como-funciona-o-failover)
  - [O que este erro significa?](#o-que-este-erro-significa)
  - [Checklist de correção para `No credentials found for profile "anthropic:default"`](#checklist-de-correcao-para-no-credentials-found-for-profile-anthropicdefault)
  - [Por que ele também tentou o Google Gemini e falhou?](#por-que-ele-tambem-tentou-o-google-gemini-e-falhou)
- [Perfis de autenticação: o que são e como gerenciá-los](#perfis-de-autenticacao-o-que-sao-e-como-gerencia-los)
  - [O que é um perfil de autenticação?](#o-que-e-um-perfil-de-autenticacao)
  - [Quais são as IDs de perfil típicas?](#quais-sao-as-ids-de-perfil-tipicas)
  - [Posso controlar qual perfil de autenticação é tentado primeiro?](#posso-controlar-qual-perfil-de-autenticacao-e-tentado-primeiro)
  - [OAuth vs chave de API: qual é a diferença?](#oauth-vs-chave-de-api-qual-e-a-diferenca)
- [Gateway: portas, “já rodando” e modo remoto](#gateway-portas-ja-rodando-e-modo-remoto)
  - [Qual porta o Gateway usa?](#qual-porta-o-gateway-usa)
  - [Por que `zero gateway status` diz `Runtime: running` mas `RPC probe: failed`?](#por-que-zero-gateway-status-diz-runtime-running-mas-rpc-probe-failed)
  - [Por que `zero gateway status` mostra `Config (cli)` e `Config (service)` diferentes?](#por-que-zero-gateway-status-mostra-config-cli-e-config-service-diferentes)
  - [O que significa “another gateway instance is already listening”?](#o-que-significa-another-gateway-instance-is-already-listening)
  - [Como eu rodo o ZERO em modo remoto (cliente conecta a um Gateway em outro lugar)?](#como-eu-rodo-o-zero-em-modo-remoto-cliente-conecta-a-um-gateway-em-outro-lugar)
  - [A UI de Controle diz “não autorizado” (ou continua reconectando). E agora?](#a-ui-de-controle-diz-nao-autorizado-ou-continua-reconectando-e-agora)
  - [Defini `gateway.bind: "tailnet"`, mas ele não consegue vincular / nada está escutando](#defini-gatewaybind-tailnet-mas-ele-nao-consegue-vincular-nada-esta-escutando)
  - [Posso executar múltiplos Gateways no mesmo host?](#posso-executar-multiplos-gateways-no-mesmo-host)
  - [O que significa “invalid handshake” / código 1008?](#o-que-significa-invalid-handshake-codigo-1008)
- [Registro (Logging) e depuração](#registro-logging-e-depuracao)
  - [Onde estão os logs?](#onde-estao-os-logs)
  - [Como eu inicio/paro/reinicio o serviço do Gateway?](#como-eu-inicioparoreinicio-o-servico-do-gateway)
  - [Fechei meu terminal no Windows - como eu reinicio o ZERO?](#fechei-meu-terminal-no-windows-como-eu-reinicio-o-zero)
  - [O Gateway está no ar, mas as respostas nunca chegam. O que devo verificar?](#o-gateway-esta-no-ar-mas-as-respostas-nunca-chegam-o-que-devo-verificar)
  - ["Disconnected from gateway: no reason" - e agora?](#disconnected-from-gateway-no-reason-e-agora)
  - [O setMyCommands do Telegram falha com erros de rede. O que devo verificar?](#o-setmycommands-do-telegram-falha-com-erros-de-rede-o-que-devo-verificar)
  - [O TUI não mostra nenhuma saída. O que devo verificar?](#o-tui-nao-mostra-nenhuma-saida-o-que-devo-verificar)
  - [Como eu paro completamente e depois inicio o Gateway?](#como-eu-paro-completamente-e-depois-inicio-o-gateway)
  - [ELI5: `zero gateway restart` vs `zero gateway`](#eli5-zero-gateway-restart-vs-zero-gateway)
  - [Qual é a maneira mais rápida de obter mais detalhes quando algo falha?](#qual-e-a-maneira-mais-rapida-de-obter-mais-detalhes-quando-algo-falha)
- [Mídia e anexos](#midia-e-anexos)
  - [Minha habilidade gerou uma imagem/PDF, mas nada foi enviado](#minha-habilidade-gerou-uma-imagempdf-mas-nada-foi-enviado)
- [Segurança e controle de acesso](#seguranca-e-controle-de-acesso)
  - [É seguro expor o ZERO a DMs recebidas?](#e-seguro-expor-o-zero-a-dms-recebidas)
  - [Injeção de prompt é apenas uma preocupação para bots públicos?](#injecao-de-prompt-e-apenas-uma-preocupacao-para-bots-publicos)
  - [Meu bot deve ter sua própria conta de e-mail GitHub ou número de telefone?](#meu-bot-deve-ter-sua-propria-conta-de-e-mail-github-ou-numero-de-telefone)
  - [Posso dar a ele autonomia sobre minhas mensagens de texto e isso é seguro?](#posso-dar-a-ele-autonomia-over-minhas-mensagens-de-texto-e-isso-e-seguro)
  - [Posso usar modelos mais baratos para tarefas de assistente pessoal?](#posso-usar-modelos-mais-baratos-para-tarefas-de-assistente-pessoal)
  - [Executei `/start` no Telegram, mas não recebi um código de emparelhamento](#executei-start-no-telegram-mas-nao-recebi-um-codigo-de-emparelhamento)
  - [WhatsApp: ele enviará mensagens para meus contatos? Como funciona o emparelhamento?](#whatsapp-ele-enviara-mensagens-para-meus-contatos-como-funciona-o-emparelhamento)
- [Comandos de chat, abortar tarefas e “ele não para”](#comandos-de-chat-abortar-tarefas-e-ele-nao-para)
  - [Como faço para parar de exibir mensagens internas do sistema no chat?](#como-faco-para-parar-de-exibir-mensagens-internas-do-sistema-no-chat)
  - [Como eu paro/cancelo uma tarefa em execução?](#como-eu-parocancelo-uma-tarefa-em-execucao)
  - [Como envio uma mensagem de Discord a partir do Telegram? (“Cross-context messaging denied”)](#como-envio-uma-mensagem-de-discord-a-partir-do-telegram-cross-context-messaging-denied)
  - [Por que parece que o bot “ignora” mensagens disparadas em sequência rápida?](#por-que-parece-que-o-bot-ignora-mensagens-disparadas-em-sequencia-rapida)

## Primeiros 60 segundos se algo estiver quebrado

1) **Status rápido (primeira verificação)**

   ```bash
   zero status
   ```

   Resumo local rápido: SO + atualização, acessibilidade do gateway/serviço, agentes/sessões, configuração do provedor + problemas de tempo de execução (quando o gateway está acessível).

2) **Relatório colável (seguro para compartilhar)**

   ```bash
   zero status --all
   ```

   Diagnóstico de apenas leitura com tail de log (tokens redigidos).

3) **Estado do daemon + porta**

   ```bash
   zero gateway status
   ```

   Mostra o tempo de execução do supervisor vs acessibilidade RPC, a URL de destino da sonda e qual configuração o serviço provavelmente usou.

4) **Sondas profundas (Deep probes)**

   ```bash
   zero status --deep
   ```

   Executa verificações de saúde do gateway + sondas de provedor (requer um gateway acessível). Veja [Saúde](/gateway/health).

5) **Acompanhar o log mais recente**

   ```bash
   zero logs --follow
   ```

   Se o RPC estiver fora do ar, recorra a:

   ```bash
   tail -f "$(ls -t /tmp/zero/zero-*.log | head -1)"
   ```

   Logs de arquivo são separados de logs de serviço; veja [Registro (Logging)](/logging) e [Solução de Problemas](/gateway/troubleshooting).

6) **Executar o doctor (reparos)**

   ```bash
   zero doctor
   ```

   Repara/migra configuração/estado + executa verificações de saúde. Veja [Doctor](/gateway/doctor).

7) **Instantâneo (Snapshot) do Gateway**

   ```bash
   zero health --json
   zero health --verbose   # mostra a URL de destino + caminho da configuração em caso de erros
   ```

   Pede ao gateway em execução um instantâneo completo (apenas WS). Veja [Saúde](/gateway/health).

## Início rápido e configuração de primeira execução

### Estou travado, qual é a maneira mais rápida de destravar?

Use um agente de IA local que possa **ver sua máquina**. Isso é muito mais eficaz do que perguntar no Discord, porque a maioria dos casos de "estou travado" são **problemas de configuração local ou de ambiente** que os ajudantes remotos não podem inspecionar.

- **Claude Code**: <https://www.anthropic.com/claude-code/>
- **OpenAI Codex**: <https://openai.com/codex/>

Essas ferramentas podem ler o repositório, executar comandos, inspecionar logs e ajudar a corrigir a configuração no nível da máquina (PATH, serviços, permissões, arquivos de autenticação). Dê a eles o **checkout completo do código-fonte** via a instalação hackeável (git):

```bash
curl -fsSL https://zero.local/install.sh | bash -s -- --install-method git
```

Isso instala o ZERO **a partir de um checkout do git**, para que o agente possa ler o código + documentos e raciocinar sobre a versão exata que você está executando. Você sempre pode voltar para a versão estável (stable) mais tarde, executando novamente o instalador sem `--install-method git`.

Dica: peça ao agente para **planejar e supervisionar** a correção (passo a passo), e então execute apenas os comandos necessários. Isso mantém as alterações pequenas e mais fáceis de auditar.

Se você descobrir um bug real ou uma correção, envie um issue no GitHub ou mande um PR:
<https://github.com/zero/zero/issues>
<https://github.com/zero/zero/pulls>

Comece com estes comandos (compartilhe as saídas ao pedir ajuda):

```bash
zero status
zero models status
zero doctor
```

O que eles fazem:

- `zero status`: instantâneo rápido da saúde do gateway/agente + configuração básica.
- `zero models status`: verifica a autenticação do provedor + disponibilidade do modelo.
- `zero doctor`: valida e repara problemas comuns de configuração/estado.

Outras verificações úteis da CLI: `zero status --all`, `zero logs --follow`, `zero gateway status`, `zero health --verbose`.

Loop de debug rápido: [Primeiros 60 segundos se algo estiver quebrado](#primeiros-60-segundos-se-algo-estiver-quebrado).
Documentos de instalação: [Instalar](/install), [Flags do instalador](/install/installer), [Atualização](/install/updating).

### Qual é a maneira recomendada de instalar e configurar o ZERO?

O repositório recomenda rodar a partir do código-fonte e usar o assistente de integração:

```bash
curl -fsSL https://zero.local/install.sh | bash
zero onboard --install-daemon
```

O assistente também pode construir os ativos da UI automaticamente. Após a integração, você normalmente executa o Gateway na porta **18789**.

A partir do código-fonte (colaboradores/dev):

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm build
pnpm ui:build # auto-instala dependências da UI na primeira execução
zero onboard
```

Se você ainda não tiver uma instalação global, execute-a via `pnpm zero onboard`.

### How do I open the dashboard after onboarding

The wizard now opens your browser with a tokenized dashboard URL right after onboarding and also prints the full link (with token) in the summary. Keep that tab open; if it didn’t launch, copy/paste the printed URL on the same machine. Tokens stay local to your host-nothing is fetched from the browser.

### How do I authenticate the dashboard token on localhost vs remote

**Localhost (same machine):**

- Open `http://127.0.0.1:18789/`.
- If it asks for auth, run `zero dashboard` and use the tokenized link (`?token=...`).
- The token is the same value as `gateway.auth.token` (or `ZERO_GATEWAY_TOKEN`) and is stored by the UI after first load.

**Not on localhost:**

- **Tailscale Serve** (recommended): keep bind loopback, run `zero gateway --tailscale serve`, open `https://<magicdns>/`. If `gateway.auth.allowTailscale` is `true`, identity headers satisfy auth (no token).
- **Tailnet bind**: run `zero gateway --bind tailnet --token "<token>"`, open `http://<tailscale-ip>:18789/`, paste token in dashboard settings.
- **SSH tunnel**: `ssh -N -L 18789:127.0.0.1:18789 user@host` then open `http://127.0.0.1:18789/?token=...` from `zero dashboard`.

See [Dashboard](/web/dashboard) and [Web surfaces](/web) for bind modes and auth details.

### What runtime do I need

Node **>= 22** is required. `pnpm` is recommended. Bun is **not recommended** for the Gateway.

### Does it run on Raspberry Pi

Yes. The Gateway is lightweight - docs list **512MB-1GB RAM**, **1 core**, and about **500MB**
disk as enough for personal use, and note that a **Raspberry Pi 4 can run it**.

If you want extra headroom (logs, media, other services), **2GB is recommended**, but it’s
not a hard minimum.

Tip: a small Pi/VPS can host the Gateway, and you can pair **nodes** on your laptop/phone for
local screen/camera/canvas or command execution. See [Nodes](/nodes).

### Any tips for Raspberry Pi installs

Short version: it works, but expect rough edges.

- Use a **64-bit** OS and keep Node >= 22.
- Prefer the **hackable (git) install** so you can see logs and update fast.
- Start without channels/skills, then add them one by one.
- If you hit weird binary issues, it is usually an **ARM compatibility** problem.

Docs: [Linux](/platforms/linux), [Install](/install).

### It is stuck on wake up my friend onboarding will not hatch What now

That screen depends on the Gateway being reachable and authenticated. The TUI also sends
"Wake up, my friend!" automatically on first hatch. If you see that line with **no reply**
and tokens stay at 0, the agent never ran.

1) Restart the Gateway:

```bash
zero gateway restart
```

1) Check status + auth:

```bash
zero status
zero models status
zero logs --follow
```

1) If it still hangs, run:

```bash
zero doctor
```

If the Gateway is remote, ensure the tunnel/Tailscale connection is up and that the UI
is pointed at the right Gateway. See [Remote access](/gateway/remote).

### Can I migrate my setup to a new machine Mac mini without redoing onboarding

Yes. Copy the **state directory** and **workspace**, then run Doctor once. This
keeps your bot “exactly the same” (memory, session history, auth, and channel
state) as long as you copy **both** locations:

1) Install ZERO on the new machine.
2) Copy `$ZERO_STATE_DIR` (default: `~/.zero`) from the old machine.
3) Copy your workspace (default: `~/zero`).
4) Run `zero doctor` and restart the Gateway service.

That preserves config, auth profiles, WhatsApp creds, sessions, and memory. If you’re in
remote mode, remember the gateway host owns the session store and workspace.

**Important:** if you only commit/push your workspace to GitHub, you’re backing
up **memory + bootstrap files**, but **not** session history or auth. Those live
under `~/.zero/` (for example `~/.zero/agents/<agentId>/sessions/`).

Related: [Where things live on disk](/help/faq#where-does-zero-store-its-data),
[Agent workspace](/concepts/agent-workspace), [Doctor](/gateway/doctor),
[Remote mode](/gateway/remote).

### Where do I see whats new in the latest version

Check the GitHub changelog:  
<https://github.com/zero/zero/blob/main/CHANGELOG.md>

Newest entries are at the top. If the top section is marked **Unreleased**, the next dated
section is the latest shipped version. Entries are grouped by **Highlights**, **Changes**, and
**Fixes** (plus docs/other sections when needed).

### I cant access docszero SSL error What now

Some Comcast/Xfinity connections incorrectly block `docs.zero.local` via Xfinity
Advanced Security. Disable it or allowlist `docs.zero.local`, then retry. More
detail: [Troubleshooting](/help/troubleshooting#docszero-shows-an-ssl-error-comcastxfinity).
Please help us unblock it by reporting here: <https://spa.xfinity.com/check_url_status>.

If you still can't reach the site, the docs are mirrored on GitHub:
<https://github.com/zero/zero/tree/main/docs>

### Whats the difference between stable and beta

**Stable** and **beta** are **npm dist‑tags**, not separate code lines:

- `latest` = stable
- `beta` = early build for testing

We ship builds to **beta**, test them, and once a build is solid we **promote
that same version to `latest`**. That’s why beta and stable can point at the
**same version**.

See what changed:  
<https://github.com/zero/zero/blob/main/CHANGELOG.md>

### How do I install the beta version and whats the difference between beta and dev

**Beta** is the npm dist‑tag `beta` (may match `latest`).  
**Dev** is the moving head of `main` (git); when published, it uses the npm dist‑tag `dev`.

One‑liners (macOS/Linux):

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://zero.local/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://zero.local/install.sh | bash -s -- --install-method git
```

Windows installer (PowerShell):
<https://zero.local/install.ps1>

More detail: [Development channels](/install/development-channels) and [Installer flags](/install/installer).

### How long does install and onboarding usually take

Rough guide:

- **Install:** 2-5 minutes
- **Onboarding:** 5-15 minutes depending on how many channels/models you configure

If it hangs, use [Installer stuck](/help/faq#installer-stuck-how-do-i-get-more-feedback)
and the fast debug loop in [Im stuck](/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck).

### How do I try the latest bits

Two options:

1) **Dev channel (git checkout):**

```bash
zero update --channel dev
```

This switches to the `main` branch and updates from source.

1) **Hackable install (from the installer site):**

```bash
curl -fsSL https://zero.local/install.sh | bash -s -- --install-method git
```

That gives you a local repo you can edit, then update via git.

If you prefer a clean clone manually, use:

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm build
```

Docs: [Update](/cli/update), [Development channels](/install/development-channels),
[Install](/install).

### Installer stuck How do I get more feedback

Re-run the installer with **verbose output**:

```bash
curl -fsSL https://zero.local/install.sh | bash -s -- --verbose
```

Beta install with verbose:

```bash
curl -fsSL https://zero.local/install.sh | bash -s -- --beta --verbose
```

For a hackable (git) install:

```bash
curl -fsSL https://zero.local/install.sh | bash -s -- --install-method git --verbose
```

More options: [Installer flags](/install/installer).

### Windows install says git not found or zero not recognized

Two common Windows issues:

**1) npm error spawn git / git not found**

- Install **Git for Windows** and make sure `git` is on your PATH.
- Close and reopen PowerShell, then re-run the installer.

**2) zero is not recognized after install**

- Your npm global bin folder is not on PATH.
- Check the path:

  ```powershell
  npm config get prefix
  ```

- Ensure `<prefix>\\bin` is on PATH (on most systems it is `%AppData%\\npm`).
- Close and reopen PowerShell after updating PATH.

If you want the smoothest Windows setup, use **WSL2** instead of native Windows.
Docs: [Windows](/platforms/windows).

### Como abro o dashboard após a integração?

Após rodar o Gateway (usando `zero gateway` ou via serviço), você pode abrir a UI de Controle em:

- Localmente: `http://localhost:18789/control` (se configurado na porta padrão)
- Em uma VPS: `http://sua_vps_ip:18789/control`

Você precisará de um **token de acesso**. Você pode obtê-lo a partir do seu chat de emparelhamento (Telegram/WhatsApp) enviando o comando `/token` ou via CLI:

```bash
zero gateway list-tokens
```

### Como autentico o token do dashboard em localhost vs remoto?

- **Localhost**: A TUI do ZERO (ou o assistente de integração) geralmente tenta abrir o navegador com o token já na URL.
- **Remoto/VPS**: Se você estiver acessando seu Gateway a partir de outro computador, precisará colar o token manualmente na tela de login da UI.

Observação: Se você estiver usando o **Tailscale**, poderá usar o MagicDNS (ex: `http://meu-gateway:18789/control`).

### De qual runtime eu preciso?

O ZERO requer **Node.js 20+** (recomendado 22 LTS). Ele também usa:

- **Git** (para atualizações e instalação a partir do código-fonte)
- **pnpm** (gerenciador de pacotes recomendado)

### Ele roda em Raspberry Pi?

Sim! O ZERO foi testado em:

- Raspberry Pi 4 (8GB recomendado)
- Raspberry Pi 5 (funciona muito bem)

Certifique-se de estar usando uma versão de 64 bits do Raspberry Pi OS.

### Alguma dica para instalações em Raspberry Pi?

1. Use o **pnpm** para economizar espaço em disco e acelerar as instalações.
2. Se você estiver usando modelos locais (Ollama), o RPi 4 pode ser lento. Considere usar modelos de nuvem (Anthropic/OpenAI) via chaves de API para uma experiência mais responsiva.
3. Use o **PM2** ou o serviço integrado do ZERO para mantê-lo rodando após o fechamento do SSH.

### Está travado em "wake up my friend" / a integração não choca. E agora?

Isso geralmente significa que o Gateway não consegue se comunicar com o provedor do canal (Telegram/WhatsApp/Slack).

1. Verifique sua conexão com a internet.
2. Verifique se as credenciais do canal estão corretas no seu `config.yaml`.
3. Confira os logs para erros detalhados: `zero logs --follow`.
4. Tente reiniciar o gateway: `zero gateway restart`.

### Posso migrar minha configuração para uma nova máquina (Mac mini) sem refazer a integração?

Sim. Basta copiar a pasta de configuração do ZERO para a nova máquina:

- macOS: `~/Library/Application Support/zero`
- Linux: `~/.config/zero`

Certifique-se de que o Node.js esteja instalado na nova máquina e execute `zero status` para verificar.

### Onde vejo o que há de novo na versão mais recente?

Confira as [Notas de Versão (Release Notes)](/help/release-notes) ou o arquivo `CHANGELOG.md` no repositório GitHub.

### Não consigo acessar docs.zero.local (erro de SSL). E agora?

Isso pode acontecer se o seu ISP ou firewall estiver bloqueando o domínio. Tente usar uma VPN ou verifique as configurações do seu DNS. Você também pode ler a documentação localmente na pasta `docs/` do repositório.

### Qual é a diferença entre stable e beta?

- **Stable**: Versões testadas e recomendadas para a maioria dos usuários.
- **Beta**: Inclui os recursos mais recentes para testes. Pode conter bugs.

Para alternar para a versão beta:

```bash
zero update --beta
```

## Como instalo a versão beta e qual é a diferença entre beta e dev?

### Como experimento as últimas novidades?

Você pode usar o canal beta:

```bash
zero update --channel beta
```

Ou, se você instalou via git, mude para a branch `main`:

```bash
git checkout main
git pull
pnpm install && pnpm build
```

A versão **dev** refere-se ao estado atual da branch `main`, enquanto a **beta** é um instantâneo (snapshot) mais estável da branch dev.

### Quanto tempo costuma levar a instalação e a integração?

Normalmente entre 2 a 5 minutos, dependendo da velocidade da sua internet e se você já tem as dependências (Node.js, Git) instaladas.

### Instalador travado? Como obtenho mais feedback?

Execute o instalador com a flag de debug (se disponível) ou verifique os logs do sistema. Se estiver instalando via script shell, tente:

```bash
bash -x install.sh
```

### A instalação no Windows diz que o git não foi encontrado ou zero não é reconhecido

No Windows, certifique-se de:

1. Instalar o **Git para Windows**.
2. Adicionar o caminho do binário do ZERO ao seu **PATH** do sistema.
3. Reiniciar o seu terminal (Powershell ou CMD).

Se você usou o instalador automático, ele deve ter tentado fazer isso por você.

### Os documentos não responderam à minha pergunta - como obtenho uma resposta melhor?

1. Use o comando `zero status --all` para gerar um relatório e peça para um agente de IA (como o Claude) analisá-lo.
2. Verifique a [Solução de Problemas](/gateway/troubleshooting).
3. Entre no nosso canal do Discord.

### Como instalo o ZERO no Linux?

O script de instalação de uma linha funciona na maioria das distribuições Linux (Ubuntu, Debian, Fedora, Arch):

```bash
curl -fsSL https://zero.local/install.sh | bash
```

### Como instalo o ZERO em uma VPS?

O processo é o mesmo que no Linux. Recomendamos usar o **Tailscale** para acesso seguro e o comando `zero onboard --install-daemon` para manter o Gateway rodando em segundo plano.

### Onde estão os guias de instalação em nuvem/VPS?

Confira a seção [VPS e Nuvem](/install/vps) em nossa documentação.

### Posso pedir para o Zero se atualizar?

Sim! Se o Zero tiver permissões de escrita na pasta de instalação, você pode enviar o comando `/update` no chat (se a habilidade de atualização estiver habilitada) ou rodar na CLI:

```bash
zero update
can import the CLI login or run the OAuth flow for you.

See [OAuth](/concepts/oauth), [Model providers](/concepts/model-providers), and [Wizard](/start/wizard).

### How do I set up Gemini CLI OAuth

Gemini CLI uses a **plugin auth flow**, not a client id or secret in `zero.json`.

Steps:

1) Enable the plugin: `zero plugins enable google-gemini-cli-auth`
2) Login: `zero models auth login --provider google-gemini-cli --set-default`

This stores OAuth tokens in auth profiles on the gateway host. Details: [Model providers](/concepts/model-providers).

### Is a local model OK for casual chats

Usually no. ZERO needs large context + strong safety; small cards truncate and leak. If you must, run the **largest** MiniMax M2.1 build you can locally (LM Studio) and see [/gateway/local-models](/gateway/local-models). Smaller/quantized models increase prompt-injection risk - see [Security](/gateway/security).

### How do I keep hosted model traffic in a specific region

Pick region-pinned endpoints. OpenRouter exposes US-hosted options for MiniMax, Kimi, and GLM; choose the US-hosted variant to keep data in-region. You can still list Anthropic/OpenAI alongside these by using `models.mode: "merge"` so fallbacks stay available while respecting the regioned provider you select.

### Do I have to buy a Mac Mini to install this

No. ZERO runs on macOS or Linux (Windows via WSL2). A Mac mini is optional - some people
buy one as an always‑on host, but a small VPS, home server, or Raspberry Pi‑class box works too.

You only need a Mac **for macOS‑only tools**. For iMessage, you can keep the Gateway on Linux
and run `imsg` on any Mac over SSH by pointing `channels.imessage.cliPath` at an SSH wrapper.
If you want other macOS‑only tools, run the Gateway on a Mac or pair a macOS node.

Docs: [iMessage](/channels/imessage), [Nodes](/nodes), [Mac remote mode](/platforms/mac/remote).

### Do I need a Mac mini for iMessage support

You need **some macOS device** signed into Messages. It does **not** have to be a Mac mini -
any Mac works. ZERO’s iMessage integrations run on macOS (BlueBubbles or `imsg`), while
the Gateway can run elsewhere.

Common setups:

- Run the Gateway on Linux/VPS, and point `channels.imessage.cliPath` at an SSH wrapper that
  runs `imsg` on the Mac.
- Run everything on the Mac if you want the simplest single‑machine setup.

Docs: [iMessage](/channels/imessage), [BlueBubbles](/channels/bluebubbles),
[Mac remote mode](/platforms/mac/remote).

### If I buy a Mac mini to run ZERO can I connect it to my MacBook Pro

Yes. The **Mac mini can run the Gateway**, and your MacBook Pro can connect as a
**node** (companion device). Nodes don’t run the Gateway - they provide extra
capabilities like screen/camera/canvas and `system.run` on that device.

Common pattern:

- Gateway on the Mac mini (always‑on).
- MacBook Pro runs the macOS app or a node host and pairs to the Gateway.
- Use `zero nodes status` / `zero nodes list` to see it.

Docs: [Nodes](/nodes), [Nodes CLI](/cli/nodes).

### Can I use Bun

Bun is **not recommended**. We see runtime bugs, especially with WhatsApp and Telegram.
Use **Node** for stable gateways.

If you still want to experiment with Bun, do it on a non‑production gateway
without WhatsApp/Telegram.

### Telegram what goes in allowFrom

`channels.telegram.allowFrom` is **the human sender’s Telegram user ID** (numeric, recommended) or `@username`. It is not the bot username.

Safer (no third-party bot):

- DM your bot, then run `zero logs --follow` and read `from.id`.

Official Bot API:

- DM your bot, then call `https://api.telegram.org/bot<bot_token>/getUpdates` and read `message.from.id`.

Third-party (less private):

- DM `@userinfobot` or `@getidsbot`.

See [/channels/telegram](/channels/telegram#access-control-dms--groups).

### Can multiple people use one WhatsApp number with different ZEROs

Yes, via **multi‑agent routing**. Bind each sender’s WhatsApp **DM** (peer `kind: "dm"`, sender E.164 like `+15551234567`) to a different `agentId`, so each person gets their own workspace and session store. Replies still come from the **same WhatsApp account**, and DM access control (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) is global per WhatsApp account. See [Multi-Agent Routing](/concepts/multi-agent) and [WhatsApp](/channels/whatsapp).

### Can I run a fast chat agent and an Opus for coding agent

Yes. Use multi‑agent routing: give each agent its own default model, then bind inbound routes (provider account or specific peers) to each agent. Example config lives in [Multi-Agent Routing](/concepts/multi-agent). See also [Models](/concepts/models) and [Configuration](/gateway/configuration).

### Does Homebrew work on Linux

Yes. Homebrew supports Linux (Linuxbrew). Quick setup:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

If you run ZERO via systemd, ensure the service PATH includes `/home/linuxbrew/.linuxbrew/bin` (or your brew prefix) so `brew`-installed tools resolve in non‑login shells.
Recent builds also prepend common user bin dirs on Linux systemd services (for example `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) and honor `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR`, and `FNM_DIR` when set.

### Whats the difference between the hackable git install and npm install

- **Hackable (git) install:** full source checkout, editable, best for contributors.
  You run builds locally and can patch code/docs.
- **npm install:** global CLI install, no repo, best for “just run it.”
  Updates come from npm dist‑tags.

Docs: [Getting started](/start/getting-started), [Updating](/install/updating).

### Can I switch between npm and git installs later

Yes. Install the other flavor, then run Doctor so the gateway service points at the new entrypoint.
This **does not delete your data** - it only changes the ZERO code install. Your state
(`~/.zero`) and workspace (`~/zero`) stay untouched.

From npm → git:

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm build
zero doctor
zero gateway restart
```

From git → npm:

```bash
npm install -g zero@latest
zero doctor
zero gateway restart
```

Doctor detects a gateway service entrypoint mismatch and offers to rewrite the service config to match the current install (use `--repair` in automation).

Backup tips: see [Backup strategy](/help/faq#whats-the-recommended-backup-strategy).

### Should I run the Gateway on my laptop or a VPS

Short answer: **if you want 24/7 reliability, use a VPS**. If you want the
lowest friction and you’re okay with sleep/restarts, run it locally.

**Laptop (local Gateway)**

- **Pros:** no server cost, direct access to local files, live browser window.
- **Cons:** sleep/network drops = disconnects, OS updates/reboots interrupt, must stay awake.

**VPS / cloud**

- **Pros:** always‑on, stable network, no laptop sleep issues, easier to keep running.
- **Cons:** often run headless (use screenshots), remote file access only, you must SSH for updates.

**ZERO-specific note:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord all work fine from a VPS. The only real trade-off is **headless browser** vs a visible window. See [Browser](/tools/browser).

**Recommended default:** VPS if you had gateway disconnects before. Local is great when you’re actively using the Mac and want local file access or UI automation with a visible browser.

### How important is it to run ZERO on a dedicated machine

Not required, but **recommended for reliability and isolation**.

- **Dedicated host (VPS/Mac mini/Pi):** always‑on, fewer sleep/reboot interruptions, cleaner permissions, easier to keep running.
- **Shared laptop/desktop:** totally fine for testing and active use, but expect pauses when the machine sleeps or updates.

If you want the best of both worlds, keep the Gateway on a dedicated host and pair your laptop as a **node** for local screen/camera/exec tools. See [Nodes](/nodes).
For security guidance, read [Security](/gateway/security).

### What are the minimum VPS requirements and recommended OS

ZERO is lightweight. For a basic Gateway + one chat channel:

- **Absolute minimum:** 1 vCPU, 1GB RAM, ~500MB disk.
- **Recommended:** 1-2 vCPU, 2GB RAM or more for headroom (logs, media, multiple channels). Node tools and browser automation can be resource hungry.

OS: use **Ubuntu LTS** (or any modern Debian/Ubuntu). The Linux install path is best tested there.

Docs: [Linux](/platforms/linux), [VPS hosting](/vps).

### Can I run ZERO in a VM and what are the requirements

Yes. Treat a VM the same as a VPS: it needs to be always on, reachable, and have enough
RAM for the Gateway and any channels you enable.

Baseline guidance:

- **Absolute minimum:** 1 vCPU, 1GB RAM.
- **Recommended:** 2GB RAM or more if you run multiple channels, browser automation, or media tools.
- **OS:** Ubuntu LTS or another modern Debian/Ubuntu.

If you are on Windows, **WSL2 is the easiest VM style setup** and has the best tooling
compatibility. See [Windows](/platforms/windows), [VPS hosting](/vps).
If you are running macOS in a VM, see [macOS VM](/platforms/macos-vm).

## What is ZERO?

### What is ZERO in one paragraph

ZERO is a personal AI assistant you run on your own devices. It replies on the messaging surfaces you already use (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) and can also do voice + a live Canvas on supported platforms. The **Gateway** is the always-on control plane; the assistant is the product.

### Whats the value proposition

ZERO is not “just a Claude wrapper.” It’s a **local-first control plane** that lets you run a
capable assistant on **your own hardware**, reachable from the chat apps you already use, with
stateful sessions, memory, and tools - without handing control of your workflows to a hosted
SaaS.

```bash
zero cron run <jobId> --force
zero cron runs --id <jobId> --limit 50
```

Docs: [Cron jobs](/automation/cron-jobs), [Cron vs Heartbeat](/automation/cron-vs-heartbeat).

### How do I install skills on Linux

Use **ZeroHub** (CLI) or drop skills into your workspace. The macOS Skills UI isn’t available on Linux.
Browse skills at <https://zerohub.com>.

Install the ZeroHub CLI (pick one package manager):

```bash
npm i -g zerohub
```

```bash
pnpm add -g zerohub
```

### Can ZERO run tasks on a schedule or continuously in the background

Yes. Use the Gateway scheduler:

- **Cron jobs** for scheduled or recurring tasks (persist across restarts).
- **Heartbeat** for “main session” periodic checks.
- **Isolated jobs** for autonomous agents that post summaries or deliver to chats.

Docs: [Cron jobs](/automation/cron-jobs), [Cron vs Heartbeat](/automation/cron-vs-heartbeat),
[Heartbeat](/gateway/heartbeat).

**Can I run Apple macOS only skills from Linux**

Not directly. macOS skills are gated by `metadata.zero.os` plus required binaries, and skills only appear in the system prompt when they are eligible on the **Gateway host**. On Linux, `darwin`-only skills (like `imsg`, `apple-notes`, `apple-reminders`) will not load unless you override the gating.

You have three supported patterns:

**Option A - run the Gateway on a Mac (simplest).**  
Run the Gateway where the macOS binaries exist, then connect from Linux in [remote mode](#how-do-i-run-zero-in-remote-mode-client-connects-to-a-gateway-elsewhere) or over Tailscale. The skills load normally because the Gateway host is macOS.

**Option B - use a macOS node (no SSH).**  
Run the Gateway on Linux, pair a macOS node (menubar app), and set **Node Run Commands** to "Always Ask" or "Always Allow" on the Mac. ZERO can treat macOS-only skills as eligible when the required binaries exist on the node. The agent runs those skills via the `nodes` tool. If you choose "Always Ask", approving "Always Allow" in the prompt adds that command to the allowlist.

**Option C - proxy macOS binaries over SSH (advanced).**  
Keep the Gateway on Linux, but make the required CLI binaries resolve to SSH wrappers that run on a Mac. Then override the skill to allow Linux so it stays eligible.

1) Create an SSH wrapper for the binary (example: `imsg`):

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/imsg "$@"
   ```

2) Put the wrapper on `PATH` on the Linux host (for example `~/bin/imsg`).
3) Override the skill metadata (workspace or `~/.zero/skills`) to allow Linux:

   ```markdown
   ---
   name: imsg
   description: iMessage/SMS CLI for listing chats, history, watch, and sending.
   metadata: {"zero":{"os":["darwin","linux"],"requires":{"bins":["imsg"]}}}
   ---
   ```

4) Start a new session so the skills snapshot refreshes.

For iMessage specifically, you can also point `channels.imessage.cliPath` at an SSH wrapper (ZERO only needs stdio). See [iMessage](/channels/imessage).

### Do you have a Notion or HeyGen integration

Not built‑in today.

Options:

- **Custom skill / plugin:** best for reliable API access (Notion/HeyGen both have APIs).
- **Browser automation:** works without code but is slower and more fragile.

If you want to keep context per client (agency workflows), a simple pattern is:

- One Notion page per client (context + preferences + active work).
- Ask the agent to fetch that page at the start of a session.

If you want a native integration, open a feature request or build a skill
targeting those APIs.

Install skills:

```bash
zerohub install <skill-slug>
zerohub update --all
```

ZeroHub installs into `./skills` under your current directory (or falls back to your configured ZERO workspace); ZERO treats that as `<workspace>/skills` on the next session. For shared skills across agents, place them in `~/.zero/skills/<name>/SKILL.md`. Some skills expect binaries installed via Homebrew; on Linux that means Linuxbrew (see the Homebrew Linux FAQ entry above). See [Skills](/tools/skills) and [ZeroHub](/tools/zerohub).

### How do I install the Chrome extension for browser takeover

Use the built-in installer, then load the unpacked extension in Chrome:

```bash
zero browser extension install
zero browser extension path
```

Then Chrome → `chrome://extensions` → enable “Developer mode” → “Load unpacked” → pick that folder.

Full guide (including remote Gateway via Tailscale + security notes): [Chrome extension](/tools/chrome-extension)

If the Gateway runs on the same machine as Chrome (default setup), you usually **do not** need `zero browser serve`.
You still need to click the extension button on the tab you want to control (it doesn’t auto-attach).

## Sandboxing and memory

### Is there a dedicated sandboxing doc

Yes. See [Sandboxing](/gateway/sandboxing). For Docker-specific setup (full gateway in Docker or sandbox images), see [Docker](/install/docker).

**Can I keep DMs personal but make groups public sandboxed with one agent**

Yes - if your private traffic is **DMs** and your public traffic is **groups**.

Use `agents.defaults.sandbox.mode: "non-main"` so group/channel sessions (non-main keys) run in Docker, while the main DM session stays on-host. Then restrict what tools are available in sandboxed sessions via `tools.sandbox.tools`.

Setup walkthrough + example config: [Groups: personal DMs + public groups](/concepts/groups#pattern-personal-dms-public-groups-single-agent)

Key config reference: [Gateway configuration](/gateway/configuration#agentsdefaultssandbox)

### How do I bind a host folder into the sandbox

Set `agents.defaults.sandbox.docker.binds` to `["host:path:mode"]` (e.g., `"/home/user/src:/src:ro"`). Global + per-agent binds merge; per-agent binds are ignored when `scope: "shared"`. Use `:ro` for anything sensitive and remember binds bypass the sandbox filesystem walls. See [Sandboxing](/gateway/sandboxing#custom-bind-mounts) and [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) for examples and safety notes.

### How does memory work

ZERO memory is just Markdown files in the agent workspace:

- Daily notes in `memory/YYYY-MM-DD.md`
- Curated long-term notes in `MEMORY.md` (main/private sessions only)

ZERO also runs a **silent pre-compaction memory flush** to remind the model
to write durable notes before auto-compaction. This only runs when the workspace
is writable (read-only sandboxes skip it). See [Memory](/concepts/memory).

### Memory keeps forgetting things How do I make it stick

Ask the bot to **write the fact to memory**. Long-term notes belong in `MEMORY.md`,
short-term context goes into `memory/YYYY-MM-DD.md`.

This is still an area we are improving. It helps to remind the model to store memories;
it will know what to do. If it keeps forgetting, verify the Gateway is using the same
workspace on every run.

Docs: [Memory](/concepts/memory), [Agent workspace](/concepts/agent-workspace).

### Does semantic memory search require an OpenAI API key

Only if you use **OpenAI embeddings**. Codex OAuth covers chat/completions and
does **not** grant embeddings access, so **signing in with Codex (OAuth or the
Codex CLI login)** does not help for semantic memory search. OpenAI embeddings
still need a real API key (`OPENAI_API_KEY` or `models.providers.openai.apiKey`).

If you don’t set a provider explicitly, ZERO auto-selects a provider when it
can resolve an API key (auth profiles, `models.providers.*.apiKey`, or env vars).
It prefers OpenAI if an OpenAI key resolves, otherwise Gemini if a Gemini key
resolves. If neither key is available, memory search stays disabled until you
configure it. If you have a local model path configured and present, ZERO
prefers `local`.

If you’d rather stay local, set `memorySearch.provider = "local"` (and optionally
`memorySearch.fallback = "none"`). If you want Gemini embeddings, set
`memorySearch.provider = "gemini"` and provide `GEMINI_API_KEY` (or
`memorySearch.remote.apiKey`). We support **OpenAI, Gemini, or local** embedding
models - see [Memory](/concepts/memory) for the setup details.

### Does memory persist forever What are the limits

Memory files live on disk and persist until you delete them. The limit is your
storage, not the model. The **session context** is still limited by the model
context window, so long conversations can compact or truncate. That is why
memory search exists - it pulls only the relevant parts back into context.

Docs: [Memory](/concepts/memory), [Context](/concepts/context).

## Where things live on disk

### Is all data used with ZERO saved locally

No - **ZERO’s state is local**, but **external services still see what you send them**.

- **Local by default:** sessions, memory files, config, and workspace live on the Gateway host
  (`~/.zero` + your workspace directory).
- **Remote by necessity:** messages you send to model providers (Anthropic/OpenAI/etc.) go to
  their APIs, and chat platforms (WhatsApp/Telegram/Slack/etc.) store message data on their
  servers.
- **You control the footprint:** using local models keeps prompts on your machine, but channel
  traffic still goes through the channel’s servers.

Related: [Agent workspace](/concepts/agent-workspace), [Memory](/concepts/memory).

### Where does ZERO store its data

Everything lives under `$ZERO_STATE_DIR` (default: `~/.zero`):

| Path | Purpose |
|------|---------|
| `$ZERO_STATE_DIR/zero.json` | Main config (JSON5) |
| `$ZERO_STATE_DIR/credentials/oauth.json` | Legacy OAuth import (copied into auth profiles on first use) |
| `$ZERO_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles (OAuth + API keys) |
| `$ZERO_STATE_DIR/agents/<agentId>/agent/auth.json` | Runtime auth cache (managed automatically) |
| `$ZERO_STATE_DIR/credentials/` | Provider state (e.g. `whatsapp/<accountId>/creds.json`) |
| `$ZERO_STATE_DIR/agents/` | Per‑agent state (agentDir + sessions) |
| `$ZERO_STATE_DIR/agents/<agentId>/sessions/` | Conversation history & state (per agent) |
| `$ZERO_STATE_DIR/agents/<agentId>/sessions/sessions.json` | Session metadata (per agent) |

Legacy single‑agent path: `~/.zero/agent/*` (migrated by `zero doctor`).

Your **workspace** (AGENTS.md, memory files, skills, etc.) is separate and configured via `agents.defaults.workspace` (default: `~/zero`).

### Where should AGENTSmd SOULmd USERmd MEMORYmd live

These files live in the **agent workspace**, not `~/.zero`.

- **Workspace (per agent)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (or `memory.md`), `memory/YYYY-MM-DD.md`, optional `HEARTBEAT.md`.
- **State dir (`~/.zero`)**: config, credentials, auth profiles, sessions, logs,
  and shared skills (`~/.zero/skills`).

Default workspace is `~/zero`, configurable via:

```json5
{
  agents: { defaults: { workspace: "~/zero" } }
}
```

If the bot “forgets” after a restart, confirm the Gateway is using the same
workspace on every launch (and remember: remote mode uses the **gateway host’s**
workspace, not your local laptop).

Tip: if you want a durable behavior or preference, ask the bot to **write it into
AGENTS.md or MEMORY.md** rather than relying on chat history.

See [Agent workspace](/concepts/agent-workspace) and [Memory](/concepts/memory).

### Whats the recommended backup strategy

Put your **agent workspace** in a **private** git repo and back it up somewhere
private (for example GitHub private). This captures memory + AGENTS/SOUL/USER
files, and lets you restore the assistant’s “mind” later.

Do **not** commit anything under `~/.zero` (credentials, sessions, tokens).
If you need a full restore, back up both the workspace and the state directory
separately (see the migration question above).

Docs: [Agent workspace](/concepts/agent-workspace).

### How do I completely uninstall ZERO

See the dedicated guide: [Uninstall](/install/uninstall).

### Can agents work outside the workspace

Yes. The workspace is the **default cwd** and memory anchor, not a hard sandbox.
Relative paths resolve inside the workspace, but absolute paths can access other
host locations unless sandboxing is enabled. If you need isolation, use
[`agents.defaults.sandbox`](/gateway/sandboxing) or per‑agent sandbox settings. If you
want a repo to be the default working directory, point that agent’s
`workspace` to the repo root. The ZERO repo is just source code; keep the
workspace separate unless you intentionally want the agent to work inside it.

Example (repo as default cwd):

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo"
    }
  }
}
```

### Im in remote mode where is the session store

Session state is owned by the **gateway host**. If you’re in remote mode, the session store you care about is on the remote machine, not your local laptop. See [Session management](/concepts/session).

## Config basics

### What format is the config Where is it

ZERO reads an optional **JSON5** config from `$ZERO_CONFIG_PATH` (default: `~/.zero/zero.json`):

```
$ZERO_CONFIG_PATH
```

If the file is missing, it uses safe‑ish defaults (including a default workspace of `~/zero`).

### I set gatewaybind lan or tailnet and now nothing listens the UI says unauthorized

Non-loopback binds **require auth**. Configure `gateway.auth.mode` + `gateway.auth.token` (or use `ZERO_GATEWAY_TOKEN`).

```json5
{
  gateway: {
    bind: "lan",
    auth: {
      mode: "token",
      token: "replace-me"
    }
  }
}
```

Notes:

- `gateway.remote.token` is for **remote CLI calls** only; it does not enable local gateway auth.
- The Control UI authenticates via `connect.params.auth.token` (stored in app/UI settings). Avoid putting tokens in URLs.

### Why do I need a token on localhost now

The wizard generates a gateway token by default (even on loopback) so **local WS clients must authenticate**. This blocks other local processes from calling the Gateway. Paste the token into the Control UI settings (or your client config) to connect.

If you **really** want open loopback, remove `gateway.auth` from your config. Doctor can generate a token for you any time: `zero doctor --generate-gateway-token`.

### Do I have to restart after changing config

The Gateway watches the config and supports hot‑reload:

- `gateway.reload.mode: "hybrid"` (default): hot‑apply safe changes, restart for critical ones
- `hot`, `restart`, `off` are also supported

### How do I enable web search and web fetch

`web_fetch` works without an API key. `web_search` requires a Brave Search API
key. **Recommended:** run `zero configure --section web` to store it in
`tools.web.search.apiKey`. Environment alternative: set `BRAVE_API_KEY` for the
Gateway process.

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5
      },
      fetch: {
        enabled: true
      }
    }
  }
}
```

Notes:

- If you use allowlists, add `web_search`/`web_fetch` or `group:web`.
- `web_fetch` is enabled by default (unless explicitly disabled).
- Daemons read env vars from `~/.zero/.env` (or the service environment).

Docs: [Web tools](/tools/web).

### How do I run a central Gateway with specialized workers across devices

The common pattern is **one Gateway** (e.g. Raspberry Pi) plus **nodes** and **agents**:

- **Gateway (central):** owns channels (Signal/WhatsApp), routing, and sessions.
- **Nodes (devices):** Macs/iOS/Android connect as peripherals and expose local tools (`system.run`, `canvas`, `camera`).
- **Agents (workers):** separate brains/workspaces for special roles (e.g. “Hetzner ops”, “Personal data”).
- **Sub‑agents:** spawn background work from a main agent when you want parallelism.
- **TUI:** connect to the Gateway and switch agents/sessions.

Docs: [Nodes](/nodes), [Remote access](/gateway/remote), [Multi-Agent Routing](/concepts/multi-agent), [Sub-agents](/tools/subagents), [TUI](/tui).

### Can the ZERO browser run headless

Yes. It’s a config option:

```json5
{
  browser: { headless: true },
  agents: {
    defaults: {
      sandbox: { browser: { headless: true } }
    }
  }
}
```

Default is `false` (headful). Headless is more likely to trigger anti‑bot checks on some sites. See [Browser](/tools/browser).

Headless usa o **mesmo motor Chromium** e funciona para a maioria das automações (formulários, cliques, raspagem de dados, logins). As principais diferenças:

- Nenhuma janela de navegador visível (use capturas de tela se precisar de recursos visuais).
- Alguns sites são mais rigorosos quanto à automação em modo headless (CAPTCHAs, anti-bot).
  Por exemplo, X/Twitter frequentemente bloqueia

## Onde as coisas vivem no disco

### Todos os dados usados com o ZERO são salvos localmente?

Sim, por padrão, o ZERO prioriza o armazenamento local. Isso inclui:

- Suas chaves de configuração.
- Histórico de conversas (sessões).
- Memórias de longo prazo.
- Arquivos baixados ou gerados por habilidades.

Isso garante que você tenha controle total sobre seus dados e privacidade.

### Onde o ZERO armazena seus dados?

Os caminhos padrão são:

- **macOS**: `~/Library/Application Support/zero`
- **Linux**: `~/.config/zero`
- **Windows**: `%APPDATA%\zero`

Dentro dessa pasta, você encontrará o `config.yaml`, subpastas para `sessions`, `memory` e `logs`.

### Onde devem viver AGENTS.md / SOUL.md / USER.md / MEMORY.md?

Esses arquivos devem estar na raiz do seu **espaço de trabalho (workspace)** atual. O ZERO os lê para obter contexto sobre sua identidade, a alma do bot e memórias específicas do projeto.

### Qual é a estratégia de backup recomendada?

Recomendamos fazer o backup periódico da sua pasta de configuração completa (mencionada acima). Você pode usar ferramentas como o `tar` no Linux/macOS ou simplesmente copiar a pasta para um drive seguro. Se estiver usando Git, você também pode versionar seu workspace (excluindo arquivos sensíveis como chaves de API).

### Como desinstalo completamente o ZERO?

1. Pare o serviço: `zero gateway stop`.
2. Remova o binário (via npm ou removendo a pasta onde clonou o repositório).
3. Apague a pasta de configuração/dados no seu diretório de usuário (veja os caminhos acima).

### Os agentes podem trabalhar fora do espaço de trabalho (workspace)?

Sim, mas você deve conceder permissões explícitas no `config.yaml` através de `mounts` para permitir que o bot acesse diretórios específicos fora da raiz do workspace.

### Estou no modo remoto - onde está o armazenamento da sessão?

No modo remoto, as sessões são armazenadas no **host onde o Gateway está rodando**. O cliente CLI apenas se conecta ao Gateway e exibe as mensagens, mas o estado reside no servidor.

## Básicos de configuração

### Qual é o formato da configuração? Onde ela está?

O ZERO usa o formato **YAML** para seu arquivo principal de configuração, o `config.yaml`. Ele reside na sua pasta de dados do ZERO (veja os caminhos acima). Você pode editá-lo manualmente ou usar o comando `zero configure` para algumas opções.

### Defini `gateway.bind: "lan"` (ou `"tailnet"`) e agora nada escuta / a UI diz não autorizado

1. Verifique se o serviço/interface de rede correspondente está ativo (ex: seu Wi-Fi ou a interface do Tailscale).
2. Certifique-se de que não há firewalls bloqueando a porta 18789.
3. Tente usar `0.0.0.0` para vincular a todas as interfaces se tiver problemas.

### Por que preciso de um token no localhost agora?

Por segurança. Mesmo no localhost, outros aplicativos ou usuários na mesma máquina poderiam interagir com o seu Gateway sem sua permissão. O token garante que apenas você (ou quem tiver a URL com o token) possa acessar o dashboard.

### Tenho que reiniciar após alterar a configuração?

Algumas alterações exigem reinicialização (como mudar a porta do gateway ou credenciais de canais). Outras, como aliases de modelos ou permissões de agentes, podem ser aplicadas em tempo real. Na dúvida, rode `zero gateway restart`.

### Como habilito a busca na web (e o web fetch)?

Você precisa habilitar a habilidade de **Internet** no seu `config.yaml` ou via assistente de integração. Algumas sub-habilidades de busca podem exigir chaves de API extras (como Tavily ou Google Search API), mas o `fetch` básico (ler uma URL) geralmente funciona sem chaves.

### config.apply limpou minha configuração. Como recupero e evito isso?

O ZERO mantém backups automáticos na pasta `backups` dentro do seu diretório de dados antes de aplicar grandes mudanças. Para evitar isso, sempre revise as mudanças antes de rodar comandos de escrita ou edite o arquivo manualmente.

### Como executo um Gateway central com trabalhadores especializados em vários dispositivos?

Use o recurso de **Nós (Nodes)**. Configure seu Gateway principal em uma máquina estável (ex: VPS ou Mac Mini) e conecte trabalhadores (nós) a partir de outros dispositivos usando o CLI. Veja [Nós](/concepts/nodes).

### O navegador do ZERO pode rodar headless?

Sim. Você pode configurar `browser.headless: true` no seu `config.yaml` para que o navegador de automação rode em segundo plano sem abrir janelas.

### Como uso o Brave para controle do navegador?

Você pode apontar o caminho do executável do navegador nas configurações da habilidade `browser` no `config.yaml`, definindo o `executablePath` para o local onde o Brave está instalado no seu sistema.

## Gateways remotos + nós

### Como os comandos se propagam entre o Telegram, o gateway e os nós?

1. Você envia uma mensagem no **Telegram**.
2. O **Gateway** recebe a mensagem via webhook ou pooling.
3. O Gateway processa a mensagem através do agente.
4. Se o agente decidir usar uma ferramenta em um **Nó**, o Gateway envia o comando para o Nó via WebSocket.
5. O Nó executa e devolve o resultado para o Gateway.
6. O Gateway envia a resposta final de volta para o Telegram.

### Como meu agente pode acessar meu computador se o Gateway está hospedado remotamente?

Instale o ZERO no seu computador local e conecte-o como um **Nó** ao seu Gateway remoto. O Nó manterá uma conexão segura com o servidor, permitindo que o agente remoto envie comandos de execução de arquivos ou controle de navegador para sua máquina local.

### O Tailscale está conectado, mas não recebo respostas. E agora?

1. Verifique se o `gateway.bind` está definido como `"tailnet"` ou para o seu endereço IP do Tailscale.
2. Certifique-se de que as ACLs do Tailscale permitem tráfego na porta 18789 entre os dispositivos.
3. Use `zero status --deep` para ver onde a conexão está falhando.

### Dois ZEROs podem conversar entre si (local + VPS)?

Sim! Você pode fazer isso via APIs ou se um tiver a habilidade de interagir com o canal do outro (ex: um bot enviando mensagens de Telegram para o outro).

### Preciso de VPSes separadas para múltiplos agentes?

Não. Um único Gateway do ZERO pode gerenciar múltiplos agentes e espaços de trabalho simultaneamente.

### Existe algum benefício em usar um nó em meu laptop pessoal em vez de SSH a partir de uma VPS?

Sim. Um **Nó** é muito mais poderoso pois permite:

- Controle de navegador local (ver o que você vê).
- Acesso fácil ao sistema de arquivos local sem lidar com chaves SSH complexas para cada comando.
- Notificações nativas do SO.
- Streaming de logs em tempo real para o Gateway.

### Os nós executam um serviço de gateway?

Não. Os nós são clientes leves que se conectam ao serviço do Gateway principal. Eles não precisam ter portas abertas para a internet.

### Existe uma maneira de API / RPC para aplicar configuração?

Sim, o Gateway expõe métodos RPC para gerenciar a configuração. Isso é usado internamente pelo dashboard e pela CLI.

### Qual é uma configuração "sensata" mínima para uma primeira instalação?

Um canal (Telegram ou WhatsApp), um provedor de modelo (Anthropic ou OpenAI) e um workspace básico. O assistente de integração criará isso para você.

### Como configuro o Tailscale em uma VPS e me conecto a partir do meu Mac?

Siga o guia oficial do Tailscale para Linux na sua VPS e use o endereço MagicDNS fornecido para se conectar a partir do app Tailscale do seu Mac.

### Como conecto um nó Mac a um Gateway remoto (Tailscale Serve)?

Use o comando:

```bash
zero node connect --url https://meu-gateway-tailscale/rpc
```

Substitua pela URL protegida pelo Tailscale do seu servidor.

### Devo instalar em um segundo laptop ou apenas adicionar um nó?

Se você quer apenas que o agente execute tarefas naquele laptop enquanto você o usa, adicione-o como um **Nó**. Se você quer que ele seja um bot independente, faça uma instalação completa com Gateway.

Docs: [Nodes](/nodes), [Nodes CLI](/cli/nodes), [Multiple gateways](/gateway/multiple-gateways).

### Do nodes run a gateway service

No. Only **one gateway** should run per host unless you intentionally run isolated profiles (see [Multiple gateways](/gateway/multiple-gateways)). Nodes are peripherals that connect
to the gateway (iOS/Android nodes, or macOS “node mode” in the menubar app). For headless node
hosts and CLI control, see [Node host CLI](/cli/node).

A full restart is required for `gateway`, `discovery`, and `canvasHost` changes.

### Is there an API RPC way to apply config

Yes. `config.apply` validates + writes the full config and restarts the Gateway as part of the operation.

### configapply wiped my config How do I recover and avoid this

`config.apply` replaces the **entire config**. If you send a partial object, everything
else is removed.

Recover:

- Restore from backup (git or a copied `~/.zero/zero.json`).
- If you have no backup, re-run `zero doctor` and reconfigure channels/models.
- If this was unexpected, file a bug and include your last known config or any backup.
- A local coding agent can often reconstruct a working config from logs or history.

Avoid it:

- Use `zero config set` for small changes.
- Use `zero configure` for interactive edits.

Docs: [Config](/cli/config), [Configure](/cli/configure), [Doctor](/gateway/doctor).

### Whats a minimal sane config for a first install

```json5
{
  agents: { defaults: { workspace: "~/zero" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

This sets your workspace and restricts who can trigger the bot.

### How do I set up Tailscale on a VPS and connect from my Mac

Minimal steps:

1) **Install + login on the VPS**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2) **Install + login on your Mac**
   - Use the Tailscale app and sign in to the same tailnet.
3) **Enable MagicDNS (recommended)**
   - In the Tailscale admin console, enable MagicDNS so the VPS has a stable name.
4) **Use the tailnet hostname**
   - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

If you want the Control UI without SSH, use Tailscale Serve on the VPS:

```bash
zero gateway --tailscale serve
```

This keeps the gateway bound to loopback and exposes HTTPS via Tailscale. See [Tailscale](/gateway/tailscale).

### How do I connect a Mac node to a remote Gateway Tailscale Serve

Serve exposes the **Gateway Control UI + WS**. Nodes connect over the same Gateway WS endpoint.

Recommended setup:

1) **Make sure the VPS + Mac are on the same tailnet**.
2) **Use the macOS app in Remote mode** (SSH target can be the tailnet hostname).
   The app will tunnel the Gateway port and connect as a node.
3) **Approve the node** on the gateway:

   ```bash
   zero nodes pending
   zero nodes approve <requestId>
   ```

Docs: [Gateway protocol](/gateway/protocol), [Discovery](/gateway/discovery), [macOS remote mode](/platforms/mac/remote).

## Env vars and .env loading

### How does ZERO load environment variables

ZERO reads env vars from the parent process (shell, launchd/systemd, CI, etc.) and additionally loads:

- `.env` from the current working directory
- a global fallback `.env` from `~/.zero/.env` (aka `$ZERO_STATE_DIR/.env`)

Neither `.env` file overrides existing env vars.

You can also define inline env vars in config (applied only if missing from the process env):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." }
  }
}
```

See [/environment](/environment) for full precedence and sources.

### I started the Gateway via the service and my env vars disappeared What now

Two common fixes:

1) Put the missing keys in `~/.zero/.env` so they’re picked up even when the service doesn’t inherit your shell env.
2) Enable shell import (opt‑in convenience):

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
Use one of these:

- **Compact** (keeps the conversation but summarizes older turns):

  ```

  /compact

  ```

  or `/compact <instructions>` to guide the summary.

- **Reset** (fresh session ID for the same chat key):

  ```

  /new
  /reset

  ```

If it keeps happening:

- Enable or tune **session pruning** (`agents.defaults.contextPruning`) to trim old tool output.
- Use a model with a larger context window.

Docs: [Compaction](/concepts/compaction), [Session pruning](/concepts/session-pruning), [Session management](/concepts/session).

### Why am I seeing LLM request rejected messagesNcontentXtooluseinput Field required

This is a provider validation error: the model emitted a `tool_use` block without the required
`input`. It usually means the session history is stale or corrupted (often after long threads
or a tool/schema change).

Fix: start a fresh session with `/new` (standalone message).

### Why am I getting heartbeat messages every 30 minutes

Heartbeats run every **30m** by default. Tune or disable them:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "2h"   // or "0m" to disable
      }
    }
  }
}
```

If `HEARTBEAT.md` exists but is effectively empty (only blank lines and markdown
headers like `# Heading`), ZERO skips the heartbeat run to save API calls.
If the file is missing, the heartbeat still runs and the model decides what to do.

Per-agent overrides use `agents.list[].heartbeat`. Docs: [Heartbeat](/gateway/heartbeat).

### Do I need to add a bot account to a WhatsApp group

No. ZERO runs on **your own account**, so if you’re in the group, ZERO can see it.
By default, group replies are blocked until you allow senders (`groupPolicy: "allowlist"`).

If you want only **you** to be able to trigger group replies:

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    }
  }
}
```

### How do I get the JID of a WhatsApp group

Option 1 (fastest): tail logs and send a test message in the group:

```bash
zero logs --follow --json
```

Look for `chatId` (or `from`) ending in `@g.us`, like:
`1234567890-1234567890@g.us`.

Option 2 (if already configured/allowlisted): list groups from config:

```bash
zero directory groups list --channel whatsapp
```

Docs: [WhatsApp](/channels/whatsapp), [Directory](/cli/directory), [Logs](/cli/logs).

### Why doesnt ZERO reply in a group

Two common causes:

- Mention gating is on (default). You must @mention the bot (or match `mentionPatterns`).
- You configured `channels.whatsapp.groups` without `"*"` and the group isn’t allowlisted.

See [Groups](/concepts/groups) and [Group messages](/concepts/group-messages).

### Do groupsthreads share context with DMs

Direct chats collapse to the main session by default. Groups/channels have their own session keys, and Telegram topics / Discord threads are separate sessions. See [Groups](/concepts/groups) and [Group messages](/concepts/group-messages).

### How many workspaces and agents can I create

No hard limits. Dozens (even hundreds) are fine, but watch for:

- **Disk growth:** sessions + transcripts live under `~/.zero/agents/<agentId>/sessions/`.
- **Token cost:** more agents means more concurrent model usage.
- **Ops overhead:** per-agent auth profiles, workspaces, and channel routing.

Tips:

- Keep one **active** workspace per agent (`agents.defaults.workspace`).
- Prune old sessions (delete JSONL or store entries) if disk grows.
- Use `zero doctor` to spot stray workspaces and profile mismatches.

### Can I run multiple bots or chats at the same time Slack and how should I set that up

Yes. Use **Multi‑Agent Routing** to run multiple isolated agents and route inbound messages by
channel/account/peer. Slack is supported as a channel and can be bound to specific agents.

Browser access is powerful but not “do anything a human can” - anti‑bot, CAPTCHAs, and MFA can
still block automation. For the most reliable browser control, use the Chrome extension relay
on the machine that runs the browser (and keep the Gateway anywhere).

Best‑practice setup:

- Always‑on Gateway host (VPS/Mac mini).
- One agent per role (bindings).
- Slack channel(s) bound to those agents.
- Local browser via extension relay (or a node) when needed.

Docs: [Multi‑Agent Routing](/concepts/multi-agent), [Slack](/channels/slack),
[Browser](/tools/browser), [Chrome extension](/tools/chrome-extension), [Nodes](/nodes).

## Models: defaults, selection, aliases, switching

### What is the default model

ZERO’s default model is whatever you set as:

```
agents.defaults.model.primary
```

Models are referenced as `provider/model` (example: `anthropic/claude-opus-4-5`). If you omit the provider, ZERO currently assumes `anthropic` as a temporary deprecation fallback - but you should still **explicitly** set `provider/model`.

### What model do you recommend

**Recommended default:** `anthropic/claude-opus-4-5`.  
**Good alternative:** `anthropic/claude-sonnet-4-5`.  
**Reliable (less character):** `openai/gpt-5.2` - nearly as good as Opus, just less personality.  
**Budget:** `zai/glm-4.7`.

MiniMax M2.1 has its own docs: [MiniMax](/providers/minimax) and
[Local models](/gateway/local-models).

Rule of thumb: use the **best model you can afford** for high-stakes work, and a cheaper
model for routine chat or summaries. You can route models per agent and use sub-agents to
parallelize long tasks (each sub-agent consumes tokens). See [Models](/concepts/models) and
[Sub-agents](/tools/subagents).

Strong warning: weaker/over-quantized models are more vulnerable to prompt
injection and unsafe behavior. See [Security](/gateway/security).

More context: [Models](/concepts/models).

### Can I use selfhosted models llamacpp vLLM Ollama

Yes. If your local server exposes an OpenAI-compatible API, you can point a
custom provider at it. Ollama is supported directly and is the easiest path.

Security note: smaller or heavily quantized models are more vulnerable to prompt
injection. We strongly recommend **large models** for any bot that can use tools.
If you still want small models, enable sandboxing and strict tool allowlists.

Docs: [Ollama](/providers/ollama), [Local models](/gateway/local-models),
[Model providers](/concepts/model-providers), [Security](/gateway/security),
[Sandboxing](/gateway/sandboxing).

### How do I switch models without wiping my config

Use **model commands** or edit only the **model** fields. Avoid full config replaces.

Safe options:

- `/model` in chat (quick, per-session)
- `zero models set ...` (updates just model config)
- `zero configure --section models` (interactive)
- edit `agents.defaults.model` in `~/.zero/zero.json`

Avoid `config.apply` with a partial object unless you intend to replace the whole config.
If you did overwrite config, restore from backup or re-run `zero doctor` to repair.

Docs: [Models](/concepts/models), [Configure](/cli/configure), [Config](/cli/config), [Doctor](/gateway/doctor).

### What do Zero Flawd and Krill use for models

- **Zero + Flawd:** Anthropic Opus (`anthropic/claude-opus-4-5`) - see [Anthropic](/providers/anthropic).
- **Krill:** MiniMax M2.1 (`minimax/MiniMax-M2.1`) - see [MiniMax](/providers/minimax).

### How do I switch models on the fly without restarting

Use the `/model` command as a standalone message:

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

You can list available models with `/model`, `/model list`, or `/model status`.

`/model` (and `/model list`) shows a compact, numbered picker. Select by number:

```
/model 3
```

You can also force a specific auth profile for the provider (per session):

```
/model opus@anthropic:claude-cli
/model opus@anthropic:default
```

Tip: `/model status` shows which agent is active, which `auth-profiles.json` file is being used, and which auth profile will be tried next.
It also shows the configured provider endpoint (`baseUrl`) and API mode (`api`) when available.

**How do I unpin a profile I set with profile**

Re-run `/model` **without** the `@profile` suffix:

```
/model anthropic/claude-opus-4-5
```

If you want to return to the default, pick it from `/model` (or send `/model <default provider/model>`).
Use `/model status` to confirm which auth profile is active.

### Can I use GPT 5.2 for daily tasks and Codex 5.2 for coding

Yes. Set one as default and switch as needed:

- **Quick switch (per session):** `/model gpt-5.2` for daily tasks, `/model gpt-5.2-codex` for coding.
- **Default + switch:** set `agents.defaults.model.primary` to `openai-codex/gpt-5.2`, then switch to `openai-codex/gpt-5.2-codex` when coding (or the other way around).
- **Sub-agents:** route coding tasks to sub-agents with a different default model.

See [Models](/concepts/models) and [Slash commands](/tools/slash-commands).

### Why do I see Model is not allowed and then no reply

If `agents.defaults.models` is set, it becomes the **allowlist** for `/model` and any
session overrides. Choosing a model that isn’t in that list returns:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

That error is returned **instead of** a normal reply. Fix: add the model to
`agents.defaults.models`, remove the allowlist, or pick a model from `/model list`.

### Why do I see Unknown model minimaxMiniMaxM21

This means the **provider isn’t configured** (no MiniMax provider config or auth
profile was found), so the model can’t be resolved. A fix for this detection is
in **2026.1.12** (unreleased at the time of writing).

Fix checklist:

1) Upgrade to **2026.1.12** (or run from source `main`), then restart the gateway.
2) Make sure MiniMax is configured (wizard or JSON), or that a MiniMax API key
   exists in env/auth profiles so the provider can be injected.
3) Use the exact model id (case‑sensitive): `minimax/MiniMax-M2.1` or
   `minimax/MiniMax-M2.1-lightning`.
4) Run:

   ```bash
   zero models list
   ```

   and pick from the list (or `/model list` in chat).

See [MiniMax](/providers/minimax) and [Models](/concepts/models).

### Can I use MiniMax as my default and OpenAI for complex tasks

Yes. Use **MiniMax as the default** and switch models **per session** when needed.
Fallbacks are for **errors**, not “hard tasks,” so use `/model` or a separate agent.

**Option A: switch per session**

```json5
{
  env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.1" },
      models: {
        "minimax/MiniMax-M2.1": { alias: "minimax" },
        "openai/gpt-5.2": { alias: "gpt" }
      }
    }
  }
}
```

Then:

```
/model gpt
```

**Option B: separate agents**

- Agent A default: MiniMax
- Agent B default: OpenAI
- Route by agent or use `/agent` to switch

Docs: [Models](/concepts/models), [Multi-Agent Routing](/concepts/multi-agent), [MiniMax](/providers/minimax), [OpenAI](/providers/openai).

### Are opus sonnet gpt builtin shortcuts

Yes. ZERO ships a few default shorthands (only applied when the model exists in `agents.defaults.models`):

- `opus` → `anthropic/claude-opus-4-5`
- `sonnet` → `anthropic/claude-sonnet-4-5`
- `gpt` → `openai/gpt-5.2`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`

If you set your own alias with the same name, your value wins.

### How do I defineoverride model shortcuts aliases

Aliases come from `agents.defaults.models.<modelId>.alias`. Example:

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-5" },
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "anthropic/claude-haiku-4-5": { alias: "haiku" }
      }
    }
  }
}
```

Then `/model sonnet` (or `/<alias>` when supported) resolves to that model ID.

### How do I add models from other providers like OpenRouter or ZAI

OpenRouter (pay‑per‑token; many models):

```json5
{
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
      models: { "openrouter/anthropic/claude-sonnet-4-5": {} }
    }
  },
  env: { OPENROUTER_API_KEY: "sk-or-..." }
}
```

Z.AI (GLM models):

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} }
    }
  },
  env: { ZAI_API_KEY: "..." }
}
```

If you reference a provider/model but the required provider key is missing, you’ll get a runtime auth error (e.g. `No API key found for provider "zai"`).

**No API key found for provider after adding a new agent**

This usually means the **new agent** has an empty auth store. Auth is per-agent and
stored in:

```
~/.zero/agents/<agentId>/agent/auth-profiles.json
```

Fix options:

- Run `zero agents add <id>` and configure auth during the wizard.
- Or copy `auth-profiles.json` from the main agent’s `agentDir` into the new agent’s `agentDir`.

Do **not** reuse `agentDir` across agents; it causes auth/session collisions.

### Failover de modelos e "Todos os modelos falharam"

### O que é o failover de modelos?

O failover é um mecanismo de segurança onde o ZERO tenta automaticamente usar um modelo alternativo se o modelo principal falhar (devido a erros de rede, limites de taxa ou problemas no provedor).

### Como configuro um modelo de fallback?

No seu `config.yaml`, você pode definir uma lista de modelos em `models.fallback`. O bot tentará cada um na ordem especificada até obter uma resposta bem-sucedida.

### O que fazer quando vejo "Todos os modelos configurados falharam"?

Isso geralmente indica um problema sistêmico:

1. Verifique sua conexão com a internet.
2. Certifique-se de que pelo menos um dos seus provedores de modelos tem uma chave de API válida e saldo.
3. Confira os logs (`zero logs`) para ver as mensagens de erro específicas de cada tentativa de modelo.

### Como testo se o failover está funcionando?

Você pode simular uma falha (ex: usando uma chave de API inválida temporariamente para o seu modelo principal) e observar se o bot muda para o modelo de fallback configurado.

## Perfis de autenticação: o que são e como gerenciá-los

### Como funcionam os perfis de autenticação?

Perfis de autenticação permitem separar credenciais de configuração. Em vez de colocar sua chave de API diretamente na configuração do modelo, você cria um perfil (ex: `pessoal`, `trabalho`) que contém a chave. Isso facilita a troca de contas e melhora a segurança.

### Onde os perfis são armazenados?

Eles são armazenados de forma criptografada na sua pasta de dados do ZERO, geralmente em um arquivo chamado `auth.json`.

### Como gerencio perfis via CLI?

- `zero models auth list`: lista os perfis existentes.
- `zero models auth add`: adiciona um novo perfil.
- `zero models auth remove`: exclui um perfil.

### Posso usar múltiplos perfis para o mesmo provedor?

Sim! Você pode ter vários perfis para a Anthropic, por exemplo, e escolher qual usar para cada agente ou sessão.

## Gateway: portas, "já em execução" e modo remoto

### Em qual porta o Gateway roda por padrão?

A porta padrão é **18789**.

### Erro: "EADDRINUSE: address already in use"

Isso significa que outra instância do ZERO (ou outro aplicativo) já está usando a porta 18789.

1. Verifique se o ZERO já não está rodando em segundo plano: `zero gateway status`.
2. Tente parar a instância existente: `zero gateway stop`.
3. Se necessário, mude a porta no `config.yaml` sob `gateway.port`.

### Como acesso o Gateway remotamente?

1. Certifique-se de que o Gateway está vinculado à interface correta (`gateway.bind: "0.0.0.0"` ou seu IP de rede).
2. Use uma VPN como o **Tailscale** para acesso seguro.
3. Obtenha seu token de acesso (`zero gateway list-tokens`) para autenticar na UI remota.

### O que é o "Modo Remoto" na CLI?

No modo remoto, a CLI do ZERO não roda o mecanismo de IA localmente. Em vez disso, ela se conecta a um Gateway do ZERO que já está rodando (possivelmente em outra máquina) e atua apenas como uma interface.

### Como mudo a porta do Gateway?

Edite o arquivo `config.yaml`:

```yaml
gateway:
  port: 19000
```

Depois, reinicie o serviço: `zero gateway restart`.

### O que é o "bind" do Gateway?

O `bind` define em quais interfaces de rede o Gateway deve escutar.

- `127.0.0.1`: Escuta apenas mensagens da própria máquina (mais seguro).
- `0.0.0.0`: Escuta em todas as interfaces (necessário para acesso remoto básico).
- `lan`: Tenta detectar seu endereço IP na rede local.
- `tailnet`: Tenta vincular ao seu endereço IP do Tailscale.

If your model config includes Google Gemini as a fallback (or you switched to a Gemini shorthand), ZERO will try it during model fallback. If you haven’t configured Google credentials, you’ll see `No API key found for provider "google"`.

Fix: either provide Google auth, or remove/avoid Google models in `agents.defaults.model.fallbacks` / aliases so fallback doesn’t route there.

**LLM request rejected message thinking signature required Google Cloud Auth**

Cause: the session history contains **thinking blocks without signatures** (often from
an aborted/partial stream). Google Cloud Auth requires signatures for thinking blocks.

Fix: ZERO now strips unsigned thinking blocks for Google Cloud Auth Claude. If it still appears, start a **new session** or set `/thinking off` for that agent.

## Auth profiles: what they are and how to manage them

Related: [/concepts/oauth](/concepts/oauth) (OAuth flows, token storage, multi-account patterns, CLI sync)

### What is an auth profile

An auth profile is a named credential record (OAuth or API key) tied to a provider. Profiles live in:

```
~/.zero/agents/<agentId>/agent/auth-profiles.json
```

### What are typical profile IDs

ZERO uses provider‑prefixed IDs like:

- `anthropic:default` (common when no email identity exists)
- `anthropic:<email>` for OAuth identities
- custom IDs you choose (e.g. `anthropic:work`)

### Can I control which auth profile is tried first

Yes. Config supports optional metadata for profiles and an ordering per provider (`auth.order.<provider>`). This does **not** store secrets; it maps IDs to provider/mode and sets rotation order.

ZERO may temporarily skip a profile if it’s in a short **cooldown** (rate limits/timeouts/auth failures) or a longer **disabled** state (billing/insufficient credits). To inspect this, run `zero models status --json` and check `auth.unusableProfiles`. Tuning: `auth.cooldowns.billingBackoffHours*`.

You can also set a **per-agent** order override (stored in that agent’s `auth-profiles.json`) via the CLI:

```bash
# Defaults to the configured default agent (omit --agent)
zero models auth order get --provider anthropic

# Lock rotation to a single profile (only try this one)
zero models auth order set --provider anthropic anthropic:claude-cli

# Or set an explicit order (fallback within provider)
zero models auth order set --provider anthropic anthropic:claude-cli anthropic:default

# Clear override (fall back to config auth.order / round-robin)
zero models auth order clear --provider anthropic
```

To target a specific agent:

```bash
zero models auth order set --provider anthropic --agent main anthropic:claude-cli
```

### OAuth vs API key whats the difference

ZERO supports both:

- **OAuth** often leverages subscription access (where applicable).
- **API keys** use pay‑per‑token billing.

The wizard explicitly supports Anthropic OAuth and OpenAI Codex OAuth and can store API keys for you.

## Gateway: ports, “already running”, and remote mode

### What port does the Gateway use

`gateway.port` controls the single multiplexed port for WebSocket + HTTP (Control UI, hooks, etc.).

Precedence:

```
--port > ZERO_GATEWAY_PORT > gateway.port > default 18789
```

### Why does zero gateway status say Runtime running but RPC probe failed

Because “running” is the **supervisor’s** view (launchd/systemd/schtasks). The RPC probe is the CLI actually connecting to the gateway WebSocket and calling `status`.

Use `zero gateway status` and trust these lines:

- `Probe target:` (the URL the probe actually used)
- `Listening:` (what’s actually bound on the port)
- `Last gateway error:` (common root cause when the process is alive but the port isn’t listening)

### Why does zero gateway status show Config cli and Config service different

You’re editing one config file while the service is running another (often a `--profile` / `ZERO_STATE_DIR` mismatch).

Fix:

```bash
zero gateway install --force
```

Run that from the same `--profile` / environment you want the service to use.

### What does another gateway instance is already listening mean

ZERO enforces a runtime lock by binding the WebSocket listener immediately on startup (default `ws://127.0.0.1:18789`). If the bind fails with `EADDRINUSE`, it throws `GatewayLockError` indicating another instance is already listening.

Fix: stop the other instance, free the port, or run with `zero gateway --port <port>`.

### How do I run ZERO in remote mode client connects to a Gateway elsewhere

Set `gateway.mode: "remote"` and point to a remote WebSocket URL, optionally with a token/password:

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://gateway.tailnet:18789",
      token: "your-token",
      password: "your-password"
    }
  }
}
```

Notes:

- `zero gateway` only starts when `gateway.mode` is `local` (or you pass the override flag).
- The macOS app watches the config file and switches modes live when these values change.

### The Control UI says unauthorized or keeps reconnecting What now

Your gateway is running with auth enabled (`gateway.auth.*`), but the UI is not sending the matching token/password.

Facts (from code):

- The Control UI stores the token in browser localStorage key `zero.control.settings.v1`.
- The UI can import `?token=...` (and/or `?password=...`) once, then strips it from the URL.

Fix:

- Fastest: `zero dashboard` (prints + copies tokenized link, tries to open; shows SSH hint if headless).
- If you don’t have a token yet: `zero doctor --generate-gateway-token`.
- If remote, tunnel first: `ssh -N -L 18789:127.0.0.1:18789 user@host` then open `http://127.0.0.1:18789/?token=...`.
- Set `gateway.auth.token` (or `ZERO_GATEWAY_TOKEN`) on the gateway host.
- In the Control UI settings, paste the same token (or refresh with a one-time `?token=...` link).
- Still stuck? Run `zero status --all` and follow [Troubleshooting](/gateway/troubleshooting). See [Dashboard](/web/dashboard) for auth details.

### I set gatewaybind tailnet but it cant bind nothing listens

`tailnet` bind picks a Tailscale IP from your network interfaces (100.64.0.0/10). If the machine isn’t on Tailscale (or the interface is down), there’s nothing to bind to.

Fix:

- Start Tailscale on that host (so it has a 100.x address), or
- Switch to `gateway.bind: "loopback"` / `"lan"`.
  
Note: `tailnet` is explicit. `auto` prefers loopback; use `gateway.bind: "tailnet"` when you want a tailnet-only bind.

### Can I run multiple Gateways on the same host

Usually no - one Gateway can run multiple messaging channels and agents. Use multiple Gateways only when you need redundancy (ex: rescue bot) or hard isolation.

Yes, but you must isolate:

- `ZERO_CONFIG_PATH` (per‑instance config)
- `ZERO_STATE_DIR` (per‑instance state)
- `agents.defaults.workspace` (workspace isolation)
- `gateway.port` (unique ports)

Quick setup (recommended):

- Use `zero --profile <name> …` per instance (auto-creates `~/.zero-<name>`).
- Set a unique `gateway.port` in each profile config (or pass `--port` for manual runs).
- Install a per-profile service: `zero --profile <name> gateway install`.

Profiles also suffix service names (`com.zero.<profile>`, `zero-gateway-<profile>.service`, `ZERO Gateway (<profile>)`).
Full guide: [Multiple gateways](/gateway/multiple-gateways).

### What does invalid handshake code 1008 mean

The Gateway is a **WebSocket server**, and it expects the very first message to
be a `connect` frame. If it receives anything else, it closes the connection
with **code 1008** (policy violation).

Common causes:

- You opened the **HTTP** URL in a browser (`http://...`) instead of a WS client.
- You used the wrong port or path.
- A proxy or tunnel stripped auth headers or sent a non‑Gateway request.

Quick fixes:

1) Use the WS URL: `ws://<host>:18789` (or `wss://...` if HTTPS).
2) Don’t open the WS port in a normal browser tab.
3) If auth is on, include the token/password in the `connect` frame.

If you’re using the CLI or TUI, the URL should look like:

```
zero tui --url ws://<host>:18789 --token <token>
```

Protocol details: [Gateway protocol](/gateway/protocol).

## Logging and debugging

### Where are logs

File logs (structured):

```
/tmp/zero/zero-YYYY-MM-DD.log
```

You can set a stable path via `logging.file`. File log level is controlled by `logging.level`. Console verbosity is controlled by `--verbose` and `logging.consoleLevel`.

Fastest log tail:

```bash
zero logs --follow
```

Service/supervisor logs (when the gateway runs via launchd/systemd):

- macOS: `$ZERO_STATE_DIR/logs/gateway.log` and `gateway.err.log` (default: `~/.zero/logs/...`; profiles use `~/.zero-<profile>/logs/...`)
- Linux: `journalctl --user -u zero-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "ZERO Gateway (<profile>)" /V /FO LIST`

See [Troubleshooting](/gateway/troubleshooting#log-locations) for more.

### How do I startstoprestart the Gateway service

Use the gateway helpers:

```bash
zero gateway status
zero gateway restart
```

If you run the gateway manually, `zero gateway --force` can reclaim the port. See [Gateway](/gateway).

### I closed my terminal on Windows how do I restart ZERO

There are **two Windows install modes**:

**1) WSL2 (recommended):** the Gateway runs inside Linux.

Open PowerShell, enter WSL, then restart:

```powershell
wsl
zero gateway status
zero gateway restart
```

If you never installed the service, start it in the foreground:

```bash
zero gateway run
```

**2) Native Windows (not recommended):** the Gateway runs directly in Windows.

Open PowerShell and run:

```powershell
zero gateway status
zero gateway restart
```

If you run it manually (no service), use:

```powershell
zero gateway run
```

Docs: [Windows (WSL2)](/platforms/windows), [Gateway service runbook](/gateway).

### The Gateway is up but replies never arrive What should I check

Start with a quick health sweep:

```bash
zero status
zero models status
zero channels status
zero logs --follow
```

Common causes:

- Model auth not loaded on the **gateway host** (check `models status`).
- Channel pairing/allowlist blocking replies (check channel config + logs).
- WebChat/Dashboard is open without the right token.

If you are remote, confirm the tunnel/Tailscale connection is up and that the
Gateway WebSocket is reachable.

Docs: [Channels](/channels), [Troubleshooting](/gateway/troubleshooting), [Remote access](/gateway/remote).

### Disconnected from gateway no reason what now

This usually means the UI lost the WebSocket connection. Check:

1) Is the Gateway running? `zero gateway status`
2) Is the Gateway healthy? `zero status`
3) Does the UI have the right token? `zero dashboard`
4) If remote, is the tunnel/Tailscale link up?

Then tail logs:

```bash
zero logs --follow
```

Docs: [Dashboard](/web/dashboard), [Remote access](/gateway/remote), [Troubleshooting](/gateway/troubleshooting).

### Telegram setMyCommands fails with network errors What should I check

Start with logs and channel status:

```bash
zero channels status
zero channels logs --channel telegram
```

If you are on a VPS or behind a proxy, confirm outbound HTTPS is allowed and DNS works.
If the Gateway is remote, make sure you are looking at logs on the Gateway host.

Docs: [Telegram](/channels/telegram), [Channel troubleshooting](/channels/troubleshooting).

### TUI shows no output What should I check

First confirm the Gateway is reachable and the agent can run:

```bash
zero status
zero models status
zero logs --follow
```

In the TUI, use `/status` to see the current state. If you expect replies in a chat
channel, make sure delivery is enabled (`/deliver on`).

Docs: [TUI](/tui), [Slash commands](/tools/slash-commands).

### How do I completely stop then start the Gateway

If you installed the service:

```bash
zero gateway stop
zero gateway start
```

This stops/starts the **supervised service** (launchd on macOS, systemd on Linux).
Use this when the Gateway runs in the background as a daemon.

If you’re running in the foreground, stop with Ctrl‑C, then:

## Registro (Logging) e depuração

### Onde estão os arquivos de log?

Os logs do ZERO são armazenados na pasta `logs` dentro do seu diretório de dados.

- **macOS**: `~/Library/Application Support/zero/logs`
- **Linux**: `~/.config/zero/logs`

### Como vejo os logs em tempo real?

Use o comando:

```bash
zero logs --follow
```

### Como aumento o nível de detalhamento dos logs?

Você pode definir a variável de ambiente `LOG_LEVEL=debug` antes de iniciar o Gateway ou alterar a configuração no `config.yaml` sob `gateway.logging.level`.

### O que fazer se o bot não responder a uma mensagem específica?

1. Verifique os logs em tempo real enquanto envia a mensagem.
2. Procure por erros de "context window exceeded" ou falhas de autenticação do modelo.
3. Use o comando `zero status --deep` para verificar se o Gateway e os Canais estão saudáveis.

## Mídia e anexos

### O ZERO pode ver imagens?

Sim, se você estiver usando um modelo com capacidades de visão (como Claude 3.5 Sonnet ou GPT-4o) e o canal suportar o envio de imagens (como Telegram ou WhatsApp).

### Posso enviar documentos PDF para o bot?

Sim. O ZERO pode ler o conteúdo de PDFs e outros arquivos de texto anexados se a habilidade de leitura de arquivos estiver habilitada.

### O bot pode gerar imagens?

Sim, através de habilidades de geração de imagem (como DALL-E) integradas. Você pode pedir "Gere uma imagem de um gato" e ele usará a ferramenta configurada.

### O ZERO suporta mensagens de voz?

Sim, ele pode transcrever e processar mensagens de voz se você tiver configurado um provedor de transcrição (como OpenAI Whisper).

## Segurança e controle de acesso

### Como protejo meu bot de ser usado por estranhos?

- **Telegram**: Use o campo `allowFrom` no `config.yaml` para listar apenas os seus IDs de usuário autorizados.
- **WhatsApp**: Similarmente, limite o acesso aos números de telefone conhecidos.
- **Gateway**: Use o token de acesso mestre e mantenha seu `config.yaml` protegido.

### Meus dados de conversa são usados para treinar modelos?

Isso depende do provedor que você escolher (Anthropic, OpenAI, etc.) e dos seus termos de serviço com eles. O ZERO em si não usa seus dados para treinamento. Se você usar um modelo local (Ollama), seus dados nunca saem da sua máquina.

### Como as chaves de API são armazenadas?

As chaves são armazenadas no seu sistema de arquivos local (em `config.yaml` ou `auth.json`). Recomendamos manter essas pastas com permissões restritas em máquinas compartilhadas.

### O ZERO pode deletar arquivos no meu computador?

Sim, se você der permissão de escrita para a habilidade de gerenciamento de arquivos no diretório em questão. Recomendamos usar o **Sandboxing** para limitar o alcance do bot se você estiver preocupado com a segurança.

### O que é o modo "audit" nas ferramentas de segurança?

No modo audit, o ZERO registra as ações que seriam tomadas (como uma tentativa de injeção de prompt detectada), mas não as bloqueia necessariamente, permitindo que você revise o comportamento do sistema sem interromper o serviço.

## Comandos de chat, abortando tarefas e "isso não para"

### Quais são os comandos de chat básicos?

- `/help`: Mostra os comandos disponíveis.
- `/new`: Inicia uma nova sessão.
- `/skills`: Lista as habilidades do agente.
- `/token`: Obtém o token de acesso para o dashboard (se autorizado).
- `/status`: Mostra o estado atual do bot.

### Como faço o bot parar uma tarefa longa?

A maioria dos canais suporta um comando de cancelamento ou você pode simplesmente enviar uma nova mensagem pedindo para ele "parar" ou "cancelar". No dashboard, você também pode terminar a sessão ou a tarefa ativa.

### O bot entrou em um loop infinito. O que eu faço?

1. Se estiver na CLI, pressione `Ctrl+C`.
2. Se for via chat, envie `/reset`.
3. Se necessário, reinicie o Gateway: `zero gateway restart`.

### Como limpo o histórico do chat?

Use `/reset` para limpar a sessão atual do contexto do modelo. Para apagar os logs físicos do disco, você precisará gerenciá-los via CLI ou apagar a pasta de sessões.

### Posso desabilitar comandos de barra (`/`)?

Sim, você pode configurar quais comandos estão ativos ou desabilitar o processamento de comandos de barra no `config.yaml` sob a configuração do agente ou do canal.

### Meu bot deve ter sua própria conta de e-mail, GitHub ou número de telefone?

Sim, para a maioria das integrações profissionais, recomendamos criar contas dedicadas para o bot. Isso evita que suas atividades pessoais e as do bot se misturem e facilita o monitoramento de limites e segurança.

- **E-mail**: Crie um e-mail apenas para o bot (ex: `bot@empresa.com`).
- **GitHub**: Use uma conta de "machine user".
- **Telefone**: Considere um número secundário para WhatsApp/Telegram se não quiser usar o seu principal.

## Identidade, marca e legal

### O que o ZERO é para o "Zero"?

O ZERO é um framework independente. Ele pode usar modelos Claude da Anthropic, mas não é um produto oficial da Anthropic. O nome é uma homenagem brincalhona à versatilidade dos modelos que ele suporta.

### Posso usar o nome ou logo do ZERO em meu próprio projeto?

O ZERO é código aberto (MIT). Você pode usar o código de acordo com a licença. Para uso da marca e logos, consulte as diretrizes de marca no repositório.

### O ZERO é gratuito para uso comercial?

Sim, sob a licença MIT, você pode usá-lo comercialmente. Lembre-se que você ainda é responsável pelos custos das APIs dos modelos que utilizar.

### Existe uma versão paga ou corporativa?

Atualmente, o ZERO é focado na comunidade e no uso pessoal/independente. Para necessidades corporativas específicas, entre em contato com os mantenedores.

### Quais são os termos de serviço?

Como um software de auto-hospedagem, você é o responsável pela operação do seu bot. Consulte o arquivo `LICENSE` para os termos legais do software.

### Como entro em contato com a equipe?

A melhor forma é através do nosso GitHub Issues ou do canal oficial no Discord.

## Contribuição e desenvolvimento

### Como posso contribuir com o projeto?

Adoramos contribuições! Confira o nosso guia `CONTRIBUTING.md` para:

- Reportar bugs.
- Sugerir novos recursos.
- Enviar Pull Requests (PRs).
- Melhorar a documentação.

### O ZERO é escrito em qual linguagem?

O núcleo é escrito em **TypeScript/Node.js**, com a UI de Controle em **React**.

### Como rodo o ambiente de desenvolvimento?

1. Clone o repositório.
2. Instale dependências: `pnpm install`.
3. Compile o projeto: `pnpm build`.
4. Inicie o gateway em modo dev: `pnpm zero gateway --dev`.

### Onde encontro a documentação da API?

Confira a seção [Arquitetura](/concepts/architecture) e [Protocolo do Gateway](/gateway/protocol) em nossa documentação técnica.

### Vocês aceitam novos provedores de modelos ou canais?

Sim! Se você criou uma integração para um novo provedor ou serviço de chat, sinta-se à vontade para enviar um PR.

---

*Esta FAQ é atualizada regularmente. Se você não encontrou a resposta para sua pergunta, sinta-se à vontade para perguntar em nossa comunidade.*

Check pending requests:

```bash
zero pairing list telegram
```

If you want immediate access, allowlist your sender id or set `dmPolicy: "open"`
for that account.

### WhatsApp will it message my contacts How does pairing work

No. Default WhatsApp DM policy is **pairing**. Unknown senders only get a pairing code and their message is **not processed**. ZERO only replies to chats it receives or to explicit sends you trigger.

Approve pairing with:

```bash
zero pairing approve whatsapp <code>
```

List pending requests:

```bash
zero pairing list whatsapp
```

Wizard phone number prompt: it’s used to set your **allowlist/owner** so your own DMs are permitted. It’s not used for auto-sending. If you run on your personal WhatsApp number, use that number and enable `channels.whatsapp.selfChatMode`.

## Chat commands, aborting tasks, and “it won’t stop”

### How do I stop internal system messages from showing in chat

Most internal or tool messages only appear when **verbose** or **reasoning** is enabled
for that session.

Fix in the chat where you see it:

```
/verbose off
/reasoning off
```

If it is still noisy, check the session settings in the Control UI and set verbose
to **inherit**. Also confirm you are not using a bot profile with `verboseDefault` set
to `on` in config.

Docs: [Thinking and verbose](/tools/thinking), [Security](/gateway/security#reasoning--verbose-output-in-groups).

### How do I stopcancel a running task

Send any of these **as a standalone message** (no slash):

```
stop
abort
esc
wait
exit
interrupt
```

These are abort triggers (not slash commands).

For background processes (from the exec tool), you can ask the agent to run:

```
process action:kill sessionId:XXX
```

Slash commands overview: see [Slash commands](/tools/slash-commands).

Most commands must be sent as a **standalone** message that starts with `/`, but a few shortcuts (like `/status`) also work inline for allowlisted senders.

### How do I send a Discord message from Telegram Crosscontext messaging denied

ZERO blocks **cross‑provider** messaging by default. If a tool call is bound
to Telegram, it won’t send to Discord unless you explicitly allow it.

Enable cross‑provider messaging for the agent:

```json5
{
  agents: {
    defaults: {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " }
          }
        }
      }
    }
  }
}
```

Restart the gateway after editing config. If you only want this for a single
agent, set it under `agents.list[].tools.message` instead.

### Why does it feel like the bot ignores rapidfire messages

Queue mode controls how new messages interact with an in‑flight run. Use `/queue` to change modes:

- `steer` - new messages redirect the current task
- `followup` - run messages one at a time
- `collect` - batch messages and reply once (default)
- `steer-backlog` - steer now, then process backlog
- `interrupt` - abort current run and start fresh

You can add options like `debounce:2s cap:25 drop:summarize` for followup modes.

## Answer the exact question from the screenshot/chat log

**Q: “What’s the default model for Anthropic with an API key?”**

**A:** In ZERO, credentials and model selection are separate. Setting `ANTHROPIC_API_KEY` (or storing an Anthropic API key in auth profiles) enables authentication, but the actual default model is whatever you configure in `agents.defaults.model.primary` (for example, `anthropic/claude-sonnet-4-5` or `anthropic/claude-opus-4-5`). If you see `No credentials found for profile "anthropic:default"`, it means the Gateway couldn’t find Anthropic credentials in the expected `auth-profiles.json` for the agent that’s running.

---

Still stuck? Ask in [Discord](https://discord.com/invite/zero) or open a [GitHub discussion](https://github.com/zero/zero/discussions).
