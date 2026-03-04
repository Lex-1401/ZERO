# Protocolo de Comunicação ZERO (Master Standard)

## 1. Visão Geral

Este protocolo define como o **Gateway** (Cérebro), **Canais** (Sentidos) e **Agentes** (Córtex) se comunicam de forma assíncrona e resiliente.

## 2. Fluxo de Mensagem (Inbound)

1. **Canal (e.g. WhatsApp):** Recebe evento bruto.
2. **Normalizador:** Converte para o schema interno de `Message`.
3. **Gateway Router:** Identifica a sessão e despacha para o **Agente** via ACP (Agent Client Protocol).
4. **Agent Córtex:** Processa a intenção e executa ferramentas se necessário.
5. **Gateway Response:** Retorna a resposta para o canal original.

## 3. Segurança e Sentinel

Toda mensagem que transita entre o Gateway e o Agente é interceptada pelo **Sentinel Engine** para:

- Redação de PII (Personal Identifiable Information).
- Detecção de Injeção de Prompt.
- Validação de custos de tokens.

## 4. Estado e Persistência

O estado das sessões é mantido em arquivos JSON (com locking rígoroso) ou SQLite local, garantindo que o sistema seja **Local-First** e **Sovereign-First**.
