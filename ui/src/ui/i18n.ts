import { ptBR } from "./i18n/pt-BR";
import { enUS } from "./i18n/en-US";

export type Language = "pt-BR" | "en-US";

export const translations = {
  "pt-BR": ptBR,
  "en-US": enUS,
};

export let currentLang: Language =
  (typeof localStorage !== "undefined" ? (localStorage.getItem("zero-lang") as Language) : null) ||
  "pt-BR";

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language) {
  currentLang = lang;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("zero-lang", lang);
  }
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

// Dicionário Dinâmico Gerado por Agentes (Persistente em tempo de execução e no localStorage)
const STORAGE_KEY = "zero-ai-i18n";

function loadPersistentTranslations() {
  if (typeof localStorage === "undefined") return {};
  const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  // Reinjetar valores no objeto translations em memória
  Object.entries(cache).forEach(([lang, keys]) => {
    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        const val = localStorage.getItem(`zero-lang-custom-${lang}-${key}`);
        if (val) {
          if (!(translations as any)[lang]) (translations as any)[lang] = {};
          (translations as any)[lang][key] = val;
        }
      });
    }
  });
  return cache;
}

const loadedCache = loadPersistentTranslations();

export const aiGeneratedTranslations: Record<string, Set<string>> = {
  "pt-BR": new Set(loadedCache["pt-BR"] || []),
  "en-US": new Set(loadedCache["en-US"] || []),
};

// Adiciona suporte a novos idiomas dinamicamente
export function injectTranslation(lang: string, key: string, value: string, isAi: boolean = false) {
  const dict = translations as any;
  if (!dict[lang]) {
    dict[lang] = {};
    if (!aiGeneratedTranslations[lang]) aiGeneratedTranslations[lang] = new Set();
  }
  dict[lang][key] = value;

  if (isAi) {
    aiGeneratedTranslations[lang].add(key);
    // Persistir no localStorage
    if (typeof localStorage !== "undefined") {
      const cache: any = {};
      Object.entries(aiGeneratedTranslations).forEach(([l, set]) => {
        cache[l] = Array.from(set);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      localStorage.setItem(`zero-lang-custom-${lang}-${key}`, value);
    }
  }
}

export function isAiTranslated(key: string, lang: string): boolean {
  return aiGeneratedTranslations[lang]?.has(key) || false;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const lang = currentLang;
  const dict = translations as any;
  let text = (dict[lang] ? dict[lang][key] : null) || dict["pt-BR"][key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
