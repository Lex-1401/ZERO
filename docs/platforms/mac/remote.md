---
summary: "Fluxo do app macOS para controlar um gateway ZERO remoto via SSH"
read_when:
  - Configurando ou depurando o controle remoto via mac
---
# ZERO Remoto (macOS ⇄ host remoto)

Este fluxo permite que o app macOS atue como um controle remoto completo para um gateway ZERO em execução em outro host (desktop/servidor). É o recurso **Remote over SSH** (execução remota) do app. Todos os recursos — verificações de saúde, encaminhamento de Voice Wake e Web Chat — reutilizam a mesma configuração SSH remota de *Settings → General*.

## Modos

- **Local (este Mac)**: Tudo roda no laptop. Sem envolvimento de SSH.
- **Remote over SSH (padrão)**: Comandos do ZERO são executados no host remoto. O app mac abre uma conexão SSH com `-o BatchMode` mais a identidade/chave escolhida e um encaminhamento de porta local (port-forward).
- **Remote direct (ws/wss)**: Sem túnel SSH. O app mac se conecta diretamente à URL do gateway (por exemplo, via Tailscale Serve ou um proxy reverso HTTPS público).

## Transportes remotos

O modo remoto suporta dois transportes:

- **Túnel SSH** (padrão): Usa `ssh -N -L ...` para encaminhar a porta do gateway para o localhost. O gateway verá o IP do nó como `127.0.0.1` porque o túnel é loopback.
- **Direto (ws/wss)**: Conecta-se diretamente à URL do gateway. O gateway vê o IP real do cliente.

## Pré-requisitos no host remoto

1) Instale Node + pnpm e compile/instale a CLI do ZERO (`pnpm install && pnpm build && pnpm link --global`).
2) Garanta que o `zero` esteja no PATH para shells não-interativos (crie um link simbólico para `/usr/local/bin` ou `/opt/homebrew/bin` se necessário).
3) Open SSH com autenticação por chave. Recomendamos IPs do **Tailscale** para acessibilidade estável fora da rede local (LAN).

## Configuração do app macOS

1) Abra *Settings → General*.
2) Em **ZERO runs**, escolha **Remote over SSH** e defina:
   - **Transport**: **SSH tunnel** ou **Direct (ws/wss)**.
   - **SSH target**: `usuario@host` (opcional `:porta`).
     - Se o gateway estiver na mesma rede local e anunciar via Bonjour, escolha-o na lista de descobertos para preencher este campo automaticamente.
   - **Gateway URL** (Apenas Direto): `wss://gateway.example.ts.net` (ou `ws://...` para local/LAN).
   - **Identity file** (avançado): caminho para sua chave.
   - **Project root** (avançado): caminho do checkout remoto usado para comandos.
   - **CLI path** (avançado): caminho opcional para um ponto de entrada/binário executável do `zero` (preenchido automaticamente quando anunciado).
3) Clique em **Test remote**. O sucesso indica que o `zero status --json` remoto funciona corretamente. Falhas geralmente significam problemas de PATH/CLI; erro 127 significa que a CLI não foi encontrada remotamente.
4) Verificações de saúde e Web Chat agora passarão automaticamente por este túnel SSH.

## Web Chat

- **Túnel SSH**: O Web Chat se conecta ao gateway através da porta de controle WebSocket encaminhada (padrão 18789).
- **Direto (ws/wss)**: O Web Chat se conecta diretamente à URL configurada do gateway.
- Não existe mais um servidor HTTP separado para o WebChat.

## Permissões

- O host remoto precisa das mesmas aprovações de TCC que o local (Automação, Acessibilidade, Gravação de Tela, Microfone, Reconhecimento de Voz, Notificações). Execute o onboarding nessa máquina para concedê-las uma vez.
- Os nós anunciam seu estado de permissão via `node.list` / `node.describe` para que os agentes saibam o que está disponível.

## Notas de segurança

- Prefira vincular (bind) ao loopback no host remoto e conectar via SSH ou Tailscale.
- Se você vincular o Gateway a uma interface que não seja loopback, exija autenticação por token/senha.
- Veja [Segurança](/gateway/security) e [Tailscale](/gateway/tailscale).

## Fluxo de login do WhatsApp (remoto)

- Execute `zero channels login --verbose` **no host remoto**. Escaneie o QR com o WhatsApp em seu celular.
- Execute o login novamente nesse host se a autenticação expirar. A verificação de saúde indicará problemas de conexão.

## Solução de problemas

- **exit 127 / not found**: o `zero` não está no PATH para shells que não são de login. Adicione ao `/etc/paths`, ao seu rc do shell, ou crie um link simbólico para `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed**: verifique a acessibilidade do SSH, o PATH e se o Baileys está logado (`zero status --json`).
- **Web Chat stuck**: confirme se o gateway está em execução no host remoto e se a porta encaminhada corresponde à porta WS do gateway; a interface requer uma conexão WS saudável.
- **Node IP shows 127.0.0.1**: esperado com o túnel SSH. Altere o **Transport** para **Direct (ws/wss)** se desejar que o gateway veja o IP real do cliente.
- **Voice Wake**: as frases de ativação são encaminhadas automaticamente no modo remoto; não é necessário um encaminhador separado.

## Sons de notificação

Escolha sons por notificação a partir de scripts com `zero` e `node.invoke`, ex:

```bash
zero nodes notify --node <id> --title "Ping" --body "Gateway remoto pronto" --sound Glass
```

Não existe mais uma alternância global de “som padrão” no app; os chamadores escolhem um som (ou nenhum) por requisição.
