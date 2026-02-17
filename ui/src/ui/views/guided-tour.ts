import { html, nothing } from "lit";
import { icons } from "../icons";
import { t } from "../i18n";

export interface TourStep {
    title: string;
    desc: string;
    targetTab?: string;
    zenRequired?: boolean;
    icon: any;
}

export function renderGuidedTour(props: {
    step: number;
    totalSteps: number;
    currentStep: TourStep;
    onNext: () => void;
    onPrev: () => void;
    onFinish: () => void;
    onSkip: () => void;
}) {
    return html`
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.15); backdrop-filter: blur(3px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fade-in 0.4s ease-out;">
            <style>
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .tour-card {
                    background: var(--bg-surface);
                    border: 1px solid var(--border-subtle);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 460px;
                    padding: 40px;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
                    position: relative;
                    animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    text-align: center;
                }
                .tour-logo-bg {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 160px;
                    font-weight: 900;
                    opacity: 0.03;
                    color: var(--accent-blue);
                    pointer-events: none;
                    z-index: 0;
                    user-select: none;
                    line-height: 1;
                }
                .tour-progress {
                    display: flex;
                    gap: 6px;
                    justify-content: center;
                    margin-bottom: 32px;
                }
                .progress-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 3px;
                    background: var(--text-dim);
                    opacity: 0.3;
                    transition: all 0.3s;
                }
                .progress-dot.active {
                    width: 24px;
                    background: var(--accent-blue);
                    opacity: 1;
                }
            </style>

            <div class="tour-card">
                <div class="tour-logo-bg">∅</div>
                <div class="tour-progress">
                    ${Array.from({ length: props.totalSteps }).map((_, i) => html`
                        <div class="progress-dot ${i === props.step ? "active" : ""}"></div>
                    `)}
                </div>

                <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(var(--accent-blue-rgb), 0.1); color: var(--accent-blue); display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; box-shadow: inset 0 0 20px rgba(var(--accent-blue-rgb), 0.1); position: relative; z-index: 1;">
                    <div style="transform: scale(1.8);">${props.currentStep.icon}</div>
                </div>

                <h2 style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 16px; letter-spacing: -0.02em;">
                    ${props.currentStep.title}
                </h2>

                <p style="font-size: 15px; color: var(--text-muted); line-height: 1.6; margin-bottom: 40px; padding: 0 10px;">
                    ${props.currentStep.desc}
                </p>

                <div style="display: flex; gap: 12px;">
                    ${props.step > 0 ? html`
                        <button class="btn" style="flex: 1; justify-content: center; height: 48px; border-radius: 14px;" @click=${props.onPrev}>
                            ${t("onboarding.tour.prev" as any)}
                        </button>
                    ` : html`
                         <button class="btn ghost" style="flex: 1; justify-content: center; height: 48px;" @click=${props.onSkip}>
                            ${t("onboarding.tour.skip" as any)}
                        </button>
                    `}

                    ${props.step < props.totalSteps - 1 ? html`
                        <button class="btn primary" style="flex: 2; justify-content: center; height: 48px; border-radius: 14px; font-weight: 700; box-shadow: 0 4px 15px rgba(var(--accent-blue-rgb), 0.3);" @click=${props.onNext}>
                            ${t("onboarding.tour.next" as any)}
                        </button>
                    ` : html`
                        <button class="btn primary" style="flex: 2; justify-content: center; height: 48px; border-radius: 14px; font-weight: 700; box-shadow: 0 4px 15px rgba(var(--accent-blue-rgb), 0.3);" @click=${props.onFinish}>
                            ${t("onboarding.tour.finish" as any)}
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}
