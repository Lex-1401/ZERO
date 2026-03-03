import SwiftUI

struct RootTabs: View {
    @Environment(NodeAppModel.self) private var appModel
    @Environment(VoiceWakeManager.self) private var voiceWake
    @AppStorage(VoiceWakePreferences.enabledKey) private var voiceWakeEnabled: Bool = false
    @State private var selectedTab: Int = 0
    @State private var voiceWakeToastText: String?
    @State private var toastDismissTask: Task<Void, Never>?

    var body: some View {
        TabView(selection: self.$selectedTab) {
            ChatView()
                .tabItem {
                    Label("Conversa", systemImage: "bubble.left.and.bubble.right")
                }
                .tag(0) // Assuming Tab.screen corresponds to 0

            VoiceView()
                .tabItem {
                    Label("Voz", systemImage: "waveform.circle")
                }
                .tag(1) // Assuming Tab.voice corresponds to 1

            SettingsTab()
                .tabItem {
                    Label("Ajustes", systemImage: "gearshape")
                }
                .tag(2) // Assuming Tab.settings corresponds to 2
        }
        .overlay(alignment: .topLeading) {
            StatusPill(
                gateway: self.gatewayStatus,
                voiceWakeEnabled: self.voiceWakeEnabled,
                activity: self.statusActivity,
                onTap: { self.selectedTab = 2 })
                .padding(.leading, 10)
                .safeAreaPadding(.top, 10)
        }
        .overlay(alignment: .topLeading) {
            if let voiceWakeToastText, !voiceWakeToastText.isEmpty {
                VoiceWakeToast(command: voiceWakeToastText)
                    .padding(.leading, 10)
                    .safeAreaPadding(.top, 58)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .onChange(of: self.voiceWake.lastTriggeredCommand) { _, newValue in
            guard let newValue else { return }
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return }

            self.toastDismissTask?.cancel()
            withAnimation(.spring(response: 0.25, dampingFraction: 0.85)) {
                self.voiceWakeToastText = trimmed
            }

            self.toastDismissTask = Task {
                try? await Task.sleep(nanoseconds: 2_300_000_000)
                await MainActor.run {
                    withAnimation(.easeOut(duration: 0.25)) {
                        self.voiceWakeToastText = nil
                    }
                }
            }
        }
        .onDisappear {
            self.toastDismissTask?.cancel()
            self.toastDismissTask = nil
        }
    }

    private var gatewayStatus: StatusPill.GatewayState {
        if self.appModel.gatewayServerName != nil { return .connected }

        let text = self.appModel.gatewayStatusText.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.localizedCaseInsensitiveContains("connecting") ||
            text.localizedCaseInsensitiveContains("conectando") ||
            text.localizedCaseInsensitiveContains("reconnecting") ||
            text.localizedCaseInsensitiveContains("reconectando")
        {
            return .connecting
        }

        if text.localizedCaseInsensitiveContains("error") ||
            text.localizedCaseInsensitiveContains("erro")
        {
            return .error
        }

        return .disconnected
    }

    private var statusActivity: StatusPill.Activity? {
        // Keep the top pill consistent across tabs (camera + voice wake + pairing states).
        if self.appModel.isBackgrounded {
            return StatusPill.Activity(
                title: "Primeiro plano necessário",
                systemImage: "exclamationmark.triangle.fill",
                tint: .orange)
        }

        let gatewayStatus = self.appModel.gatewayStatusText.trimmingCharacters(in: .whitespacesAndNewlines)
        let gatewayLower = gatewayStatus.lowercased()
        if gatewayLower.contains("repair") {
            return StatusPill.Activity(title: "Reparando…", systemImage: "wrench.and.screwdriver", tint: .orange)
        }
        if gatewayLower.contains("approval") || gatewayLower.contains("pairing") {
            return StatusPill.Activity(title: "Aprovação pendente", systemImage: "person.crop.circle.badge.clock")
        }
        // Avoid duplicating the primary gateway status ("Connecting…") in the activity slot.

        if self.appModel.screenRecordActive {
            return StatusPill.Activity(title: "Gravando tela…", systemImage: "record.circle.fill", tint: .red)
        }

        if let cameraHUDText = self.appModel.cameraHUDText,
           let cameraHUDKind = self.appModel.cameraHUDKind,
           !cameraHUDText.isEmpty
        {
            let systemImage: String
            let tint: Color?
            switch cameraHUDKind {
            case .photo:
                systemImage = "camera.fill"
                tint = nil
            case .recording:
                systemImage = "video.fill"
                tint = .red
            case .success:
                systemImage = "checkmark.circle.fill"
                tint = .green
            case .error:
                systemImage = "exclamationmark.triangle.fill"
                tint = .red
            }
            return StatusPill.Activity(title: cameraHUDText, systemImage: systemImage, tint: tint)
        }

        if self.voiceWakeEnabled {
            let voiceStatus = self.appModel.voiceWake.statusText
            if voiceStatus.localizedCaseInsensitiveContains("microphone permission") {
                return StatusPill.Activity(title: "Permissão de mic", systemImage: "mic.slash", tint: .orange)
            }
            if voiceStatus == "Paused" {
                let suffix = self.appModel.isBackgrounded ? " (em segundo plano)" : ""
                return StatusPill.Activity(title: "Ativação por Voz pausada\(suffix)", systemImage: "pause.circle.fill")
            }
        }

        return nil
    }
}
