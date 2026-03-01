import { html, nothing } from "lit";
import type { AppViewState } from "./app-view-state";
import { renderExecApprovalPrompt } from "./views/exec-approval";
import { renderSetup } from "./views/setup";
import { renderGuidedTour, type TourStep } from "./views/guided-tour";
import { icons } from "./icons";
import { t } from "./i18n";
import { renderSidebar } from "./app-render-sidebar";
import { renderTopbar } from "./app-render-topbar";
import { renderViews } from "./app-render-views";

const TOUR_STEPS: TourStep[] = [
  {
    title: t("onboarding.tour.welcome.title" as any),
    desc: t("onboarding.tour.welcome.desc" as any),
    icon: icons.sparkles,
  },
  {
    title: t("onboarding.tour.chat.title" as any),
    desc: t("onboarding.tour.chat.desc" as any),
    targetTab: "chat",
    icon: icons.messageSquare,
  },
  {
    title: t("onboarding.tour.zen.title" as any),
    desc: t("onboarding.tour.zen.desc" as any),
    icon: icons.maximize,
  },
  {
    title: t("onboarding.tour.skills.title" as any),
    desc: t("onboarding.tour.skills.desc" as any),
    targetTab: "skills",
    icon: icons.zap,
  },
  {
    title: t("onboarding.tour.channels.title" as any),
    desc: t("onboarding.tour.channels.desc" as any),
    targetTab: "channels",
    icon: icons.globe,
  },
  {
    title: t("onboarding.tour.security.title" as any),
    desc: t("onboarding.tour.security.desc" as any),
    targetTab: "nodes",
    icon: icons.shieldCheck,
  },
];

export function renderApp(state: AppViewState) {
  const isZen = state.uiStore.zenMode;

  const appLayout = html`
    <div class="shell ${state.uiStore.mobileNavOpen ? "mobile-nav-open" : ""} ${state.uiStore.sidebarCollapsed ? "sidebar-collapsed" : ""} ${isZen ? "zen-mode focus-mode" : ""}">
      <div class="mobile-nav-overlay" @click=${() => (state.uiStore.mobileNavOpen = false)}></div>
      
      ${renderSidebar(state)}
      ${renderTopbar(state)}

      <main class="content">
        ${renderViews(state)}
      </main>

      ${renderExecApprovalPrompt(state)}

      ${
        state.uiStore.tourActive
          ? renderGuidedTour({
              step: state.uiStore.tourStep,
              totalSteps: TOUR_STEPS.length,
              currentStep: TOUR_STEPS[state.uiStore.tourStep],
              onNext: () => {
                const nextStep = TOUR_STEPS[state.uiStore.tourStep + 1];
                if (nextStep?.targetTab) state.setTab(nextStep.targetTab as any);
                state.handleTourNext();
              },
              onPrev: () => {
                const prevStep = TOUR_STEPS[state.uiStore.tourStep - 1];
                if (prevStep?.targetTab) state.setTab(prevStep.targetTab as any);
                state.handleTourPrev();
              },
              onFinish: () => state.handleTourFinish(),
              onSkip: () => state.handleTourSkip(),
            })
          : nothing
      }
    </div>
  `;

  if (state.uiStore.onboarding) {
    return html`
      ${appLayout}
      <div style="position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.4); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; animation: fade-in 0.4s ease-out;">
         ${renderSetup({
           recommendations: state.uiStore.setupRecommendations as any,
           loading: state.uiStore.setupLoading,
           step: state.uiStore.setupStep,
           onApply: () => state.handleSetupApply(),
           onSkip: () => state.handleSetupSkip(),
           onPersonaSelect: (id) => state.handlePersonaSelect(id),
         })}
      </div>
      <style>
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      </style>
    `;
  }

  return appLayout;
}
