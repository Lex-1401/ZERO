---
summary: "Hub de Rede: superfícies do gateway, pareamento, descoberta e segurança"
read_when:
  - Você precisa de uma visão geral da arquitetura de rede e segurança
  - Você está depurando acesso local vs. tailnet ou pareamento de dispositivos
  - Você deseja a lista canônica de documentos de rede
---

# Hub de Rede

Este hub reúne os documentos principais sobre como o ZERO se conecta, pareia e protege dispositivos via localhost, LAN e tailnet.

## Modelo Principal

- [Arquitetura do Gateway](/concepts/architecture)
- [Protocolo do Gateway](/gateway/protocol)
- [Manual do Gateway](/gateway)
- [Superfícies Web + Modos de Vinculação](/web)

## Pareamento + Identidade

- [Visão geral do pareamento (DMs + nós)](/start/pairing)
- [Pareamento de nós de propriedade do Gateway](/gateway/pairing)
- [CLI de Dispositivos (pareamento + rotação de token)](/cli/devices)
- [CLI de Pareamento (aprovações por DM)](/cli/pairing)

Confiança local:

- Conexões locais (loopback ou o próprio endereço tailnet do host do gateway) podem ser aprovadas automaticamente para pareamento, visando manter a experiência do usuário (UX) no mesmo host fluida.
- Clientes que não sejam tailnet/LAN locais ainda requerem aprovação explícita de pareamento.

## Descoberta + Transportes

- [Descoberta e Transportes](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [Acesso Remoto (SSH)](/gateway/remote)
- [Tailscale](/gateway/tailscale)

## Nós + Transportes

- [Visão geral de Nós](/nodes)
- [Protocolo Bridge (nós legados)](/gateway/bridge-protocol)
- [Manual do Nó: iOS](/platforms/ios)
- [Manual do Nó: Android](/platforms/android)

## Segurança

- [Visão geral de Segurança](/gateway/security)
- [Referência de configuração do Gateway](/gateway/configuration)
- [Resolução de problemas](/gateway/troubleshooting)
- [Doctor (Diagnóstico via CLI)](/gateway/doctor)
