# ∅ ZERO — Upgrade Roadmap (A-POS)

Este documento detalha o plano de execução para a transformação do ZERO no **Sistema Operacional Pessoal Agêntico** definitivo.

## 🏁 Visão Geral

Sair de um sistema baseado em CLI/Web para uma infraestrutura nativa, de alta performance, com latência zero e segurança de nível bancário (Secure Enclave).

---

## 🏗️ Fase 1: Fundação & Performance (Rust Migration)

- [ ] **Moving the Brain**: Migrar o loop principal de decisão para Rust.
- [ ] **Native Media Pipeline**: FFmpeg nativo e processamento de áudio/vídeo em Rust para reduzir consumo de bateria.
- [ ] **Secure Enclave Integration**: Armazenamento de chaves privadas no hardware (Apple Secure Enclave / TPM).
- [x] **Panic Button (L0)**: Implementação imediata de um comando de emergência que corta conexões e bloqueia a "Cripta".

## 🎙️ Fase 2: Interface de Voz & Percepção

- [ ] **Voz Latência Zero**: Integração do Whisper.cl e Piper (TTS) diretamente no core.
- [ ] **Memória Epistódica Visual**: Indexação temporal da tela (OCR + CLIP/embeddings locais).
- [ ] **Aprendizado Contínuo**: Fine-tuning local de adaptadores LoRA baseados no uso.

## 🎨 Fase 3: UX & Distribuição

- [ ] **Instaladores Nativos**: `.dmg` e `.exe` assinados via Tauri.
- [ ] **Onboarding Visual**: Fluxo gráfico de primeira execução (Configuração Zero-Touch).
- [x] **Dashboard Mission Control**: Telemetria granular (tokens/s, memória, status das skills).

## 🌐 Fase 4: Ecossistema & Federação

- [ ] **SDK Low-Code**: Interface visual para criação de Skills (Automação visual).
- [ ] **Federação P2P**: Protocolo de comunicação segura entre instâncias ZERO.
- [ ] **App Store Descentralizada**: Marketplace de skills com auditoria de integridade.

---

## 🛠️ Status da Implementação

| Recurso | Status | Notas |
| :--- | :--- | :--- |
| **Panic Button** | ✅ Concluído (L0) | Comando CLI e Core em Rust operacionais. |
| **Mission Control** | ✅ Concluído (L0) | Dashboard de telemetria e controle de pânico na UI. |
| **Rust Migration** | 🏗️ Em progresso | `MetricsEngine` e `VadEngine` integrados. |
| **Voz Latência Zero** | 🏗️ Em progresso | Native VAD implementado via Rust. |

---

> "O que você não pode ver trabalhando é que está funcionando." — ∅
