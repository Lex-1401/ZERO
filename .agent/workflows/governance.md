---
description: Protocolo de Governança Técnica e Documentação (Master Tier)
---

# Protocolo de Governança Técnica e Documentação

Este workflow impõe o rigor técnico de nível PhD para cada ciclo de atualização do sistema ZERO. Deve ser executado antes de qualquer merge ou release principal.

## 1. Auditoria Documental

- Verificar se todos os arquivos editados possuem cabeçalhos **JSDoc** atualizados.
- Garantir que nenhum arquivo exceda o limite de **500 linhas** (Princípio da Modularidade Atômica).
- Validar se novos módulos possuem entradas correspondentes no `README.md` ou `ARCHITECTURE.md`.

## 2. Validação do Sentinel

- Rodar `pnpm zero security audit --deep` para garantir que as novas mudanças não introduziram vetores de injeção.
- Verificar se segredos ou chaves de teste foram acidentalmente "staged".
- Validar se novos comandos shell estão devidamente categorizados no `src/security/guard.ts`.

## 3. Sincronização de Soul

- Se houver mudanças na lógica de personalidade, validar o impacto no `SOUL.md`.
- Testar o "Córtex" com o `System Prompt` atualizado para garantir conformidade com os protocolos de segurança.

## 4. Checklist de Release (Cross-Platform)

- Validar a compilação do `rust-core` em arquiteturas ARM (Raspberry Pi) e x64 (Mac/Linux).
- Verificar se o script de `quickstart.sh` reflete as novas dependências.

## 5. Execução do Gate de Qualidade Master

// turbo-all
pnpm lint
pnpm build:full
pnpm test:unit
zero security audit --fix
pnpm zero doctor
