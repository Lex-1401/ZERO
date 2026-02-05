import { html, nothing } from "lit";
import type { ConfigUiHints } from "../types";
import { analyzeConfigSchema, renderConfigForm, SECTION_META } from "./config-form";
import {
  hintForPath,
  humanize,
  schemaType,
  type JsonSchema,
} from "./config-form.shared";
import { icons } from "../icons";
import { t } from "../i18n";

export type ConfigProps = {
  raw: string;
  originalRaw: string;
  valid: boolean | null;
  issues: unknown[];
  loading: boolean;
  saving: boolean;
  applying: boolean;
  updating: boolean;
  connected: boolean;
  schema: unknown | null;
  schemaLoading: boolean;
  uiHints: ConfigUiHints;
  formMode: "form" | "raw";
  formValue: Record<string, unknown> | null;
  originalValue: Record<string, unknown> | null;
  searchQuery: string;
  activeSection: string | null;
  activeSubsection: string | null;
  onRawChange: (next: string) => void;
  onFormModeChange: (mode: "form" | "raw") => void;
  onFormPatch: (path: Array<string | number>, value: unknown) => void;
  onSearchChange: (query: string) => void;
  onSectionChange: (section: string | null) => void;
  onSubsectionChange: (section: string | null) => void;
  onReload: () => void;
  onSave: () => void;
  onApply: () => void;
  onUpdate: () => void;
  theme: string;
  language: string;
  onThemeChange: (theme: any) => void;
  onLanguageChange: (lang: any) => void;
};

// SVG Icons for sidebar (Lucide-style)
const sidebarIcons = {
  all: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  env: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
  update: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  agents: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path><circle cx="8" cy="14" r="1"></circle><circle cx="16" cy="14" r="1"></circle></svg>`,
  auth: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  channels: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  messages: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  commands: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`,
  hooks: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
  skills: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  tools: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
  gateway: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  wizard: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 4V2"></path><path d="M15 16v-2"></path><path d="M8 9h2"></path><path d="M20 9h2"></path><path d="M17.8 11.8 19 13"></path><path d="M15 9h0"></path><path d="M17.8 6.2 19 5"></path><path d="m3 21 9-9"></path><path d="M12.2 6.2 11 5"></path></svg>`,
  // Additional sections
  meta: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`,
  logging: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  browser: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line></svg>`,
  ui: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  models: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  bindings: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`,
  gitMerge: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>`,
  broadcast: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path><circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path></svg>`,
  audio: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
  session: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  cron: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  web: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  discovery: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  canvasHost: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
  talk: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
  plugins: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v6"></path><path d="m4.93 10.93 4.24 4.24"></path><path d="M2 12h6"></path><path d="m4.93 13.07 4.24-4.24"></path><path d="M12 22v-6"></path><path d="m19.07 13.07-4.24-4.24"></path><path d="M22 12h-6"></path><path d="m19.07 10.93-4.24 4.24"></path></svg>`,
  default: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
};

// Section definitions
const SECTIONS: Array<{ key: string; label: string }> = [
  { key: "env", label: "Ambiente" },
  { key: "update", label: "Atualizações" },
  { key: "agents", label: "Agentes" },
  { key: "models", label: "Modelos" },
  { key: "auth", label: "Autenticação" },
  { key: "channels", label: "Canais" },
  { key: "messages", label: "Mensagens" },
  { key: "commands", label: "Comandos" },
  { key: "hooks", label: "Hooks" },
  { key: "skills", label: "Habilidades" },
  { key: "tools", label: "Ferramentas" },
  { key: "gateway", label: "Gateway" },
  { key: "wizard", label: "Assistente de Configuração" },
];

type SubsectionEntry = {
  key: string;
  label: string;
  description?: string;
  order: number;
};

const ALL_SUBSECTION = "__all__";

function getSectionIcon(key: string) {
  if (key === "appearance") return icons.zap; // Ou um ícone de paleta se disponível
  return sidebarIcons[key as keyof typeof sidebarIcons] ?? sidebarIcons.default;
}

function resolveSectionMeta(key: string, schema?: JsonSchema): {
  label: string;
  description?: string;
} {
  const meta = SECTION_META[key];
  if (meta) return meta;
  return {
    label: schema?.title ?? humanize(key),
    description: schema?.description ?? "",
  };
}

function resolveSubsections(params: {
  key: string;
  schema: JsonSchema | undefined;
  uiHints: ConfigUiHints;
}): SubsectionEntry[] {
  const { key, schema, uiHints } = params;
  if (!schema || schemaType(schema) !== "object" || !schema.properties) return [];
  const entries = Object.entries(schema.properties).map(([subKey, node]) => {
    const hint = hintForPath([key, subKey], uiHints);
    const label = hint?.label ?? node.title ?? humanize(subKey);
    const description = hint?.help ?? node.description ?? "";
    const order = hint?.order ?? 50;
    return { key: subKey, label, description, order };
  });
  entries.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.key.localeCompare(b.key)));
  return entries;
}

function computeDiff(
  original: Record<string, unknown> | null,
  current: Record<string, unknown> | null
): Array<{ path: string; from: unknown; to: unknown }> {
  if (!original || !current) return [];
  const changes: Array<{ path: string; from: unknown; to: unknown }> = [];

  function compare(orig: unknown, curr: unknown, path: string) {
    if (orig === curr) return;
    if (typeof orig !== typeof curr) {
      changes.push({ path, from: orig, to: curr });
      return;
    }
    if (typeof orig !== "object" || orig === null || curr === null) {
      if (orig !== curr) {
        changes.push({ path, from: orig, to: curr });
      }
      return;
    }
    if (Array.isArray(orig) && Array.isArray(curr)) {
      if (JSON.stringify(orig) !== JSON.stringify(curr)) {
        changes.push({ path, from: orig, to: curr });
      }
      return;
    }
    const origObj = orig as Record<string, unknown>;
    const currObj = curr as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(origObj), ...Object.keys(currObj)]);
    for (const key of allKeys) {
      compare(origObj[key], currObj[key], path ? `${path}.${key}` : key);
    }
  }

  compare(original, current, "");
  return changes;
}

function truncateValue(value: unknown, maxLen = 40): string {
  let str: string;
  try {
    const json = JSON.stringify(value);
    str = json ?? String(value);
  } catch {
    str = String(value);
  }
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function renderConfig(props: ConfigProps) {
  const translations = {
    valid: "válido",
    invalid: "inválido",
    unknown: "desconhecido"
  };
  const validityRaw = props.valid == null ? "unknown" : props.valid ? "valid" : "invalid";
  const validity = translations[validityRaw as keyof typeof translations];

  const analysis = analyzeConfigSchema(props.schema);
  const formUnsafe = analysis.schema
    ? analysis.unsupportedPaths.length > 0
    : false;

  const schemaProps = analysis.schema?.properties ?? {};
  const availableSections = SECTIONS.filter(s => s.key in schemaProps);

  const knownKeys = new Set(SECTIONS.map(s => s.key));
  const extraSections = Object.keys(schemaProps)
    .filter(k => !knownKeys.has(k))
    .map(k => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }));

  const allSections = [
    { key: "appearance", label: t("settings.appearance") },
    ...availableSections,
    ...extraSections
  ];

  const activeSectionSchema =
    props.activeSection && analysis.schema && schemaType(analysis.schema) === "object"
      ? (analysis.schema.properties?.[props.activeSection] as JsonSchema | undefined)
      : undefined;
  const activeSectionMeta = props.activeSection
    ? resolveSectionMeta(props.activeSection, activeSectionSchema)
    : null;
  const subsections = props.activeSection
    ? resolveSubsections({
      key: props.activeSection,
      schema: activeSectionSchema,
      uiHints: props.uiHints,
    })
    : [];
  const allowSubnav =
    props.formMode === "form" &&
    Boolean(props.activeSection) &&
    subsections.length > 0;
  const isAllSubsection = props.activeSubsection === ALL_SUBSECTION;
  const effectiveSubsection = props.searchQuery
    ? null
    : isAllSubsection
      ? null
      : props.activeSubsection ?? (subsections[0]?.key ?? (props.activeSection === "appearance" ? "visual" : null));

  const diff = props.formMode === "form"
    ? computeDiff(props.originalValue, props.formValue)
    : [];
  const hasRawChanges = props.formMode === "raw" && props.raw !== props.originalRaw;
  const hasChanges = props.formMode === "form" ? diff.length > 0 : hasRawChanges;

  const canSaveForm =
    Boolean(props.formValue) && !props.loading && Boolean(analysis.schema);
  const canSave =
    props.connected &&
    !props.saving &&
    hasChanges &&
    (props.formMode === "raw" ? true : canSaveForm);
  const canApply =
    props.connected &&
    !props.applying &&
    !props.updating &&
    hasChanges &&
    (props.formMode === "raw" ? true : canSaveForm);
  const canUpdate = props.connected && !props.applying && !props.updating;

  const renderAppearance = () => html`
    <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Seção de Tema -->
        <div class="config-section-card">
            <div class="config-section-card__header">
                <div class="config-section-hero__icon">${icons.sun}</div>
                <div class="group-label">
                    <div class="group-title">${t("settings.theme")}</div>
                    <div class="group-desc">Escolha como a interface do ZERO deve se comportar visualmente.</div>
                </div>
            </div>
            <div style="padding: 16px;">
                <div class="appearance-grid" style="justify-content: space-between;">
                    <div class="theme-picker" data-active="${props.theme}">
                        <button class="theme-picker__btn ${props.theme === "system" ? "active" : ""}" title="${t("settings.theme.system")}" @click=${() => props.onThemeChange("system")}>${icons.monitor}</button>
                        <button class="theme-picker__btn ${props.theme === "light" ? "active" : ""}" title="${t("settings.theme.light")}" @click=${() => props.onThemeChange("light")}>${icons.sun}</button>
                        <button class="theme-picker__btn ${props.theme === "dark" ? "active" : ""}" title="${t("settings.theme.dark")}" @click=${() => props.onThemeChange("dark")}>${icons.moon}</button>
                        <div class="theme-picker__indicator"></div>
                    </div>
                    <div style="font-size: 13px; color: var(--text-muted); font-weight: 500; opacity: 0.8;">
                        ${props.theme === "system" ? t("settings.theme.system") : props.theme === "light" ? t("settings.theme.light") : t("settings.theme.dark")}
                    </div>
                </div>
            </div>
        </div>

        <!-- Seção de Idioma -->
        <div class="config-section-card">
            <div class="config-section-card__header">
                <div class="config-section-hero__icon">${icons.globe}</div>
                <div class="group-label">
                    <div class="group-title">${t("settings.language")}</div>
                    <div class="group-desc">Altere o idioma global da interface e das interações do sistema.</div>
                </div>
            </div>
            <div style="padding: 16px;">
                <div class="appearance-grid">
                    <button class="lang-card ${props.language === "pt-BR" ? "active" : ""}" @click=${() => props.onLanguageChange("pt-BR")}>
                        <span class="lang-card__flag">🇧🇷</span>
                        <div class="lang-card__info">
                            <div class="lang-card__name">Português</div>
                            <div class="lang-card__region">Brasil</div>
                        </div>
                    </button>
                    <button class="lang-card ${props.language === "en-US" ? "active" : ""}" @click=${() => props.onLanguageChange("en-US")}>
                        <span class="lang-card__flag">🇺🇸</span>
                        <div class="lang-card__info">
                            <div class="lang-card__name">English</div>
                            <div class="lang-card__region">United States</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
  `;

  return html`
    <div class="config-layout animate-fade-in">
      
      <!-- Settings Sidebar -->
      <aside class="config-sidebar">
        <div class="config-search">
            <div class="config-search__icon">${icons.search}</div>
            <input class="config-search__input" type="text" placeholder="Buscar ajustes…" .value=${props.searchQuery} @input=${(e: Event) => props.onSearchChange((e.target as HTMLInputElement).value)} />
        </div>

        <nav class="config-nav">
          <button
            class="config-nav__item ${props.activeSection === null ? "active" : ""}"
            @click=${() => props.onSectionChange(null)}
          >
            <span class="config-nav__icon">${sidebarIcons.all}</span>
            <span>Visão Geral</span>
          </button>
          
          <div class="section-title" style="margin-top: 16px; margin-bottom: 8px;">Configurações</div>
          
          ${allSections.map(section => html`
            <button
              class="config-nav__item ${props.activeSection === section.key ? "active" : ""}"
              @click=${() => props.onSectionChange(section.key)}
            >
              <span class="config-nav__icon">${getSectionIcon(section.key)}</span>
              <span>${section.label}</span>
            </button>
          `)}
        </nav>

        <div class="config-sidebar__footer">
            <div class="config-mode-toggle">
                <button class="config-mode-toggle__btn ${props.formMode === "form" ? "active" : ""}" ?disabled=${props.schemaLoading || !props.schema} @click=${() => props.onFormModeChange("form")}>Padrão</button>
                <button class="config-mode-toggle__btn ${props.formMode === "raw" ? "active" : ""}" @click=${() => props.onFormModeChange("raw")}>JSON</button>
            </div>
        </div>
      </aside>

      <!-- Main Config Area -->
      <main class="config-main">
        
        <!-- Action Bar -->
        <div class="config-actions">
             <div class="config-actions__left">
                ${hasChanges ? html`
                    <div class="config-changes-badge animate-fade-in">
                        ${props.formMode === "raw" ? "Edição Manual" : `${diff.length} alteraç${diff.length !== 1 ? "ões" : "ão"}`}
                    </div>
                ` : html`
                    <div class="badge muted">Sincronizado</div>
                `}
                
                ${props.issues.length > 0 ? html`
                    <div class="badge danger animate-fade-in">
                        ${props.issues.length} Erro${props.issues.length !== 1 ? "s" : ""}
                    </div>
                ` : nothing}
             </div>

             <div class="config-actions__right">
                 <button class="btn" title="Descartar alterações e recarregar" ?disabled=${props.loading} @click=${props.onReload}>Reverter</button>
                 <button class="btn primary" ?disabled=${!canSave} @click=${props.onSave}>${props.saving ? "Salvando…" : "Salvar"}</button>
                 <button class="btn" ?disabled=${!canApply} @click=${props.onApply}>${props.applying ? "Aplicando…" : "Aplicar"}</button>
                 <button class="btn btn--icon" title="Atualizar via upstream" ?disabled=${!canUpdate} @click=${props.onUpdate}>${icons.gitMerge}</button>
             </div>
        </div>

        <!-- Scrollable Content -->
        <div class="config-content">
            
            ${hasChanges && props.formMode === "form" ? html`
                <div class="config-diff animate-fade-in" style="margin: 0 0 24px 0;">
                    <div class="config-diff__summary" style="padding: 10px 16px; background: rgba(255, 68, 68, 0.1);">
                        Alterações Pendentes
                    </div>
                    <div style="padding: 8px;">
                        ${diff.map(change => html`
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; font-size: 11px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <div style="font-family: var(--font-mono); color: var(--text-dim);">${change.path}</div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="color: var(--danger); text-decoration: line-through; opacity: 0.6;">${truncateValue(change.from)}</span>
                                    <span style="color: var(--text-dim); transform: scale(0.8);">${icons.arrowRight}</span>
                                    <span style="color: var(--accent-blue); font-weight: 600;">${truncateValue(change.to)}</span>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
            ` : nothing}

            ${activeSectionMeta && props.formMode === "form" && props.activeSection !== "appearance" ? html`
                <div class="config-section-hero" style="margin: -24px -24px 24px -24px;">
                    <div class="config-section-hero__icon">
                        ${getSectionIcon(props.activeSection ?? "")}
                    </div>
                    <div>
                        <h2 class="config-section-hero__title">${activeSectionMeta.label}</h2>
                        ${activeSectionMeta.description ? html`<p class="config-section-hero__desc" style="font-size: 11px; color: var(--text-muted); opacity: 0.8;">${activeSectionMeta.description}</p>` : nothing}
                    </div>
                </div>
            ` : nothing}

            ${props.formMode === "form" ? html`
                ${props.schemaLoading ? html`
                    <div style="padding: 80px; text-align: center; color: var(--text-dim);">
                        <div class="animate-spin" style="display: inline-block; margin-bottom: 12px; opacity: 0.5;">${icons.loader}</div>
                        <div style="font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase;">Carregando definições…</div>
                    </div>
                ` : props.activeSection === "appearance" ? renderAppearance() : renderConfigForm({
    schema: analysis.schema,
    uiHints: props.uiHints,
    value: props.formValue,
    disabled: props.loading || !props.formValue,
    unsupportedPaths: analysis.unsupportedPaths,
    onPatch: props.onFormPatch,
    searchQuery: props.searchQuery,
    activeSection: props.activeSection,
    activeSubsection: effectiveSubsection,
  })}
            ` : html`
                <div class="config-section-card" style="height: calc(100% - 4px); margin: 0;">
                    <textarea class="code-block" style="width: 100%; height: 100%; border: none; resize: none; background: transparent; padding: 24px; font-size: 12px; line-height: 1.6;" .value=${props.raw} @input=${(e: Event) => props.onRawChange((e.target as HTMLTextAreaElement).value)}></textarea>
                </div>
            `}

            ${props.issues.length > 0 ? html`
                <div class="group-list" style="margin-top: 32px; border-color: var(--danger); background: rgba(255, 59, 48, 0.03);">
                    <div class="group-item" style="border-bottom: 1px solid rgba(255, 59, 48, 0.1);">
                        <div class="group-title" style="color: var(--danger); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Diagnóstico Crítico</div>
                    </div>
                    <div style="padding: 16px;">
                        <pre class="code-block" style="background: transparent; border: none; padding: 0; color: var(--danger); font-size: 11px; opacity: 0.8;">${JSON.stringify(props.issues, null, 2)}</pre>
                    </div>
                </div>
            ` : nothing}

        </div>

      </main>
    </div>
  `;
}
