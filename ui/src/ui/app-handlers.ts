import type { AppViewState } from "./app-view-state";
import { HapticService } from "./services/haptic-service";
import { saveSettings } from "./storage";
import { predictivePrefetchChat } from "./app-chat";

export async function handleExecApprovalDecision(
  state: AppViewState,
  decision: "allow-once" | "allow-always" | "deny",
) {
  const active = state.execApprovalStore.queue[0];
  if (!active || !state.client || state.execApprovalStore.busy) return;
  state.execApprovalStore.busy = true;
  state.execApprovalStore.error = null;
  try {
    await state.client.request("exec.approval.resolve", {
      id: active.id,
      decision,
    });
    state.execApprovalStore.queue = state.execApprovalStore.queue.filter(
      (entry) => entry.id !== active.id,
    );
  } catch (err) {
    state.execApprovalStore.error = `Falha na aprovação de execução: ${String(err)}`;
  } finally {
    state.execApprovalStore.busy = false;
  }
}

export function handleOpenSidebar(state: AppViewState, content: string) {
  state.uiStore.sidebarContent = content;
  state.uiStore.sidebarError = null;
  state.uiStore.sidebarOpen = true;
}

export function handleCloseSidebar(state: AppViewState) {
  state.uiStore.sidebarOpen = false;
  // Content clearing is usually handled by a timer in the component to allow transition
}

export function handleSplitRatioChange(state: AppViewState, ratio: number) {
  state.uiStore.splitRatio = ratio;
  state.uiStore.settings = { ...state.uiStore.settings, splitRatio: ratio };
  saveSettings(state.uiStore.settings);
}

export async function handlePanic(state: AppViewState) {
  HapticService.panic();
  console.warn("pânico: parada de emergência acionada");
  state.chatStore.queue = [];
  state.playgroundStore.loading = false;
  state.playgroundStore.output = "SISTEMA PARADO: Parada de emergência acionada.";

  if (state.client && state.uiStore.connected) {
    try {
      await state.client.request("system.panic", {});
    } catch (err) {
      console.error("failed to trigger global panic:", err);
      // Fallback to local abort if global fails
      await state.handleAbortChat();
    }
  } else {
    await state.handleAbortChat();
  }

  state.uiStore.lastError = "Parada de emergência acionada. Operações do sistema interrompidas.";
  state.requestUpdate?.();
}

export async function handleSetupApply(state: AppViewState) {
  if (state.client && state.uiStore.setupRecommendations.length > 0) {
    await state.client.request("system.applyRecommendations", {
      recommendations: state.uiStore.setupRecommendations,
    });
  }
  state.uiStore.setupStep = "persona";
}

export function handleSetupSkip(state: AppViewState) {
  state.uiStore.onboarding = false;
  const url = new URL(window.location.href);
  url.searchParams.delete("onboarding");
  window.history.replaceState({}, "", url.toString());
}

export async function handlePersonaSelect(state: AppViewState, personaId: string) {
  if (state.client) {
    await state.client.request("system.applyPersona", { personaId });
  }
  handleSetupSkip(state);
  if (!state.uiStore.settings.onboarded) {
    handleStartTour(state);
  }
}

export function handleStartTour(state: AppViewState) {
  state.uiStore.tourActive = true;
  state.uiStore.tourStep = 0;
}

export function handleTourNext(state: AppViewState) {
  state.uiStore.tourStep++;
}

export function handleTourPrev(state: AppViewState) {
  state.uiStore.tourStep = Math.max(0, state.uiStore.tourStep - 1);
}

export function handleTourFinish(state: AppViewState) {
  state.uiStore.tourActive = false;
  state.applySettings({ ...state.uiStore.settings, onboarded: true });
}

export function handleTourSkip(state: AppViewState) {
  state.uiStore.tourActive = false;
  state.applySettings({ ...state.uiStore.settings, onboarded: true });
}
