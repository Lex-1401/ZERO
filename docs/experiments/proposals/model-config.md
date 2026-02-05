---
summary: "Exploração: configuração de modelos, perfis de autenticação e comportamento de fallback"
read_when:
  - Explorando ideias futuras para seleção de modelos + perfis de autenticação
---
# Configuração de Modelos (Exploração)

Este documento captura **ideias** para a configuração futura de modelos. Não é uma especificação definitiva. Para ver o comportamento atual, consulte:

- [Modelos](/concepts/models)
- [Failover de modelos](/concepts/model-failover)
- [OAuth + perfis](/concepts/oauth)

## Motivação

Os usuários querem:

- Múltiplos perfis de autenticação por provedor (pessoal vs. trabalho).
- Seleção simples com `/model` com fallbacks previsíveis.
- Separação clara entre modelos de texto e modelos com capacidade de imagem.

## Possível direção (nível alto)

- Manter a seleção de modelos simples: `provedor/modelo` com aliases opcionais.
- Permitir que os provedores tenham múltiplos perfis de autenticação, com uma ordem explícita.
- Usar uma lista de fallback global para que todas as sessões façam o failover de forma consistente.
- Só substituir o roteamento de imagens quando configurado explicitamente.

## Questões em aberto

- A rotação de perfis deve ser por provedor ou por modelo?
- Como a UI deve apresentar a seleção de perfis para uma sessão?
- Qual é o caminho de migração mais seguro para as chaves de configuração legadas?
