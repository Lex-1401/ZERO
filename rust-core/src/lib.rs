//! # ZERO Rust Core (librust-core)
//! 
//! The `librust-core` crate provides the high-performance, security-critical, 
//! and latency-sensitive primitives for the ZERO Agentic Personal Operating System (A-POS).
//! 
//! [PT] O crate `librust-core` fornece as primitivas de alta performance e segurança 
//! para o Sistema Operacional Pessoal Agêntico (A-POS) ZERO.
//!
//! This library resides at the base of the ZERO architecture, handling:
//! - **Voice Activity Detection (VAD)**: Real-time PCM audio analysis.
//! - **Security Guardrails**: Prompt injection detection and PII redaction.
//! - **Telemetry & Metrics**: Precise tracking of token usage and operational latency.
//! - **Event Deduplication**: Temporal cache for event idempotency.
//! - **Emergency Governance**: Global panic mode for immediate system lockdown.

use napi_derive::napi;
use indexmap::IndexMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use unicode_normalization::UnicodeNormalization;

/// Global emergency state flag.
/// [PT] Sinalizador global de estado de emergência.
static PANIC_MODE: AtomicBool = AtomicBool::new(false);

/// Activates the system's global emergency "Panic Mode".
/// 
/// [PT] Ativa o "Modo de Pânico" global do sistema.
/// 
/// When active, most engine operations (VAD, Security, Dedupe) will return emergency defaults 
/// or bypass processing to ensure safety and prevent cascading failures.
///
/// # Arguments
/// * `secret` - A pre-shared internal secret required to authorize the panic transition.
///              Default: `INTERNAL_EMERGENCY_2024`.
#[napi]
pub fn trigger_panic(secret: String) {
    if secret == "INTERNAL_EMERGENCY_2024" {
        PANIC_MODE.store(true, Ordering::SeqCst);
    }
}

/// Deactivates panic mode, restoring the core to its operational state.
/// 
/// [PT] Desativa o modo de pânico, restaurando o núcleo ao seu estado operacional.
#[napi]
pub fn reset_panic() {
    PANIC_MODE.store(false, Ordering::SeqCst);
}

/// Quantifies the current state of system urgency.
/// 
/// # Returns
/// * `true` if the system is currently under an emergency lockdown (Panic Mode).
/// * `false` if operation is nominal.
#[napi]
pub fn is_panic_mode() -> bool {
    PANIC_MODE.load(Ordering::SeqCst)
}

/// Real-time Voice Activity Detection (VAD) Engine.
/// 
/// [PT] Motor de Detecção de Atividade de Voz (VAD) em tempo real.
/// 
/// Implements a robust RMS-based energy detector with configurable threshold 
/// governance and temporal silence suppression logic.
#[napi]
pub struct VadEngine {
    is_talking: bool,
    silence_start_ms: u64,
    threshold: f64,
    silence_timeout_ms: u64,
}

#[napi]
impl VadEngine {
    /// Initializes a new VAD processor with specific acoustic sensitivity.
    /// 
    /// # Arguments
    /// * `threshold` - Root Mean Square (RMS) energy floor for speech qualification.
    /// * `silence_timeout_ms` - Temporal window in milliseconds for speech-end finalization.
    #[napi(constructor)]
    pub fn new(threshold: f64, silence_timeout_ms: u32) -> Self {
        VadEngine {
            is_talking: false,
            silence_start_ms: 0,
            threshold,
            silence_timeout_ms: silence_timeout_ms as u64,
        }
    }

    /// Conducts acoustic analysis on a discrete segment of PCM audio.
    /// 
    /// [PT] Realiza análise acústica em um segmento discreto de áudio PCM.
    ///
    /// # Arguments
    /// * `chunk` - Raw buffer containing 16-bit Little Endian PCM samples.
    /// 
    /// # Returns
    /// * `"panic"` - Emergency bypass.
    /// * `"speech_start"` - Transition from silence to qualified speech.
    /// * `"talking"` - Continued occupancy of the speech band.
    /// * `"silencing"` - Transient state within the silence grace period.
    /// * `"speech_end"` - Conclusion of a speech segment.
    /// * `"silent"` - Baseline background state.
    #[napi]
    pub fn process_chunk(&mut self, chunk: Vec<u8>) -> String {
        if is_panic_mode() {
            return "panic".to_string();
        }

        let samples = chunk.len() / 2;
        if samples == 0 {
            return "silent".to_string();
        }

        let mut sum_sq = 0.0;
        for i in 0..samples {
            let start = i * 2;
            if start + 1 < chunk.len() {
                let sample = i16::from_le_bytes([chunk[start], chunk[start + 1]]) as f64;
                sum_sq += sample * sample;
            }
        }
        
        let rms = (sum_sq / samples as f64).sqrt();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if rms > self.threshold {
            self.silence_start_ms = 0;
            if !self.is_talking {
                self.is_talking = true;
                return "speech_start".to_string();
            }
            "talking".to_string()
        } else {
            if self.is_talking {
                if self.silence_start_ms == 0 {
                    self.silence_start_ms = now;
                } else if now - self.silence_start_ms > self.silence_timeout_ms {
                    self.is_talking = false;
                    self.silence_start_ms = 0;
                    return "speech_end".to_string();
                }
                "silencing".to_string()
            } else {
                "silent".to_string()
            }
        }
    }
}

/// Datagram representing token consumption per model.
#[napi(object)]
pub struct ModelMetric {
    /// Declarative model identifier.
    pub model: String,
    /// Absolute token count processed (f64 representation for NAPI compatibility).
    pub count: f64,
}

/// Comprehensive temporal and throughput summary of system performance.
#[napi(object)]
pub struct MetricsSummary {
    /// Aggregate token throughput across the runtime lifecycle.
    pub total_tokens: f64,
    /// Vectorized breakdown of usage indexed by model ID.
    pub model_breakdown: Vec<ModelMetric>,
    /// Statistical average of operation latency (moving window).
    pub avg_latency_ms: f64,
}

/// Orchestrator for behavioral telemetry and performance auditing.
/// 
/// [PT] Orquestrador para telemetria comportamental e auditoria de desempenho.
#[napi]
pub struct MetricsEngine {
    token_counts: IndexMap<String, f64>,
    latency_samples: Vec<f64>,
}

#[napi]
impl MetricsEngine {
    /// Bootstraps an empty telemetry engine with zeroed state.
    #[napi(constructor)]
    pub fn new() -> Self {
        MetricsEngine {
            token_counts: IndexMap::new(),
            latency_samples: Vec::new(),
        }
    }

    /// Registers a token consumption event.
    /// 
    /// # Arguments
    /// * `model` - The agent/model target for the metric.
    /// * `count` - The numeric token volume to increment.
    #[napi]
    pub fn record_tokens(&mut self, model: String, count: u32) {
        let entry = self.token_counts.entry(model).or_insert(0.0);
        *entry += count as f64;
    }

    /// Appends a latency sample to the internal rolling measurement window.
    /// 
    /// # Arguments
    /// * `ms` - Latency duration in milliseconds.
    #[napi]
    pub fn record_latency(&mut self, ms: f64) {
        self.latency_samples.push(ms);
        if self.latency_samples.len() > 100 {
            self.latency_samples.remove(0);
        }
    }

    /// Synthesizes a point-in-time report of system-wide metrics.
    /// 
    /// # Returns
    /// * A `MetricsSummary` serialized for the NAPI boundary.
    #[napi]
    pub fn summarize(&self) -> MetricsSummary {
        let total_tokens = self.token_counts.values().sum();
        let model_breakdown = self.token_counts
            .iter()
            .map(|(k, &v)| ModelMetric { model: k.clone(), count: v })
            .collect();
        
        let avg_latency = if self.latency_samples.is_empty() {
            0.0
        } else {
            let sum: f64 = self.latency_samples.iter().sum();
            sum / self.latency_samples.len() as f64
        };

        MetricsSummary {
            total_tokens,
            model_breakdown,
            avg_latency_ms: avg_latency,
        }
    }
}

/// Temporal event deduplication utility with automatic cache pruning.
/// 
/// [PT] Utilitário de deduplicação de eventos temporais com poda automática de cache.
/// 
/// Designed to prevent redundant processing of high-frequency events within a 
/// configurable Time-To-Live (TTL) window.
#[napi]
pub struct RatchetDedupe {
    cache: IndexMap<String, f64>,
    ttl_ms: f64,
    max_size: usize,
}

#[napi]
impl RatchetDedupe {
    /// Instantiates a deduplication ratchet with memory and temporal constraints.
    /// 
    /// # Arguments
    /// * `ttl_ms` - Entry expiration threshold in milliseconds.
    /// * `max_size` - Maximum capacity of the LRU-style cache.
    #[napi(constructor)]
    pub fn new(ttl_ms: u32, max_size: u32) -> Self {
        RatchetDedupe {
            cache: IndexMap::new(),
            ttl_ms: ttl_ms as f64,
            max_size: max_size as usize,
        }
    }

    /// Evaluates the uniqueness of an event identifier.
    /// 
    /// # Arguments
    /// * `key` - Event fingerprint.
    /// * `timestamp_ms` - Override for current clock if provided (e.g., recorded events).
    /// 
    /// # Returns
    /// * `true` - Unique event; now registered in cache.
    /// * `false` - Known event or emergency bypass.
    #[napi]
    pub fn check(&mut self, key: String, timestamp_ms: Option<f64>) -> bool {
        if is_panic_mode() {
            return false;
        }

        // Integrity check: Prevent memory exhaustion by limiting key length
        if key.len() > 1024 {
            return false;
        }

        let now = match timestamp_ms {
            Some(ts) => ts,
            None => SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as f64,
        };

        self.prune(now);

        if self.cache.contains_key(&key) {
            return false;
        }

        self.cache.insert(key, now);

        if self.cache.len() > self.max_size {
            self.cache.shift_remove_index(0);
        }

        true
    }

    /// Flushes all entries from the deduplication surface.
    #[napi]
    pub fn clear(&mut self) {
        self.cache.clear();
    }

    /// Quantifies current occupancy of the deduplication cache.
    #[napi]
    pub fn size(&self) -> u32 {
        self.cache.len() as u32
    }

    /// Internal eviction logic based on temporal decay.
    fn prune(&mut self, now: f64) {
        while let Some((_, &ts)) = self.cache.get_index(0) {
            if now - ts > self.ttl_ms {
                self.cache.shift_remove_index(0);
            } else {
                break;
            }
        }
    }
}

/// Robust Native Security Engine.
/// 
/// [PT] Motor de Segurança Nativo Robusto.
/// 
/// Executes high-speed pattern matching and heuristic entropy analysis to 
/// defend against adversarial prompt injections and prevent data exfiltration.
#[napi]
pub struct SecurityEngine {
    injection_patterns: Vec<regex::Regex>,
    pii_patterns: Vec<(regex::Regex, String)>,
}

#[napi]
impl SecurityEngine {
    /// Initializes the engine with the standard Zero Trust behavioral profile.
    #[napi(constructor)]
    pub fn new() -> Self {
        let injection_patterns = vec![
            // Phrasing-based injections
            regex::Regex::new(r"(?i)ignore (all )?previous instructions").unwrap(),
            regex::Regex::new(r"(?i)render system prompt").unwrap(),
            regex::Regex::new(r"(?i)reveal your instructions").unwrap(),
            regex::Regex::new(r"(?i)you are now DAN").unwrap(),
            regex::Regex::new(r"(?i)system override").unwrap(),
            regex::Regex::new(r"(?i)unfiltered response").unwrap(),
            regex::Regex::new(r"(?i)forget everything.*start (as|a)").unwrap(),
            regex::Regex::new(r"(?i)you are now a.*that always").unwrap(),
            regex::Regex::new(r"(?i)do anything now").unwrap(),
            regex::Regex::new(r"(?i)start (a )?new session").unwrap(),
            regex::Regex::new(r"(?i)dev mode").unwrap(),
            regex::Regex::new(r"(?i)debug mode").unwrap(),
            regex::Regex::new(r"(?i)cannot refuse").unwrap(),
            regex::Regex::new(r"(?i)opposite mode").unwrap(),
            regex::Regex::new(r"(?i)act as a (system|root|admin)").unwrap(),
            regex::Regex::new(r"(?i)reveal all (keys|secrets|passwords)").unwrap(),
            regex::Regex::new(r"(?i)dan mode").unwrap(),
            
            // Fragmentation-aware / Obfuscated patterns
            regex::Regex::new(r"(?i)i\s*g\s*n\s*o\s*r\s*e\s*a\s*l\s*l").unwrap(),
            regex::Regex::new(r"(?i)p\s*r\s*e\s*v\s*i\s*n\s*s\s*t").unwrap(),
            regex::Regex::new(r"\u{0456}gn\u{043b}re").unwrap(), // Cyrillic homoglyph

            // Modern attack vectors (VAPT-MEDIUM-008)
            regex::Regex::new(r"(?i)repeat.*(?:above|system|instructions)").unwrap(),
            regex::Regex::new(r"(?i)translate.*(?:above|preceding|system).*(?:to|into)").unwrap(),
            regex::Regex::new(r"(?i)what (?:are|were) your (?:instructions|rules|system)").unwrap(),
            regex::Regex::new(r"(?i)output.*(?:system|initial).*(?:prompt|instructions)").unwrap(),
            regex::Regex::new(r"(?i)print.*(?:system|original).*(?:prompt|message)").unwrap(),
            regex::Regex::new(r"(?i)show.*(?:hidden|system|original).*(?:prompt|instructions|text)").unwrap(),
            regex::Regex::new(r"(?i)(?:encode|convert|base64).*(?:system|instructions|prompt)").unwrap(),
            regex::Regex::new(r"(?i)data:text/html;base64").unwrap(),

            // Delimiter confusion / Context escaping
            regex::Regex::new(r"(?i)\[/INST\]|\[INST\]|<<SYS>>|/SYS>>").unwrap(),
            regex::Regex::new(r"(?i)### (Instruction|Response|System):").unwrap(),
            regex::Regex::new(r"(?i)<\|im_start\|>|<\|im_end\|>|<\|system\|>").unwrap(),
            regex::Regex::new(r"(?i)---").unwrap(),

            // Tool Use / Function Calling Injections
            regex::Regex::new(r"(?i)Call tool:").unwrap(),
            regex::Regex::new(r"(?i)Execute command:").unwrap(),
            regex::Regex::new(r"(?i)run_command\(.*\)").unwrap(),

            // Obfuscation / Encoding patterns (hardened)
            regex::Regex::new(r"(?i)[a-zA-Z0-9+/]{40,}={0,2}").unwrap(),
            regex::Regex::new(r"(?i)[0-9a-fA-F]{24,}").unwrap(),
            regex::Regex::new(r"\\u[0-9a-fA-F]{4}").unwrap(),
            regex::Regex::new(r"(?i)0x[0-9a-fA-F]{24,}").unwrap(),
            
            // Loose / Heuristic Jailbreaks
            regex::Regex::new(r"(?i)(forget|disregard|ignore).*(rules|instructions|guidelines)").unwrap(),
            regex::Regex::new(r"(?i)(tell|show|reveal).*(system|secret|prompt|internal)").unwrap(),
        ];

        let pii_patterns = vec![
            // High-priority secrets
            (regex::Regex::new(r"(?i)Authorization\s*[:=]\s*Bearer\s+([A-Za-z0-9._\-+=]+)").unwrap(), "[REDACTED-AUTH]".to_string()),
            (regex::Regex::new(r"sk-[a-zA-Z0-9]{32,}").unwrap(), "[REDACTED-API-KEY]".to_string()),
            (regex::Regex::new(r"(?i)-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----").unwrap(), "[REDACTED-PEM]".to_string()),
            (regex::Regex::new(r"ghp_[A-Za-z0-9_]{36,}").unwrap(), "[REDACTED-GITHUB-TOKEN]".to_string()),
            (regex::Regex::new(r"sk_live_[a-zA-Z0-9]{24,}").unwrap(), "[REDACTED-STRIPE-KEY]".to_string()),
            (regex::Regex::new(r"xox[bpsa]-[a-zA-Z0-9-]{10,}").unwrap(), "[REDACTED-SLACK-TOKEN]".to_string()),
            (regex::Regex::new(r"ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*").unwrap(), "[REDACTED-JWT]".to_string()),
            (regex::Regex::new(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b").unwrap(), "[REDACTED-AWS-KEY]".to_string()),

            // Basic PII
            (regex::Regex::new(r"\b\d{3}-\d{2}-\d{4}\b").unwrap(), "[REDACTED-SSN]".to_string()),
            (regex::Regex::new(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b").unwrap(), "[REDACTED-CPF]".to_string()),
            (regex::Regex::new(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b").unwrap(), "[REDACTED-CNPJ]".to_string()),
            (regex::Regex::new(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b").unwrap(), "[REDACTED-FINANCIAL]".to_string()),
            (regex::Regex::new(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b").unwrap(), "[REDACTED-CARD]".to_string()),
            (regex::Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap(), "[REDACTED-EMAIL]".to_string()),
            (regex::Regex::new(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}?\)?[-.\s]?\d{3,4}[-.\s]?\d{4,6}\b").unwrap(), "[REDACTED-PHONE]".to_string()),
            
            // Defensive PII (Spaced)
            (regex::Regex::new(r"\b(\d\s*){3}\.?\s*(\d\s*){3}\.?\s*(\d\s*){3}-?\s*(\d\s*){2}\b").unwrap(), "[REDACTED-CPF-SPACED]".to_string()),
            
            // Generic Secrets & Keys
            (regex::Regex::new(r#"(?i)\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\b\s*[=:]\s*["']?([^\s"\[\]]+)["']?"#).unwrap(), "[REDACTED-ENV]".to_string()),
            (regex::Regex::new(r#"(?i)"(?:apiKey|token|secret|password|passwd|accessToken|refreshToken)"\s*:\s*"[^"]+""#).unwrap(), "[REDACTED-JSON]".to_string()),
            (regex::Regex::new(r#"(?i)--(?:api[-_]?key|token|secret|password|passwd)\s+['"]?[^\s'"]+"#).unwrap(), "[REDACTED-CLI]".to_string()),
            (regex::Regex::new(r#"(?i)https?://[^\s]+(?:api[_-]?key|token|secret|auth|password|passwd)=[^\s&]+"#).unwrap(), "[REDACTED-URL-SECRET]".to_string()),
            (regex::Regex::new(r"\b[a-zA-Z0-9+/]{40}\b").unwrap(), "[REDACTED-GENERIC-SECRET]".to_string()),
        ];

        SecurityEngine {
            injection_patterns,
            pii_patterns,
        }
    }

    /// Scrutinizes text for adversarial prompt injection signatures.
    /// 
    /// # Arguments
    /// * `text` - Input payload to verify.
    /// 
    /// # Returns
    /// * `Some(reason)` - A declarative violation report if detected.
    /// * `None` - Text appears safe under the current security policy.
    #[napi]
    pub fn detect_injection(&self, text: String) -> Option<String> {
        if is_panic_mode() {
            return Some("PANIC: Sistema em modo de emergência".to_string());
        }

        // Normalize text to NFKC (Compatibility Decomposition then Composition)
        // This handles cases like 𝐢𝐠𝐧𝐨𝐫𝐞 -> ignore
        let normalized: String = text.nfkc().collect();

        for pattern in &self.injection_patterns {
            if pattern.is_match(&normalized) {
                return Some(format!("Injeção detectada: {}", pattern.as_str()));
            }
        }
        
        // Hardened entropy check: Sliding window
        if text.len() > 32 {
            let chars: Vec<char> = text.chars().collect();
            let window_size = 32;
            if chars.len() > window_size {
                for i in 0..=(chars.len() - window_size) {
                    let window: String = chars[i..i + window_size].iter().collect();
                    if self.calculate_entropy(window) > 4.2 {
                        return Some("Injeção detectada: Bloco de alta entropia (ofuscação/segredo)".to_string());
                    }
                }
            } else {
                if self.calculate_entropy(text) > 4.2 {
                     return Some("Injeção detectada: Conteúdo com alta entropia".to_string());
                }
            }
        }

        None
    }

    /// Orchestrates Personally Identifiable Information (PII) redaction.
    /// 
    /// # Arguments
    /// * `text` - Raw input containing potentially sensitive data.
    /// 
    /// # Returns
    /// * A sanitized string where PII tokens are replaced with redaction placeholders.
    #[napi]
    pub fn redact_pii(&self, text: String) -> String {
        if is_panic_mode() {
            return "[PANIC: REDACTED]".to_string();
        }
        let mut result = text;
        for (pattern, replacement) in &self.pii_patterns {
            result = pattern.replace_all(&result, replacement.as_str()).to_string();
        }
        result
    }

    /// Computes the Shannon Entropy of a string segment.
    /// 
    /// [PT] Calcula a Entropia de Shannon de um segmento de string.
    /// 
    /// Utilized for identifying highly entropic blocks characteristic of encrypted keys, 
    /// base64 payloads, or other obfuscation techniques.
    /// 
    /// # Arguments
    /// * `text` - Payload for entropy quantification.
    /// 
    /// # Returns
    /// * Entropy value (0.0 - 8.0+). Values above ~4.2 often indicate non-natural text.
    #[napi]
    pub fn calculate_entropy(&self, text: String) -> f64 {
        if text.is_empty() {
            return 0.0;
        }
        let mut frequencies = std::collections::HashMap::new();
        for c in text.chars() {
            *frequencies.entry(c).or_insert(0) += 1;
        }
        let len = text.chars().count() as f64;
        let mut entropy = 0.0;
        for &count in frequencies.values() {
            let p = count as f64 / len;
            entropy -= p * p.log2();
        }
        entropy
    }
}

