---
summary: "Suporte a Windows (WSL2) + status do aplicativo complementar"
read_when:
  - Instalando o ZERO no Windows
  - Procurando o status do aplicativo complementar para Windows
---
# Windows (WSL2)

O ZERO no Windows é recomendado **via WSL2** (Ubuntu recomendado). A CLI + Gateway rodam dentro do Linux, o que mantém o runtime consistente e torna o ferramental muito mais compatível (Node/Bun/pnpm, binários Linux, habilidades). Instalações nativas no Windows não foram testadas e são mais problemáticas.

Aplicativos nativos complementares para Windows estão planejados.

## Instalação (WSL2)

- [Primeiros Passos](/start/getting-started) (use dentro do WSL)
- [Instalação & atualizações](/install/updating)
- Guia oficial do WSL2 (Microsoft): <https://learn.microsoft.com/windows/wsl/install>

## Gateway

- [Manual do Gateway](/gateway)
- [Configuração](/gateway/configuration)

## Instalação do serviço do Gateway (CLI)

Dentro do WSL2:

```bash
zero onboard --install-daemon
```

Ou:

```bash
zero gateway install
```

Ou:

```bash
zero configure
```

Selecione **Gateway service** quando solicitado.

Reparar/migrar:

```bash
zero doctor
```

## Avançado: expor serviços do WSL via LAN (portproxy)

O WSL tem sua própria rede virtual. Se outra máquina precisar alcançar um serviço rodando **dentro do WSL** (SSH, um servidor TTS local ou o Gateway), você deve encaminhar uma porta do Windows para o IP atual do WSL. O IP do WSL muda após reinicializações, portanto, você pode precisar atualizar a regra de encaminhamento.

Exemplo (PowerShell **como Administrador**):

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "IP do WSL não encontrado." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

Permita a porta através do Firewall do Windows (uma única vez):

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

Atualize o portproxy após as reinicializações do WSL:

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

Notas:

- O SSH de outra máquina tem como alvo o **IP do host Windows** (exemplo: `ssh user@windows-host -p 2222`).
- Nós remotos devem apontar para uma URL de Gateway **alcançável** (não `127.0.0.1`); use `zero status --all` para confirmar.
- Use `listenaddress=0.0.0.0` para acesso via LAN; `127.0.0.1` mantém o acesso apenas local.
- Se você quiser que isso seja automático, registre uma Tarefa Agendada para executar a etapa de atualização no login.

## Instalação do WSL2 passo a passo

### 1) Instalar WSL2 + Ubuntu

Abra o PowerShell (Admin):

```powershell
wsl --install
# Ou escolha uma distro explicitamente:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

Reinicie se o Windows solicitar.

### 2) Habilitar systemd (necessário para a instalação do gateway)

No seu terminal WSL:

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

Então, a partir do PowerShell:

```powershell
wsl --shutdown
```

Abra o Ubuntu novamente e verifique:

```bash
systemctl --user status
```

### 3) Instalar o ZERO (dentro do WSL)

Siga o fluxo de Primeiros Passos do Linux dentro do WSL:

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm ui:build # constrói a UI automaticamente na primeira execução
pnpm build
zero onboard
```

Guia completo: [Primeiros Passos](/start/getting-started)

## Aplicativo complementar para Windows

Ainda não temos um aplicativo complementar para Windows. Contribuições são bem-vindas se você quiser fazer isso acontecer.
