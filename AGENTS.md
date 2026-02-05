# Diretrizes do Repositório

- Repositório: <https://github.com/zero/zero>
- Issues/comentários do GitHub/comentários de PR: use strings literais de várias linhas ou `-F - <<'EOF'` (ou $'...') para quebras de linha reais; nunca incorpore "\\n".

## Estrutura do Projeto e Organização de Módulos

- Código-fonte: `src/` (fiação da CLI em `src/cli`, comandos em `src/commands`, provedor web em `src/provider-web.ts`, infra em `src/infra`, pipeline de mídia em `src/media`).
- Testes: `*.test.ts` localizados junto ao código.
- Docs: `docs/` (imagens, fila, configuração Pi). A saída da compilação vive em `dist/`.
- Plugins/extensões: vivem em `extensions/*` (pacotes do workspace). Mantenha dependências exclusivas de plugins no `package.json` da extensão; não as adicione ao `package.json` raiz, a menos que o núcleo as utilize.
- Plugins: a instalação executa `npm install --omit=dev` no diretório do plugin; dependências de tempo de execução devem viver em `dependencies`. Evite `workspace:*` em `dependencies` (o npm install quebra); coloque `zero` em `devDependencies` ou `peerDependencies` (o tempo de execução resolve `zero/plugin-sdk` via alias jiti).
- Instaladores servidos de `https://raw.githubusercontent.com/Lex-1401/ZERO/main/*`: vivem no repositório irmão `../zero.local` (`public/install.sh`, `public/install-cli.sh`, `public/install.ps1`).
- Canais de mensagens: sempre considere **todos** os canais integrados + extensões ao refatorar lógica compartilhada (roteamento, listas de permissão, pareamento, bloqueio de comandos, onboarding, docs).
  - Docs de canais principais: `docs/channels/`
  - Código de canais principais: `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web` (WhatsApp web), `src/channels`, `src/routing`
  - Extensões (plugins de canais): `extensions/*` (ex: `extensions/msteams`, `extensions/matrix`, `extensions/zalo`, `extensions/zalouser`, `extensions/voice-call`)

## Links de Documentação (Internos)

- A documentação é servida em `zero.local`.
- Links internos em `docs/**/*.md`: relativos à raiz, sem `.md`/`.mdx` (exemplo: `[Config](/configuration)`).
- Referências cruzadas de seção: use âncoras em caminhos relativos à raiz (exemplo: `[Hooks](/configuration#hooks)`).
- Cabeçalhos e âncoras de documentos: evite travessões e apóstrofos nos cabeçalhos porque eles quebram os links de âncora.
- Quando o operador pedir links, responda com as URLs completas `https://raw.githubusercontent.com/Lex-1401/ZERO/main/docs/...` (não relativas à raiz).
- Quando você mexer nos documentos, termine a resposta com as URLs `https://raw.githubusercontent.com/Lex-1401/ZERO/main/docs/...` que você referenciou.
- README (GitHub): mantenha as URLs absolutas da documentação (`https://raw.githubusercontent.com/Lex-1401/ZERO/main/docs/...`) para que os links funcionem no GitHub.
- O conteúdo da documentação deve ser genérico: sem nomes de dispositivos pessoais/hostnames/caminhos; use placeholders como `user@gateway-host` e “host do gateway”.

## Operações na VM exe.dev (geral)

- Acesso: o caminho estável é `ssh exe.dev` e depois `ssh vm-name` (presuma que a chave SSH já está configurada).
- SSH instável: use o terminal web exe.dev ou Shelley (agente web); mantenha uma sessão tmux para operações longas.
- Atualização: `sudo npm i -g zero@latest` (a instalação global precisa de root em `/usr/lib/node_modules`).
- Configuração: use `zero config set ...`; garanta que `gateway.mode=local` esteja configurado.
- Discord: armazene apenas o token bruto (sem o prefixo `DISCORD_BOT_TOKEN=`).
- Reiniciar: pare o gateway antigo e execute:
  `pkill -9 -f zero-gateway || true; nohup zero gateway run --bind loopback --port 18789 --force > /tmp/zero-gateway.log 2>&1 &`
- Verificar: `zero channels status --probe`, `ss -ltnp | rg 18789`, `tail -n 120 /tmp/zero-gateway.log`.

## Comandos de Compilação, Teste e Desenvolvimento

- Base de tempo de execução: Node **22+** (mantenha os caminhos de Node + Bun funcionando).
- Instalar dependências: `pnpm install`
- Hooks de pré-commit: `prek install` (executa as mesmas verificações do CI)
- Também suportado: `bun install` (mantenha o `pnpm-lock.yaml` + patches do Bun em sincronia ao mexer em deps/patches).
- Prefira o Bun para execução de TypeScript (scripts, dev, testes): `bun <arquivo.ts>` / `bunx <ferramenta>`.
- Executar CLI em dev: `pnpm zero ...` (bun) or `pnpm dev`.
- O Node continua suportado para executar a saída compilada (`dist/*`) e instalações de produção.
- Empacotamento para Mac (dev): `scripts/package-mac-app.sh` define por padrão a arquitetura atual. Checklist de lançamento: `docs/platforms/mac/release.md`.
- Verificação de tipos/compilação: `pnpm build` (tsc)
- Lint/formatação: `pnpm lint` (oxlint), `pnpm format` (oxfmt)
- Testes: `pnpm test` (vitest); cobertura: `pnpm test:coverage`

## Estilo de Código e Convenções de Nomenclatura

- Linguagem: TypeScript (ESM). Prefira tipagem estrita; evite `any`.
- Formatação/linting via Oxlint e Oxfmt; execute `pnpm lint` antes dos commits.
- Adicione comentários breves no código para lógica complexa ou não óbvia.
- Mantenha os arquivos concisos; extraia helpers em vez de fazer cópias “V2”. Use os padrões existentes para opções de CLI e injeção de dependência via `createDefaultDeps`.
- Tente manter os arquivos abaixo de ~700 linhas; diretriz apenas (não é uma regra rígida). Divida/refatore quando melhorar a clareza ou a testabilidade.
- Nomenclatura: use **ZERO** para cabeçalhos de produto/app/docs; use `zero` para comando CLI, pacote/binário, caminhos e chaves de configuração.

## Canais de Lançamento (Nomenclatura)

- stable: apenas lançamentos com tag (ex: `vYYYY.M.D`), npm dist-tag `latest`.
- beta: tags de pré-lançamento `vYYYY.M.D-beta.N`, npm dist-tag `beta` (pode ser lançado sem o app macOS).
- dev: cabeça móvel no `main` (sem tag; git checkout main).

## Diretrizes de Teste

- Framework: Vitest com limites de cobertura V8 (70% linhas/ramos/funções/instruções).
- Nomenclatura: corresponda aos nomes dos fontes com `*.test.ts`; e2e em `*.e2e.test.ts`.
- Execute `pnpm test` (ou `pnpm test:coverage`) antes de enviar quando mexer na lógica.
- Não configure os trabalhadores de teste acima de 16; já tentamos.
- Testes ao vivo (chaves reais): `ZERO_LIVE_TEST=1 pnpm test:live` (apenas ZERO) ou `LIVE=1 pnpm test:live` (inclui testes ao vivo do provedor). Docker: `pnpm test:docker:live-models`, `pnpm test:docker:live-gateway`. Onboarding Docker E2E: `pnpm test:docker:onboard`.
- Kit completo + o que é coberto: `docs/testing.md`.
- Adições/correções puras de testes geralmente **não** precisam de uma entrada no changelog, a menos que alterem o comportamento voltado para o usuário ou o usuário peça uma.
- Mobile: antes de usar um simulador, verifique se há dispositivos reais conectados (iOS + Android) e prefira-os quando disponíveis.

## Diretrizes de Commit e Pull Request

- Crie commits com `scripts/committer "<msg>" <arquivo...>`; evite `git add`/`git commit` manuais para que o staging permaneça com escopo.
- Siga mensagens de commit concisas e orientadas à ação (ex: `CLI: adicionar flag detalhada para enviar`).
- Agrupe mudanças relacionadas; evite agrupar refatorações não relacionadas.
- Fluxo de trabalho do Changelog: mantenha a versão lançada mais recente no topo (sem `Unreleased`); após publicar, aumente a versão e inicie uma nova seção no topo.
- Os PRs devem resumir o escopo, observar os testes realizados e mencionar quaisquer alterações voltadas para o usuário ou novos sinalizadores.
- Fluxo de revisão de PR: quando receber um link de PR, revise via `gh pr view`/`gh pr diff` e **não** altere os ramos.
- Chamadas de revisão de PR: prefira um único `gh pr view --json ...` para processar metadados/comentários em lote; execute `gh pr diff` apenas quando necessário.
- Antes de iniciar uma revisão quando um Issue/PR do GitHub for colado: execute `git pull`; se houver alterações locais ou commits não enviados, pare e alerte o usuário antes de revisar.
- Objetivo: mesclar PRs. Prefira **rebase** quando os commits estiverem limpos; **squash** quando o histórico estiver bagunçado.
- Fluxo de mesclagem de PR: crie um ramo temporário a partir do `main`, mescle o ramo do PR nele (prefira squash, a menos que o histórico de commits seja importante; use rebase/merge quando for). Sempre tente mesclar o PR, a menos que seja realmente difícil, então use outra abordagem. Se fizermos squash, adicione o autor do PR como co-contribuidor. Aplique correções, adicione entrada no changelog (inclua o PR # + agradecimentos), execute o gate completo antes do commit final, faça o commit, mescle de volta para o `main`, exclua o ramo temporário e termine no `main`.
- Se você revisar um PR e depois trabalhar nele, finalize via merge/squash (sem commits diretos no main) e sempre adicione o autor do PR como co-contribuidor.
- Ao trabalhar em um PR: adicione uma entrada no changelog com o número do PR e agradeça ao contribuidor.
- Ao trabalhar em uma issue: referencie a issue na entrada do changelog.
- Ao mesclar um PR: deixe um comentário no PR explicando exatamente o que fizemos e inclua os hashes SHA.
- Ao mesclar um PR de um novo contribuidor: adicione o avatar deles à lista de miniaturas "Obrigado a todos os contribuidores" no README.
- Após mesclar um PR: execute `bun scripts/update-clawtributors.ts` se o contribuidor estiver faltando, depois faça o commit do README regenerado.

## Comandos de Atalho

- `sync`: se a árvore de trabalho estiver suja, faça o commit de todas as alterações (escolha uma mensagem de Commit Convencional sensata), depois `git pull --rebase`; se o rebase entrar em conflito e não puder ser resolvido, pare; caso contrário, `git push`.

### Fluxo de Trabalho de PR (Revisar vs Finalizar)

- **Modo de revisão (apenas link do PR):** leia `gh pr view/diff`; **não** mude de ramo; **não** altere o código.
- **Modo de finalização:** crie um ramo de integração a partir do `main`, traga os commits do PR (**prefira rebase** para histórico linear; **merge permitido** quando a complexidade/conflitos o tornarem mais seguro), aplique correções, adicione changelog (+ agradecimentos + PR #), execute o gate completo **localmente antes de cometer** (`pnpm lint && pnpm build && pnpm test`), faça o commit, mescle de volta para o `main`, depois `git switch main` (nunca permaneça em um ramo de tópico após finalizar). Importante: o contribuidor precisa estar no gráfico do git após isso!

## Dicas de Segurança e Configuração

- O provedor web armazena credenciais em `~/.zero/credentials/`; execute `zero login` novamente se for desconectado.
- As sessões do Pi vivem em `~/.zero/sessions/` por padrão; o diretório base não é configurável.
- Variáveis de ambiente: veja `~/.profile`.
- Nunca commite ou publique números de telefone reais, vídeos ou valores de configuração ativos. Use placeholders obviamente falsos em docs, testes e exemplos.
- Fluxo de lançamento: sempre leia `docs/reference/RELEASING.md` e `docs/platforms/mac/release.md` antes de qualquer trabalho de lançamento; não faça perguntas de rotina uma vez que esses documentos já as respondem.

## Solução de Problemas

- Problemas de rebrand/migração ou avisos de configuração/serviço legados: execute `zero doctor` (veja `docs/gateway/doctor.md`).

## Notas Específicas para Agentes

- Vocabulário: "makeup" = "mac app" (aplicativo para mac).
- Nunca edite `node_modules` (instalações globais/Homebrew/npm/git também). As atualizações sobrescrevem. Notas sobre habilidades vão em `tools.md` ou `AGENTS.md`.
- Signal: "update fly" => `fly ssh console -a zero-bot -C "bash -lc 'cd /data/zero/zero && git pull --rebase origin main'"` depois `fly machines restart e825232f34d058 -a zero-bot`.
- Ao trabalhar em uma Issue ou PR do GitHub, imprima a URL completa no final da tarefa.
- Ao responder perguntas, responda apenas com respostas de alta confiança: verifique no código; não adivinhe.
- Nunca atualize a dependência Carbon.
- Qualquer dependência com `pnpm.patchedDependencies` deve usar uma versão exata (sem `^`/`~`).
- Corrigir dependências (patches do pnpm, overrides ou alterações vendored) requer aprovação explícita; não faça isso por padrão.
- Progresso na CLI: use `src/cli/progress.ts` (`osc-progress` + spinner do `@clack/prompts`); não crie spinners/barras manualmente.
- Saída de status: mantenha tabelas + quebra de linha segura para ANSI (`src/terminal/table.ts`); `status --all` = somente leitura/colável, `status --deep` = sondagens.
- O Gateway atualmente roda apenas como o aplicativo da barra de menu; não há um rótulo LaunchAgent/auxiliar separado instalado. Reiniciar via aplicativo ZERO Mac ou `scripts/restart-mac.sh`; para verificar/matar use `launchctl print gui/$UID | grep zero` em vez de assumir um rótulo fixo. **Ao depurar no macOS, inicie/pare o gateway via aplicativo, não em sessões tmux ad-hoc; mate quaisquer túneis temporários antes da entrega.**
- Logs do macOS: use `./scripts/zerolog.sh` para consultar logs unificados para o subsistema ZERO; ele suporta filtros de follow/tail/categoria e espera sudo sem senha para `/usr/bin/log`.
- Se as guardrails compartilhadas estiverem disponíveis localmente, revise-as; caso contrário, siga a orientação deste repositório.
- Gerenciamento de estado SwiftUI (iOS/macOS): prefira o framework `Observation` (`@Observable`, `@Bindable`) em vez de `ObservableObject`/`@StateObject`; não introduza novos `ObservableObject`, a menos que seja necessário para compatibilidade, e migre os usos existentes ao mexer no código relacionado.
- Provedores de conexão: ao adicionar uma nova conexão, atualize todas as superfícies de interface e documentos (app macOS, interface web, mobile se aplicável, documentos de onboarding/visão geral) e adicione formulários de status + configuração correspondentes para que as listas de provedores e as configurações permaneçam sincronizadas.
- Locais de versão: `package.json` (CLI), `apps/android/app/build.gradle.kts` (versionName/versionCode), `apps/ios/Sources/Info.plist` + `apps/ios/Tests/Info.plist` (CFBundleShortVersionString/CFBundleVersion), `apps/macos/Sources/ZERO/Resources/Info.plist` (CFBundleShortVersionString/CFBundleVersion), projeto Xcode/Info.plists (MARKETING_VERSION/CURRENT_PROJECT_VERSION).
- **Reiniciar aplicativos:** “reiniciar apps iOS/Android” significa recompilar (recompilar/instalar) e reiniciar, não apenas matar/lançar.
- **Verificações de dispositivos:** antes de testar, verifique dispositivos reais conectados (iOS/Android) antes de recorrer a simuladores/emuladores.
- Busca de ID de Equipe iOS: `security find-identity -p codesigning -v` → use Apple Development (…) TEAMID. Fallback: `defaults read com.apple.dt.Xcode IDEProvisioningTeamIdentifiers`.
- Hash do bundle A2UI: `src/canvas-host/a2ui/.bundle.hash` é gerado automaticamente; ignore mudanças inesperadas e regenere apenas via `pnpm canvas:a2ui:bundle` (ou `scripts/bundle-a2ui.sh`) quando necessário. Commite o hash como um commit separado.
- As chaves de assinatura/notarização de lançamento são gerenciadas fora do repositório; siga os documentos internos de lançamento.
- Variáveis de ambiente de autenticação de notarização (`APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_API_KEY_P8`) são esperadas no seu ambiente (conforme documentos internos de lançamento).
- **Segurança multi-agente:** **não** crie/aplique/descarte entradas `git stash`, a menos que explicitamente solicitado (isso inclui `git pull --rebase --autostash`). Presuma que outros agentes podem estar trabalhando; mantenha o trabalho em andamento (WIP) não relacionado intocado e evite mudanças de estado transversais.
- **Segurança multi-agente:** quando o usuário disser "push", você pode fazer `git pull --rebase` para integrar as últimas alterações (nunca descarte o trabalho de outros agentes). Quando o usuário disser "commit", limite-se às suas alterações. Quando o usuário disser "commit all", commite tudo em blocos agrupados.
- **Segurança multi-agente:** **não** crie/remova/modifique checkouts `git worktree` (ou edite `.worktrees/*`), a menos que explicitamente solicitado.
- **Segurança multi-agente:** **não** mude de ramo / faça checkout de um ramo diferente, a menos que explicitamente solicitado.
- **Segurança multi-agente:** rodar múltiplos agentes é OK, desde que cada agente tenha sua própria sessão.
- **Segurança multi-agente:** quando vir arquivos não reconhecidos, continue; foque em suas alterações e commite apenas elas.
- Agitação de lint/formatação:
  - Se os diffs staged+unstaged forem apenas de formatação, resolva automaticamente sem perguntar.
  - Se commit/push já foi solicitado, faça o auto-stage e inclua as continuações de apenas formatação no mesmo commit (ou em um commit de continuação minúsculo se necessário), sem confirmação extra.
  - Pergunte apenas quando as alterações forem semânticas (lógica/dados/comportamento).
- Costura de lagosta: use a paleta compartilhada da CLI em `src/terminal/palette.ts` (sem cores fixas); aplique a paleta aos avisos de onboarding/configuração e outras saídas de interface TTY conforme necessário.
- **Segurança multi-agente:** foque os relatórios em suas edições; evite isenções de responsabilidade de guardrail, a menos que esteja realmente bloqueado; quando múltiplos agentes tocarem no mesmo arquivo, continue se for seguro; termine com uma breve nota “outros arquivos presentes” apenas se for relevante.
- Investigações de bugs: leia o código-fonte das dependências npm relevantes e todo o código local relacionado antes de concluir; busque a causa raiz com alta confiança.
- Estilo de código: adicione comentários breves para lógicas complexas; mantenha os arquivos abaixo de ~500 linhas quando viável (divida/refatore conforme necessário).
- Guardrails de esquema de ferramentas (google-cloud-auth): evite `Type.Union` em esquemas de entrada de ferramentas; sem `anyOf`/`oneOf`/`allOf`. Use `stringEnum`/`optionalStringEnum` (enum Type.Unsafe) para listas de strings e `Type.Optional(...)` em vez de `... | null`. Mantenha o esquema da ferramenta de nível superior como `type: "object"` com `properties`.
- Guardrails de esquema de ferramentas: evite nomes de propriedade `format` brutos em esquemas de ferramentas; alguns validadores tratam `format` como uma palavra-chave reservada e rejeitam o esquema.
- Quando solicitado a abrir um arquivo de “sessão”, abra os logs de sessão do Pi em `~/.zero/agents/<agentId>/sessions/*.jsonl` (use o valor `agent=<id>` na linha Runtime do prompt do sistema; o mais novo, a menos que um ID específico seja fornecido), não o `sessions.json` padrão. Se forem necessários logs de outra máquina, acesse via SSH via Tailscale e leia o mesmo caminho lá.
- Não reconstrua o app macOS via SSH; as reconstruções devem ser executadas diretamente no Mac.
- Nunca envie respostas parciais/streaming para superfícies de mensagens externas (WhatsApp, Telegram); apenas as respostas finais devem ser entregues lá. Eventos de streaming/ferramentas ainda podem ir para interfaces internas/canal de controle.
- Dicas de encaminhamento de voice wake:
  - O template do comando deve permanecer `zero-mac agent --message "${text}" --thinking low`; o `VoiceWakeForwarder` já faz o escape de shell de `${text}`. Não adicione aspas extras.
  - O PATH do launchd é mínimo; garanta que o PATH do agente de lançamento do app inclua os caminhos padrão do sistema mais o seu bin pnpm (geralmente `$HOME/Library/pnpm`) para que os binários `pnpm`/`zero` sejam resolvidos quando invocados via `zero-mac`.
- Para mensagens manuais de `zero message send` que incluem `!`, use o padrão heredoc anotado abaixo para evitar o escape da ferramenta Bash.
- Guardrails de lançamento: não altere os números de versão sem o consentimento explícito do operador; sempre peça permissão antes de executar qualquer etapa de publicação/lançamento do npm.

## NPM + 1Password (publicar/verificar)

- Use a habilidade 1password; todos os comandos `op` devem rodar em uma nova sessão tmux.
- Login: `eval "$(op signin --account my.1password.com)"` (app desbloqueado + integração ativada).
- OTP: `op read 'op://Private/Npmjs/one-time password?attribute=otp'`.
- Publicar: `npm publish --access public --otp="<otp>"` (rodar a partir do diretório do pacote).
- Verificar sem efeitos colaterais de npmrc local: `npm view <pkg> version --userconfig "$(mktemp)"`.
- Encerre a sessão tmux após publicar.
