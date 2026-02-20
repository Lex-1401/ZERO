---
summary: "Espaço de trabalho do agente: localização, layout e estratégia de backup"
read_when:
  - Você precisa explicar o espaço de trabalho do agente ou seu layout de arquivos
  - Você deseja fazer backup ou migrar um espaço de trabalho de agente
---
# Espaço de Trabalho do Agente

O espaço de trabalho (workspace) é a casa do agente. É o único diretório de trabalho usado para ferramentas de arquivo e para o contexto do espaço de trabalho. Mantenha-o privado e trate-o como uma memória.

Isso é separado de `~/.zero/`, que armazena configurações, credenciais e sessões.

**Importante:** o espaço de trabalho é o **cwd (diretório de trabalho atual) padrão**, não um sandbox rígido. As ferramentas resolvem caminhos relativos em relação ao espaço de trabalho, mas caminhos absolutos ainda podem alcançar outros locais no host, a menos que o sandboxing esteja habilitado. Se você precisar de isolamento, use [`agents.defaults.sandbox`](/gateway/sandboxing) (e/ou configuração de sandbox por agente). Quando o sandboxing está habilitado e o `workspaceAccess` não é `"rw"`, as ferramentas operam dentro de um espaço de trabalho de sandbox em `~/.zero/sandboxes`, não no espaço de trabalho do seu host.

## Localização padrão

- Padrão: `~/zero`
- Se `ZERO_PROFILE` estiver definido e não for `"default"`, o padrão torna-se `~/zero-<profile>`.
- Sobrescreva em `~/.zero/zero.json`:

```json5
{
  agent: {
    workspace: "~/zero"
  }
}
```

O `zero onboard`, `zero configure` ou `zero setup` criará o espaço de trabalho e semeará os arquivos de inicialização (bootstrap) se eles estiverem ausentes.

Se você já gerencia os arquivos do espaço de trabalho por conta própria, pode desativar a criação de arquivos de inicialização:

```json5
{ agent: { skipBootstrap: true } }
```

## Pastas de espaço de trabalho extras

Instalações mais antigas podem ter criado `~/zero`. Manter vários diretórios de espaço de trabalho pode causar confusão de autenticação ou desvio de estado, pois apenas um espaço de trabalho está ativo por vez.

**Recomendação:** mantenha um único espaço de trabalho ativo. Se você não usa mais as pastas extras, arquive-as ou mova-as para o Lixo (por exemplo, `trash ~/zero`). Se você mantiver intencionalmente múltiplos espaços de trabalho, certifique-se de que `agents.defaults.workspace` aponte para o ativo.

O `zero doctor` avisa quando detecta diretórios de espaço de trabalho extras.

## Mapa de arquivos do espaço de trabalho (o que cada arquivo significa)

Estes são os arquivos padrão que o ZERO espera dentro do espaço de trabalho:

- `AGENTS.md`
  - Instruções de operação para o agente e como ele deve usar a memória.
  - Carregado no início de cada sessão.
  - Bom lugar para regras, prioridades e detalhes de "como se comportar".

- `SOUL.md`
  - Persona, tom e limites.
  - Carregado em cada sessão.

- `USER.md`
  - Quem é o usuário e como deve ser tratado.
  - Carregado em cada sessão.

- `IDENTITY.md`
  - O nome, vibe e emoji do agente.
  - Criado/atualizado durante o ritual de inicialização.

- `TOOLS.md`
  - Notas sobre suas ferramentas locais e convenções.
  - Não controla a disponibilidade de ferramentas; é apenas uma orientação.

- `HEARTBEAT.md`
  - Checklist minúsculo opcional para execuções de heartbeat.
  - Mantenha-o curto para evitar gasto excessivo de tokens.

- `BOOT.md`
  - Checklist de inicialização opcional executado na reinicialização do gateway quando hooks internos estão habilitados.
  - Mantenha-o curto; use a ferramenta de mensagem para envios de saída.

- `BOOTSTRAP.md`
  - Ritual de primeira execução única.
  - Criado apenas para um espaço de trabalho novo.
  - Delete-o após o ritual ser concluído.

- `memory/YYYY-MM-DD.md`
  - Log diário de memória (um arquivo por dia).
  - Recomendado ler hoje + ontem no início da sessão.

- `MEMORY.md` (opcional)
  - Memória de longo prazo curada.
  - Carregue apenas na sessão principal e privada (não em contextos compartilhados/de grupo).

Veja [Memória](/concepts/memory) para o fluxo de trabalho e limpeza automática de memória.

- `skills/` (opcional)
  - Habilidades específicas do espaço de trabalho.
  - Sobrescreve habilidades gerenciadas/empacotadas quando os nomes coincidem.

- `canvas/` (opcional)
  - Arquivos de UI de Canvas para exibições em nós (por exemplo, `canvas/index.html`).

Se algum arquivo de inicialização estiver ausente, o ZERO injeta um marcador de "arquivo ausente" na sessão e continua. Arquivos de inicialização grandes são truncados ao serem injetados; ajuste o limite com `agents.defaults.bootstrapMaxChars` (padrão: 20000). O `zero setup` pode recriar os padrões ausentes sem sobrescrever arquivos existentes.

## O que NÃO está no espaço de trabalho

Estes residem em `~/.zero/` e NÃO devem ser enviados (committed) para o repositório do espaço de trabalho:

- `~/.zero/zero.json` (configuração)
- `~/.zero/credentials/` (tokens OAuth, chaves de API)
- `~/.zero/agents/<agentId>/sessions/` (transcrições de sessão + metadados)
- `~/.zero/skills/` (habilidades gerenciadas)

Se você precisar migrar sessões ou configurações, copie-as separadamente e mantenha-as fora do controle de versão.

## Backup via Git (recomendado, privado)

Trate o espaço de trabalho como memória privada. Coloque-o em um repositório git **privado** para que ele tenha backup e seja recuperável.

Execute estes passos na máquina onde o Gateway roda (que é onde o espaço de trabalho reside).

### 1) Inicialize o repositório

Se o git estiver instalado, novos espaços de trabalho são inicializados automaticamente. Se este espaço de trabalho ainda não for um repositório, execute:

```bash
cd ~/zero
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Adicionar espaço de trabalho do agente"
```

### 2) Adicione um remoto privado (opções para iniciantes)

Opção A: Interface Web do GitHub

1. Crie um novo repositório **privado** no GitHub.
2. Não inicialize com um README (evita conflitos de mesclagem).
3. Copie a URL remota HTTPS.
4. Adicione o remoto e faça o push:

```bash
git branch -M main
git remote add origin <url-https>
git push -u origin main
```

Opção B: CLI do GitHub (`gh`)

```bash
gh auth login
gh repo create zero-workspace --private --source . --remote origin --push
```

Opção C: Interface Web do GitLab

1. Crie um novo repositório **privado** no GitLab.
2. Não inicialize com um README (evita conflitos de mesclagem).
3. Copie a URL remota HTTPS.
4. Adicione o remoto e faça o push:

```bash
git branch -M main
git remote add origin <url-https>
git push -u origin main
```

### 3) Atualizações contínuas

```bash
git status
git add .
git commit -m "Atualizar memória"
git push
```

## Não envie segredos (secrets)

Mesmo em um repositório privado, evite armazenar segredos no espaço de trabalho:

- Chaves de API, tokens OAuth, senhas ou credenciais privadas.
- Qualquer coisa sob `~/.zero/`.
- Dumps brutos de chats ou anexos sensíveis.

Se você precisar armazenar referências sensíveis, use espaços reservados (placeholders) e mantenha o segredo real em outro lugar (gerenciador de senhas, variáveis de ambiente ou `~/.zero/`).

Sugestão de `.gitignore` inicial:

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## Movendo o espaço de trabalho para uma nova máquina

1. Clone o repositório no caminho desejado (padrão `~/zero`).
2. Defina `agents.defaults.workspace` para esse caminho em `~/.zero/zero.json`.
3. Execute `zero setup --workspace <caminho>` para semear quaisquer arquivos ausentes.
4. Se você precisar de sessões, copie `~/.zero/agents/<agentId>/sessions/` da máquina antiga separadamente.

## Notas avançadas

- O roteamento multi-agente pode usar diferentes espaços de trabalho por agente. Veja [Roteamento de canal](/concepts/channel-routing) para configuração de roteamento.
- Se `agents.defaults.sandbox` estiver habilitado, sessões não-principais podem usar espaços de trabalho de sandbox por sessão em `agents.defaults.sandbox.workspaceRoot`.
