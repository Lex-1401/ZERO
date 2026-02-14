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
use std::time::{SystemTime, UNIX_EPOCH, Instant};
use unicode_normalization::UnicodeNormalization;
use once_cell::sync::Lazy;
use regex::RegexSet;

/// Global emergency state flag.
static PANIC_MODE: AtomicBool = AtomicBool::new(false);

/// Internal secret hash to prevent string intern attacks or simple memory dumping (Simulated).
/// In a real scenario, this should be a salted hash comparison.
const INTERNAL_SECRET: &str = "INTERNAL_EMERGENCY_2024";

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
    // SECURITY: Constant-time comparison to prevent timing attacks.
    if constant_time_eq(&secret, INTERNAL_SECRET) {
        PANIC_MODE.store(true, Ordering::SeqCst);
    }
}

/// Deactivates panic mode, restoring the core to its operational state.
#[napi]
pub fn reset_panic() {
    PANIC_MODE.store(false, Ordering::SeqCst);
}

/// Quantifies the current state of system urgency.
#[napi]
pub fn is_panic_mode() -> bool {
    PANIC_MODE.load(Ordering::SeqCst)
}

/// naive constant time string comparison (sufficient for this context)
fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let a_bytes = a.as_bytes();
    let b_bytes = b.as_bytes();
    let mut result = 0;
    for i in 0..a.len() {
        result |= a_bytes[i] ^ b_bytes[i];
    }
    result == 0
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
    // Use Option<Instant> for monotonic time tracking.
    // SystemTime is subject to NTP shifts and is unsafe for duration measurement.
    silence_start: Option<Instant>, 
    threshold: f64,
    silence_timeout_ms: u64,
}

#[napi]
impl VadEngine {
    /// Initializes a new VAD processor with specific acoustic sensitivity.
    #[napi(constructor)]
    pub fn new(threshold: f64, silence_timeout_ms: u32) -> Self {
        VadEngine {
            is_talking: false,
            silence_start: None,
            threshold,
            silence_timeout_ms: silence_timeout_ms as u64,
        }
    }

    /// Conducts acoustic analysis on a discrete segment of PCM audio.
    #[napi]
    pub fn process_chunk(&mut self, chunk: Vec<u8>) -> String {
        if is_panic_mode() {
            return "panic".to_string();
        }

        if chunk.is_empty() {
            return "silent".to_string();
        }

        // Optimization: Zero-cost abstraction for iteration
        let mut sum_sq = 0.0;
        let mut samples_count = 0;

        for bytes in chunk.chunks_exact(2) {
            let sample = i16::from_le_bytes([bytes[0], bytes[1]]) as f64;
            sum_sq += sample * sample;
            samples_count += 1;
        }

        if samples_count == 0 {
            return "silent".to_string();
        }
        
        let rms = (sum_sq / samples_count as f64).sqrt();

        if rms > self.threshold {
            self.silence_start = None;
            if !self.is_talking {
                self.is_talking = true;
                return "speech_start".to_string();
            }
            "talking".to_string()
        } else {
            if self.is_talking {
                match self.silence_start {
                    None => {
                        self.silence_start = Some(Instant::now());
                    },
                    Some(start) => {
                        // Safe monotonic duration check
                        if start.elapsed().as_millis() as u64 > self.silence_timeout_ms {
                            self.is_talking = false;
                            self.silence_start = None;
                            return "speech_end".to_string();
                        }
                    }
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
    pub model: String,
    pub count: f64,
}

/// Comprehensive temporal and throughput summary of system performance.
#[napi(object)]
pub struct MetricsSummary {
    pub total_tokens: f64,
    pub model_breakdown: Vec<ModelMetric>,
    pub avg_latency_ms: f64,
}

const MAX_LATENCY_SAMPLES: usize = 100;
const MAX_TRACKED_MODELS: usize = 50; // Protection against DoS

/// Orchestrator for behavioral telemetry and performance auditing.
#[napi]
pub struct MetricsEngine {
    token_counts: IndexMap<String, f64>,
    latency_samples: Vec<f64>,
    latency_idx: usize, // Manual Ring Buffer index
}

#[napi]
impl MetricsEngine {
    #[napi(constructor)]
    pub fn new() -> Self {
        MetricsEngine {
            token_counts: IndexMap::new(),
            latency_samples: Vec::with_capacity(MAX_LATENCY_SAMPLES),
            latency_idx: 0,
        }
    }

    /// Registers a token consumption event.
    #[napi]
    pub fn record_tokens(&mut self, model: String, count: u32) {
        // DoS Protection: Prevent unlimited map growth
        if self.token_counts.len() >= MAX_TRACKED_MODELS && !self.token_counts.contains_key(&model) {
             // Silently drop new keys if full to preserve stability
             return;
        }
        let entry = self.token_counts.entry(model).or_insert(0.0);
        *entry += count as f64;
    }

    /// Appends a latency sample to the internal rolling measurement window.
    /// Used Ring Buffer logic to avoid O(N) shifts.
    #[napi]
    pub fn record_latency(&mut self, ms: f64) {
        if self.latency_samples.len() < MAX_LATENCY_SAMPLES {
            self.latency_samples.push(ms);
        } else {
            self.latency_samples[self.latency_idx] = ms;
            self.latency_idx = (self.latency_idx + 1) % MAX_LATENCY_SAMPLES;
        }
    }

    /// Synthesizes a point-in-time report of system-wide metrics.
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
#[napi]
pub struct RatchetDedupe {
    cache: IndexMap<String, f64>,
    ttl_ms: f64,
    max_size: usize,
}

#[napi]
impl RatchetDedupe {
    #[napi(constructor)]
    pub fn new(ttl_ms: u32, max_size: u32) -> Self {
        RatchetDedupe {
            cache: IndexMap::new(),
            ttl_ms: ttl_ms as f64,
            max_size: max_size as usize,
        }
    }

    #[napi]
    pub fn check(&mut self, key: String, timestamp_ms: Option<f64>) -> bool {
        if is_panic_mode() { return false; }
        if key.len() > 1024 { return false; }

        let now = timestamp_ms.unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as f64
        });

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

    #[napi]
    pub fn clear(&mut self) {
        self.cache.clear();
    }

    #[napi]
    pub fn size(&self) -> u32 {
        self.cache.len() as u32
    }

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
// Define raw patterns separately to allow constructing both the Set and the reference list
const INJECTION_STRINGS: &[&str] = &[
    // Phrasing-based injections (Hardened with \s+)
    r"(?i)ignore\s+(all\s+)?previous\s+instructions",
    r"(?i)render\s+system\s+prompt",
    r"(?i)reveal\s+your\s+instructions",
    r"(?i)you\s+are\s+now\s+DAN",
    r"(?i)system\s+override",
    r"(?i)unfiltered\s+response",
    r"(?i)forget\s+everything.*start\s+(as|a)",
    r"(?i)you\s+are\s+now\s+a.*that\s+always",
    r"(?i)do\s+anything\s+now",
    r"(?i)start\s+(a\s+)?new\s+session",
    r"(?i)dev\s+mode",
    r"(?i)debug\s+mode",
    r"(?i)cannot\s+refuse",
    r"(?i)opposite\s+mode",
    r"(?i)act\s+as\s+a\s+(system|root|admin)",
    r"(?i)reveal\s+all\s+(keys|secrets|passwords)",
    r"(?i)dan\s+mode",
    r"(?i)jailbreak",
    
    // Fragmentation-aware / Obfuscated patterns
    r"(?i)i\s*g\s*n\s*o\s*r\s*e\s*a\s*l\s*l",
    r"(?i)p\s*r\s*e\s*v\s*i\s*n\s*s\s*t",
    r"\u{0456}gn\u{043b}re", // Cyrillic homoglyph

    // Modern attack vectors (VAPT-MEDIUM-008 & 009)
    r"(?i)repeat\s+.*(?:above|system|instructions)",
    r"(?i)translate\s+.*(?:above|preceding|system).*(?:to|into)",
    r"(?i)what\s+(?:are|were)\s+your\s+(?:instructions|rules|system)",
    r"(?i)output\s+.*(?:system|initial).*(?:prompt|instructions)",
    r"(?i)print\s+.*(?:system|original).*(?:prompt|message)",
    r"(?i)show\s+.*(?:hidden|system|original).*(?:prompt|instructions|text)",
    r"(?i)(?:encode|convert|base64)\s+.*(?:system|instructions|prompt)",
    r"(?i)data:text/html;base64",

    // Delimiter confusion / Context escaping
    r"(?i)\[/INST\]|\[INST\]|<<SYS>>|/SYS>>",
    r"(?i)###\s+(Instruction|Response|System):",
    r"(?i)<\|im_start\|>|<\|im_end\|>|<\|system\|>",
    r"(?i)---",

    // Tool Use / Function Calling Injections
    r"(?i)Call\s+tool:",
    r"(?i)Execute\s+command:",
    r"(?i)run_command\(.*\)",

    // Obfuscation / Encoding patterns (hardened)
    r"(?i)[a-zA-Z0-9+/]{40,}={0,2}",
    r"(?i)[0-9a-fA-F]{24,}",
    r"\\u[0-9a-fA-F]{4}",
    r"(?i)0x[0-9a-fA-F]{24,}",
    
    // Loose / Heuristic Jailbreaks
    r"(?i)(forget|disregard|ignore)\s+.*(rules|instructions|guidelines)",
    r"(?i)(tell|show|reveal)\s+.*(system|secret|prompt|internal)",
];

static INJECTION_SET: Lazy<RegexSet> = Lazy::new(|| {
    RegexSet::new(INJECTION_STRINGS).expect("CRITICAL: Failed to compile injection regex set")
});

static PII_PATTERNS: Lazy<Vec<(regex::Regex, String)>> = Lazy::new(|| {
    vec![
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
    ]
});

#[napi]
pub struct SecurityEngine {
    // Empty struct, patterns are static
}

#[napi]
impl SecurityEngine {
    #[napi(constructor)]
    pub fn new() -> Self {
        SecurityEngine {}
    }

    /// Scrutinizes text for adversarial prompt injection signatures.
    #[napi]
    #[inline]
    pub fn detect_injection(&self, text: String) -> Option<String> {
        if is_panic_mode() {
            return Some("PANIC: Sistema em modo de emergência".to_string());
        }

        let normalized: String = text.nfkc().collect();

        if let Some(index) = INJECTION_SET.matches(&normalized).iter().next() {
            let pattern = INJECTION_STRINGS.get(index).unwrap_or(&"UNKNOWN");
            return Some(format!("Injeção detectada: {}", pattern));
        }
        
        if text.len() > 32 {
            let chars: Vec<char> = text.chars().collect();
            let window_size = 32;
            // Optimization vs Correctness: 
            // Sliding window logic allocates small Strings.
            // For true high perf, we would use a specialized char iterator without alloc,
            // but this safe version is robust.
            if chars.len() > window_size {
                for i in 0..=(chars.len() - window_size) {
                    if self.calculate_entropy_slice(&chars[i..i+window_size]) > 4.2 {
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

    #[napi]
    #[inline]
    pub fn redact_pii(&self, text: String) -> String {
        if is_panic_mode() {
            return "[PANIC: REDACTED]".to_string();
        }
        let mut result = text;
        for (pattern, replacement) in PII_PATTERNS.iter() {
            result = pattern.replace_all(&result, replacement.as_str()).to_string();
        }
        result
    }

    /// Computes the Shannon Entropy of a string segment.
    #[napi]
    pub fn calculate_entropy(&self, text: String) -> f64 {
        if text.is_empty() { return 0.0; }
        // Optimize: Use chars iterator directly
        let chars: Vec<char> = text.chars().collect();
        self.calculate_entropy_slice(&chars)
    }

    fn calculate_entropy_slice(&self, chars: &[char]) -> f64 {
        if chars.is_empty() { return 0.0; }
        
        let mut frequencies = std::collections::HashMap::with_capacity(chars.len());
        for &c in chars {
            *frequencies.entry(c).or_insert(0) += 1;
        }

        let len = chars.len() as f64;
        let mut entropy = 0.0;
        for &count in frequencies.values() {
            let p = count as f64 / len;
            entropy -= p * p.log2();
        }
        
        entropy
    }
}
