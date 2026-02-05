---
summary: "Descoberta Bonjour/mDNS + depuração (beacons do Gateway, clientes e modos de falha comuns)"
read_when:
  - Depurando problemas de descoberta Bonjour no macOS/iOS
  - Alterando tipos de serviço mDNS, registros TXT ou UX de descoberta
---
# Bonjour / Descoberta mDNS

O ZERO usa o Bonjour (mDNS / DNS-SD) apenas como uma **conveniência de rede local (LAN)** para descobrir um Gateway ativo (ponto de extremidade WebSocket). É feito por melhor esforço e **não** substitui a conectividade baseada em SSH ou Tailscale (Tailnet).

## Bonjour de área ampla (Unicast DNS-SD) sobre Tailscale

Se o nó e o gateway estiverem em redes diferentes, o mDNS multicast não cruzará essa fronteira. Você pode manter o mesmo UX de descoberta mudando para o **unicast DNS-SD** ("Wide-Area Bonjour") sobre a Tailscale.

Passos de alto nível:

1) Execute um servidor DNS no host do gateway (acessível via Tailnet).
2) Publique registros DNS-SD para `_zero-gw._tcp` sob uma zona dedicada (exemplo: `zero.internal.`).
3) Configure o **DNS dividido (split DNS)** da Tailscale para que `zero.internal` seja resolvido através desse servidor DNS para os clientes (incluindo iOS).

O ZERO padroniza o domínio `zero.internal.` para este modo. Os nós iOS/Android procuram automaticamente tanto em `local.` quanto em `zero.internal.`.

### Configuração do Gateway (recomendado)

```json5
{
  gateway: { bind: "tailnet" }, // apenas Tailnet (recomendado)
  discovery: { wideArea: { enabled: true } } // habilita a publicação DNS-SD em zero.internal
}
```

### Configuração única do servidor DNS (no host do gateway)

```bash
zero dns setup --apply
```

Isso instala o CoreDNS e o configura para:

- ouvir na porta 53 apenas nas interfaces Tailscale do gateway.
- servir `zero.internal.` a partir de `~/.zero/dns/zero.internal.db`.

Valide a partir de uma máquina conectada à Tailnet:

```bash
dns-sd -B _zero-gw._tcp zero.internal.
dig @<TAILNET_IPV4> -p 53 _zero-gw._tcp.zero.internal PTR +short
```

### Configurações de DNS da Tailscale

No console de administração da Tailscale:

- Adicione um servidor de nomes (nameserver) apontando para o IP da Tailnet do gateway (UDP/TCP 53).
- Adicione o DNS dividido para que o domínio `zero.internal` use esse servidor de nomes.

Assim que os clientes aceitarem o DNS da Tailnet, os nós iOS poderão procurar `_zero-gw._tcp` em `zero.internal.` sem necessidade de multicast.

### Segurança do ouvinte (listener) do Gateway (recomendado)

A porta WS do Gateway (padrão `18789`) vincula-se ao loopback por padrão. Para acesso via LAN/Tailnet, vincule-se explicitamente e mantenha a autenticação habilitada.

Para configurações apenas via Tailnet:

- Defina `gateway.bind: "tailnet"` em `~/.zero/zero.json`.
- Reinicie o Gateway (ou reinicie o aplicativo da barra de menus do macOS).

## O que é anunciado

Apenas o Gateway anuncia `_zero-gw._tcp`.

## Tipos de serviço

- `_zero-gw._tcp` — beacon de transporte do gateway (usado pelos nós macOS/iOS/Android).

## Chaves TXT (dicas não secretas)

O Gateway anuncia pequenas dicas não secretas para tornar os fluxos de interface convenientes:

- `role=gateway`
- `displayName=<nome amigável>`
- `lanHost=<hostname>.local`
- `gatewayPort=<porta>` (WS do Gateway + HTTP)
- `gatewayTls=1` (apenas quando o TLS está habilitado)
- `gatewayTlsSha256=<sha256>` (apenas quando o TLS está habilitado e a impressão digital está disponível)
- `canvasPort=<porta>` (apenas quando o host do canvas está habilitado; padrão `18793`)
- `sshPort=<porta>` (padrão 22 quando não sobrescrito)
- `transport=gateway`
- `cliPath=<caminho>` (opcional; caminho absoluto para um ponto de entrada `zero` executável)
- `tailnetDns=<magicdns>` (dica opcional quando a Tailnet está disponível)

## Depuração no macOS

Ferramentas integradas úteis:

- Procurar instâncias:

  ```bash
  dns-sd -B _zero-gw._tcp local.
  ```

- Resolver uma instância (substitua `<instancia>`):

  ```bash
  dns-sd -L "<instancia>" _zero-gw._tcp local.
  ```

Se a procura funcionar, mas a resolução falhar, você geralmente está enfrentando um problema de política de LAN ou um problema no resolvedor mDNS.

## Depuração nos logs do Gateway

O Gateway grava um arquivo de log rotativo (exibido na inicialização como `gateway log file: ...`). Procure por linhas `bonjour:`, especialmente:

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Depuração no nó iOS

O nó iOS usa o `NWBrowser` para descobrir `_zero-gw._tcp`.

Para capturar logs:

- Ajustes → Gateway → Avançado → **Logs de Depuração de Descoberta**
- Ajustes → Gateway → Avançado → **Logs de Descoberta** → reproduzir → **Copiar**

O log inclui transições de estado do navegador e mudanças no conjunto de resultados.

## Modos de falha comuns

- **Bonjour não cruza redes**: use Tailnet ou SSH.
- **Multicast bloqueado**: algumas redes Wi-Fi desativam o mDNS.
- **Repouso / Instabilidade de interface**: o macOS pode perder temporariamente os resultados do mDNS; tente novamente.
- **Procura funciona, mas resolução falha**: mantenha os nomes das máquinas simples (evite emojis ou pontuação) e reinicie o Gateway. O nome da instância do serviço deriva do nome do host, portanto, nomes excessivamente complexos podem confundir alguns resolvedores.

## Nomes de instância escapados (`\032`)

O Bonjour/DNS-SD muitas vezes escapa bytes em nomes de instâncias de serviço como sequências decimais `\DDD` (por exemplo, espaços tornam-se `\032`).

- Isso é normal no nível do protocolo.
- As interfaces devem decodificar para exibição (o iOS usa o `BonjourEscapes.decode`).

## Desativação / Configuração

- `ZERO_DISABLE_BONJOUR=1` desativa o anúncio.
- `gateway.bind` em `~/.zero/zero.json` controla o modo de vínculo do Gateway.
- `ZERO_SSH_PORT` sobrescreve a porta SSH anunciada no TXT.
- `ZERO_TAILNET_DNS` publica uma dica de MagicDNS no TXT.
- `ZERO_CLI_PATH` sobrescreve o caminho da CLI anunciado.

## Documentos relacionados

- Política de descoberta e seleção de transporte: [Descoberta](/gateway/discovery)
- Emparelhamento de nós + aprovações: [Emparelhamento de Gateway](/gateway/pairing)
