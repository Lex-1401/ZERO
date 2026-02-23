import { html, nothing } from "lit";
import { icons } from "../icons";
import { t } from "../i18n";

/**
 * Renders the Setup/Onboarding view with a 'Altair' premium executive aesthetic.
 */
export interface SetupRecommendation {
    type: string;
    title: string;
    description: string;
    reason: string;
}

export function renderSetup(props: {
    recommendations: SetupRecommendation[];
    loading: boolean;
    step: "scan" | "persona";
    onApply: () => void;
    onSkip: () => void;
    onPersonaSelect: (id: string) => void;
}) {
    if (props.loading) {
        return html`
            <div style="position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-main); z-index: 9999;">
                <div style="width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, var(--accent-magenta), var(--accent-orange)); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 40px rgba(255, 45, 85, 0.4); margin-bottom: 32px;">
                    <div class="animate-spin" style="color: white; transform: scale(1.2);">${icons.loader}</div>
                </div>
                <h2 style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">${t("setup.loading.title" as any)}</h2>
                <p style="font-size: 13px; color: var(--text-muted);">${t("setup.loading.desc" as any)}</p>
            </div>
        `;
    }

    if (props.step === "persona") {
        return html`
            <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--bg-main); z-index: 9999; padding: 40px;">
                <div style="max-width: 900px; width: 100%; display: grid; grid-template-columns: 1fr 1.5fr; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 20px; box-shadow: var(--shadow-deep); overflow: hidden;">
                    
                    <!-- Sidebar -->
                    <div style="background: var(--bg-surface-2); padding: 40px; display: flex; flex-direction: column; justify-content: space-between;">
                         <div>
                            <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--text-main); color: var(--bg-main); display: flex; align-items: center; justify-content: center; margin-bottom: 32px;">
                                ${icons.user}
                            </div>
                            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 12px; letter-spacing: -0.02em;">${t("setup.persona.title" as any)}</h1>
                            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
                                ${t("setup.persona.desc" as any)}
                            </p>
                         </div>
                         <button class="btn ghost" style="justify-content: flex-start; padding-left: 0;" @click=${props.onSkip}>${t("setup.persona.skip" as any)}</button>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px; overflow-y: auto;">
                        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                              ${[
                {
                    id: "dev",
                    name: t("setup.persona.dev.name" as any),
                    desc: t("setup.persona.dev.desc" as any),
                    icon: "fileCode",
                    color: "var(--accent-cyan)"
                },
                {
                    id: "copy",
                    name: t("setup.persona.copy.name" as any),
                    desc: t("setup.persona.copy.desc" as any),
                    icon: "edit",
                    color: "var(--accent-purple)"
                },
                {
                    id: "research",
                    name: t("setup.persona.research.name" as any),
                    desc: t("setup.persona.research.desc" as any),
                    icon: "search",
                    color: "var(--accent-orange)"
                },
                {
                    id: "general",
                    name: t("setup.persona.general.name" as any),
                    desc: t("setup.persona.general.desc" as any),
                    icon: "checkSquare",
                    color: "var(--accent-green)"
                }
            ].map(p => html`
                                <div class="group-item" style="cursor: pointer; padding: 20px; transition: transform 0.2s; border: 1px solid var(--border-subtle); border-radius: 12px;" 
                                     @mouseenter=${(e: Event) => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-blue)"}
                                     @mouseleave=${(e: Event) => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"}
                                     @click=${() => props.onPersonaSelect(p.id)}
                                >
                                    <div style="display: flex; gap: 16px; align-items: center; width: 100%;">
                                        <div style="width: 40px; height: 40px; border-radius: 10px; background: ${p.color}; opacity: 0.1; position: absolute;"></div>
                                        <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: ${p.color}; z-index: 1;">
                                            ${(icons as any)[p.icon] || icons.user}
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-size: 15px; font-weight: 600; color: var(--text-main);">${p.name}</div>
                                            <div style="font-size: 13px; color: var(--text-muted);">${p.desc}</div>
                                        </div>
                                        <div style="color: var(--text-dim);">${icons.arrowRight}</div>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--bg-main); z-index: 9999; padding: 40px;">
            <div style="max-width: 900px; width: 100%; display: grid; grid-template-columns: 1fr 1.5fr; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 20px; box-shadow: var(--shadow-deep); overflow: hidden;">
                
                <!-- Sidebar -->
                <div style="background: var(--bg-surface-2); padding: 40px; display: flex; flex-direction: column; justify-content: space-between;">
                     <div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--text-main); color: var(--bg-main); display: flex; align-items: center; justify-content: center; margin-bottom: 32px;">
                            ${icons.sliders}
                        </div>
                        <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 12px; letter-spacing: -0.02em;">${t("setup.hardware.title" as any)}</h1>
                        <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
                            ${t("setup.hardware.desc" as any)}
                        </p>
                     </div>
                     <div style="display:flex; flex-direction: column; gap: 8px;">
                        <button class="btn primary" style="width: 100%; justify-content: center; height: 40px; font-weight: 600;" @click=${props.onApply}>${t("setup.hardware.apply" as any)}</button>
                        <button class="btn ghost" style="width: 100%; justify-content: center;" @click=${props.onSkip}>${t("setup.hardware.skip" as any)}</button>
                     </div>
                </div>

                <!-- Content -->
                <div style="padding: 40px; overflow-y: auto;">
                    ${props.recommendations.length > 0 ? html`
                        <div class="group-list">
                            ${props.recommendations.map((r: SetupRecommendation) => html`
                                <div class="group-item" style="padding: 20px; flex-direction: column; align-items: flex-start; gap: 12px;">
                                    <div style="display: flex; gap: 12px; justify-content: space-between; width: 100%;">
                                        <div style="display: flex; gap: 12px; align-items: center;">
                                            <div style="color: ${getIconColor(r.type)};">${(icons as Record<string, unknown>)[getIconNameForType(r.type)] || icons.settings}</div>
                                            <div style="font-weight: 600; font-size: 14px; color: var(--text-main);">${r.title}</div>
                                        </div>
                                        <div class="badge active">${t("setup.hardware.recommended" as any)}</div>
                                    </div>
                                    <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">${r.description}</div>
                                    <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); background: rgba(0,0,0,0.2); padding: 6px 8px; border-radius: 6px; width: 100%;">
                                        ${t("setup.hardware.diagnosis" as any, { reason: r.reason })}
                                    </div>
                                </div>
                            `)}
                        </div>
                    ` : html`
                         <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted);">
                            <div style="font-size: 40px; margin-bottom: 16px; opacity: 0.2;">${icons.checkCircle}</div>
                            <div style="font-weight: 600;">${t("setup.hardware.nominal" as any)}</div>
                            <div style="font-size: 13px; margin-top: 4px;">${t("setup.hardware.none" as any)}</div>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function getIconNameForType(type: string): string {
    if (type === 'security') return 'shieldCheck';
    if (type === 'performance') return 'bolt';
    if (type === 'location') return 'globe';
    return 'settings';
}

function getIconColor(type: string): string {
    if (type === 'security') return 'var(--accent-cyan)';
    if (type === 'performance') return 'var(--accent-orange)';
    if (type === 'location') return 'var(--success)';
    return 'var(--text-muted)';
}
