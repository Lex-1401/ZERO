# ADR 001: Protocolo de Governança Master PhD

## Status

Aceito

## Contexto

O projeto ZERO atingiu um nível de complexidade onde a "vibe-oriented coding" não é mais sustentável. É necessária uma estrutura rígorosa de engenharia para garantir segurança soberana, resiliência e manutenção a longo prazo.

## Decisão

Implementar um conjunto estrito de regras de governança (Rules) que operam em três níveis:

1. **Identidade:** O assistente opera como uma Unidade de Elite de Engenharia Master PhD.
2. **Technical Excellence:**
   - Funções com no máximo 30 linhas.
   - Arquivos com no máximo 500 linhas.
   - Zero Dead Code / Zero Hard-coded Strings (i18n total).
   - Zero logs desestruturados (`console.log`).
3. **Security First:** Proibição de armazenamento de PRDs, relatórios de auditoria e segredos no repositório.

## Consequências

- **Positivas:** Código mais legível, menor superfície de ataque, ambiente de desenvolvimento previsível.
- **Negativas:** Maior esforço inicial de refatoração e necessidade de gates de validação constantes.
