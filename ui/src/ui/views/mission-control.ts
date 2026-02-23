import { html } from "lit";
import type { TelemetrySummary } from "../types";
import { icons } from "../icons";
import { t } from "../i18n";

export type MissionControlProps = {
    loading: boolean;
    summary: TelemetrySummary | null;
    panicActive: boolean;
    onRefresh: () => void;
    onPanic: () => void;
};

export function renderMissionControl(props: MissionControlProps) {
    const summary = props.summary;

    return html`
    <div class="mission-control animate-fade-in">
        <div class="mc-grid">
            <!-- Header Status -->
            <div class="mc-card mc-header ${props.panicActive ? 'panic' : ''}">
                <div class="mc-header__info">
                    <div class="mc-header__title">${t("mission.control.title" as any)}</div>
                    <div class="mc-header__status">
                        <span class="status-dot ${props.panicActive ? 'status-dot--danger' : 'status-dot--success'}"></span>
                        ${props.panicActive ? t("mission.control.emergency" as any) : t("mission.control.nominal" as any)}
                    </div>
                </div>
                <div class="mc-header__actions">
                    <button class="btn btn--glass" ?disabled=${props.loading} @click=${props.onRefresh}>
                        ${icons.rotateCcw} ${t("mission.control.refresh" as any)}
                    </button>
                    <button class="btn ${props.panicActive ? 'btn--success' : 'btn--danger'}" @click=${props.onPanic}>
                        ${props.panicActive ? t("mission.control.reset" as any) : t("mission.control.panic" as any)}
                    </button>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="mc-stats">
                <div class="mc-stat-card hover-lift">
                    <div class="mc-stat-card__icon">${icons.zap}</div>
                    <div class="mc-stat-card__content">
                        <div class="mc-stat-card__label">${t("mission.control.tokens" as any)}</div>
                        <div class="mc-stat-card__value">${summary?.totalTokens?.toLocaleString() ?? '0'}</div>
                    </div>
                </div>
                <div class="mc-stat-card hover-lift">
                    <div class="mc-stat-card__icon">${icons.activity}</div>
                    <div class="mc-stat-card__content">
                        <div class="mc-stat-card__label">${t("mission.control.latency" as any)}</div>
                        <div class="mc-stat-card__value">${summary?.avgLatencyMs?.toFixed(0) ?? '0'} ms</div>
                    </div>
                </div>
            </div>

            <!-- Breakdown -->
            <div class="mc-card mc-breakdown" style="min-height: 180px;">
                <div class="section-title">${t("mission.control.distribution" as any)}</div>
                <div class="mc-breakdown__list">
                    ${!summary ? html`
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${[1, 2, 3].map(() => html`
                                <div class="skeleton" style="height: 48px; border-radius: 12px; display: flex; align-items: center; padding: 0 16px; color: var(--text-dim); font-size: 11px; margin-bottom: 8px;">
                                    ${t("mission.control.waiting" as any)}
                                </div>
                            `)}
                        </div>
                    ` : summary.modelBreakdown.length === 0 ? html`
                        <div class="empty-state">${t("mission.control.empty" as any)}</div>
                    ` : summary.modelBreakdown.map(m => html`
                        <div class="mc-breakdown__item">
                            <div class="mc-model-info">
                                <span class="mc-model-name">${m.model}</span>
                                <span class="mc-model-count">${m.count.toLocaleString()} tokens</span>
                            </div>
                            <div class="mc-progress-bar">
                                <div class="mc-progress-fill" style="width: ${Math.min(100, (m.count / (summary.totalTokens || 1)) * 100)}%"></div>
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        </div>

        <style>
            .mission-control {
                padding: 24px;
                max-width: 1200px;
                margin: 0 auto;
            }
            .mc-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 24px;
            }
            .mc-card {
                background: var(--surface-glass);
                backdrop-filter: blur(12px);
                border: 1px solid var(--border-subtle);
                border-radius: 16px;
                padding: 24px;
            }
            .mc-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, rgba(var(--accent-blue-rgb), 0.1), rgba(var(--accent-purple-rgb), 0.1));
            }
            .mc-header.panic {
                background: linear-gradient(135deg, rgba(255, 59, 48, 0.2), rgba(255, 59, 48, 0.05));
                border-color: var(--danger);
            }
            .mc-header__title {
                font-size: 24px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }
            .mc-header__status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: var(--text-dim);
                margin-top: 4px;
            }
            .mc-header__actions {
                display: flex;
                gap: 12px;
            }
            .mc-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 24px;
            }
            .mc-stat-card {
                background: var(--surface-glass);
                border-radius: 16px;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                border: 1px solid var(--border-subtle);
            }
            .mc-stat-card__icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                background: rgba(var(--accent-blue-rgb), 0.1);
                color: var(--accent-blue);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mc-stat-card__label {
                font-size: 13px;
                color: var(--text-dim);
            }
            .mc-stat-card__value {
                font-size: 24px;
                font-weight: 700;
            }
            .mc-breakdown__list {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-top: 16px;
            }
            .mc-breakdown__item {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .mc-model-info {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
            }
            .mc-model-name {
                font-weight: 600;
            }
            .mc-progress-bar {
                height: 6px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
                overflow: hidden;
            }
            .mc-progress-fill {
                height: 100%;
                background: var(--accent-blue);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }
            .status-dot--success { background: #34c759; box-shadow: 0 0 8px #34c759; }
            .status-dot--danger { background: #ff3b30; box-shadow: 0 0 8px #ff3b30; }
            
            .btn--glass {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .btn--glass:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .empty-state {
                padding: 40px;
                text-align: center;
                color: var(--text-dim);
                background: rgba(255, 255, 255, 0.02);
                border: 1px dashed var(--border-subtle);
                border-radius: 12px;
                font-size: 13px;
                margin-top: 8px;
            }
        </style>
    </div>
    `;
}
