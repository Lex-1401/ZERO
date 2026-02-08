import { html, nothing } from "lit";

import { clampText } from "../format";
import { icons } from "../icons";
import type { SkillStatusEntry, SkillStatusReport } from "../types";
import type { SkillMessageMap } from "../controllers/skills";
import { t } from "../i18n";

export type SkillsProps = {
    loading: boolean;
    report: SkillStatusReport | null;
    error: string | null;
    filter: string;
    edits: Record<string, string>;
    busyKey: string | null;
    messages: SkillMessageMap;
    activeTab: "installed" | "marketplace";
    marketplaceSkills: Array<{ name: string; description: string; link: string }>;
    onTabChange: (tab: "installed" | "marketplace") => void;
    onFilterChange: (next: string) => void;
    onRefresh: () => void;
    onToggle: (skillKey: string, enabled: boolean) => void;
    onEdit: (skillKey: string, value: string) => void;
    onSaveKey: (skillKey: string) => void;
    onInstall: (skillKey: string, name: string, installId: string) => void;
};

export function renderSkills(props: SkillsProps) {
    const skills = props.report?.skills ?? [];
    const filter = props.filter.trim().toLowerCase();
    const filtered = filter
        ? skills.filter((skill) =>
            [skill.name, skill.description, skill.source]
                .join(" ")
                .toLowerCase()
                .includes(filter),
        )
        : skills;

    return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div class="segmented-control">
                <button class="segmented-control__btn ${props.activeTab === "installed" ? "active" : ""}" @click=${() => props.onTabChange("installed")}>${t("skills.installed")}</button>
                <button class="segmented-control__btn ${props.activeTab === "marketplace" ? "active" : ""}" @click=${() => props.onTabChange("marketplace")}>${t("skills.marketplace")}</button>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <div class="sidebar-search" style="margin: 0; padding: 0; min-width: 240px; height: 32px;">
                    <input class="input-native" style="width: 100%; height: 100%;" type="text" placeholder="${t("skills.filter")}" .value=${props.filter} @input=${(e: Event) => props.onFilterChange((e.target as HTMLInputElement).value)} />
                </div>
                <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
                    ${icons.rotateCcw} ${props.loading ? t("skills.syncing") : t("skills.sync")}
                </button>
            </div>
        </div>

        ${props.error ? html`
            <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px; margin-bottom: 24px;">
                <div style="color: var(--danger); font-size: 12px; font-weight: 700;">${t("skills.error.title")}</div>
                <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${props.error}</div>
            </div>
        ` : nothing}

        ${props.activeTab === "installed" ? html`
            <div class="section-title">${t("skills.installed.title")}</div>
            <div class="group-list">
                ${filtered.length === 0 ? html`
                    <div class="group-item" style="padding: 60px; justify-content: center; align-items: center; flex-direction: column; color: var(--text-dim); gap: 12px;">
                        <div style="transform: scale(1.5); opacity: 0.5;">${icons.zap}</div>
                        <div>${t("skills.installed.none")}</div>
                    </div>
                ` : filtered.map(skill => renderSkill(skill, props))}
            </div>
        ` : renderMarketplace(props)}
    </div>
  `;
}

function renderMarketplace(props: SkillsProps) {
    const marketplace = props.marketplaceSkills.length > 0 ? props.marketplaceSkills : [
        {
            name: "🌐 Navegação Stealth",
            description: "Navegue pela web sem ser detectado. Ideal para extração de dados e automações complexas que exigem discrição.",
            link: "https://www.clawhub.com/skills/stealthy-auto-browse",
            command: "npx clawhub@latest install stealthy-auto-browse"
        },
        {
            name: "🇧🇷 Trello Pro",
            description: "Organize seus projetos. Gerencie quadros, listas e cartões do Trello com comandos de linguagem natural em Português.",
            link: "https://www.clawhub.com/skills/trello-skill",
            command: "npx clawhub@latest install trello-skill"
        },
        {
            name: "💬 Integração Slack",
            description: "Sua consciência no ambiente corporativo. Envie mensagens, monitore mensagens e interaja com canais do Slack.",
            link: "https://github.com/openclaw/skills/tree/main/skills/slack",
            command: "npx clawhub@latest install slack-skill"
        },
        {
            name: "🔍 Pesquisa Brave",
            description: "Acesse a internet em tempo real. Pesquisas precisas e atualizadas usando o motor do Brave Search.",
            link: "https://github.com/openclaw/skills/tree/main/skills/brave-search",
            command: "npx clawhub@latest install brave-search"
        },
        {
            name: "🐳 Docker Control",
            description: "Gerencie seu ambiente de desenvolvimento. Liste, inicie e pare containers Docker diretamente pela interface do ZERO.",
            link: "https://github.com/openclaw/skills/tree/main/skills/docker",
            command: "npx clawhub@latest install docker"
        },
        {
            name: "🎨 Design de Frontend",
            description: "Crie interfaces modernas. Assistente especializado em React, Tailwind e componentes UI de alta qualidade.",
            link: "https://github.com/openclaw/skills/tree/main/skills/frontend-design",
            command: "npx clawhub@latest install frontend-design"
        }
    ];

    return html`
    <div class="section-title">${t("skills.marketplace.title")}</div>
    <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 20px; padding: 0 4px;">
        ${t("skills.marketplace.hint")}
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${marketplace.map(item => html`
            <div class="group-list" style="margin: 0; display: flex; flex-direction: column; height: 100%; border-radius: 12px; transition: transform 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <div class="group-item" style="flex: 1; flex-direction: column; align-items: start; border-bottom: none; gap: 8px; padding: 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: var(--accent-blue);">${item.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">${item.description}</div>
                </div>
                <div class="group-item" style="background: rgba(255,255,255,0.03); padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn--sm" style="width: 100%; font-size: 10px; font-family: monospace; background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle);" 
                            @click=${() => { navigator.clipboard.writeText((item as any).command); alert('Comando copiado! Cole no seu terminal para instalar.'); }}>
                            ${t("skills.marketplace.copy")}
                        </button>
                        <a href=${item.link} target="_blank" class="btn btn--sm primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            ${icons.externalLink} ${t("skills.marketplace.learn")}
                        </a>
                    </div>
                </div>
            </div>
        `)}
    </div>
  `;
}

function renderSkill(skill: SkillStatusEntry, props: SkillsProps) {
    const busy = props.busyKey === skill.skillKey;
    const apiKey = props.edits[skill.skillKey] ?? "";
    const message = props.messages[skill.skillKey] ?? null;
    const canInstall = skill.install.length > 0 && skill.missing.bins.length > 0;

    return html`
    <div class="group-item">
      <div class="group-label">
        <div class="group-title" style="display: flex; align-items: center; gap: 8px;">
            ${skill.emoji ? html`<span>${skill.emoji}</span>` : html`<div class="status-orb ${skill.eligible && !skill.disabled ? "success" : "danger"}"></div>`}
            ${skill.name}
        </div>
        <div class="group-desc">${clampText(skill.description, 120)}</div>
        <div style="display: flex; gap: 4px; margin-top: 8px;">
            <span class="badge">${skill.source}</span>
            <span class="badge ${skill.eligible ? "active" : "danger"}">${skill.eligible ? t("skills.eligible" as any) : t("skills.incompatible" as any)}</span>
            ${skill.disabled ? html`<span class="badge danger">${t("skills.status.disabled" as any)}</span>` : nothing}
        </div>
      </div>
      <div class="group-content" style="flex-direction: column; align-items: flex-end; gap: 8px; width: 100%;">
        <div class="skill-actions">
            ${skill.primaryEnv ? html`
                <input class="input-native" type="password" style="width: 140px; height: 24px;" placeholder="API Key" .value=${apiKey} @input=${(e: Event) => props.onEdit(skill.skillKey, (e.target as HTMLInputElement).value)} />
                <button class="btn btn--sm primary" ?disabled=${busy || !apiKey} @click=${() => props.onSaveKey(skill.skillKey)}>${t("skills.save" as any)}</button>
            ` : nothing}
            <button class="btn btn--sm" ?disabled=${busy} @click=${() => props.onToggle(skill.skillKey, skill.disabled)}>${skill.disabled ? t("skills.activate" as any) : t("skills.deactivate" as any)}</button>
            ${canInstall ? html`<button class="btn btn--sm primary" ?disabled=${busy} @click=${() => props.onInstall(skill.skillKey, skill.name, skill.install[0].id)}>${busy ? t("skills.installing" as any) : skill.install[0].label}</button>` : nothing}
        </div>
        ${message ? html`<div style="font-size: 11px; color: ${message.kind === "error" ? "var(--danger)" : "var(--success)"};">${message.message}</div>` : nothing}
      </div>
    </div>
  `;
}
