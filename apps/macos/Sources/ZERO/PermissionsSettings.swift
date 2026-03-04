import ZeroIPC
import ZeroKit
import CoreLocation
import SwiftUI

struct PermissionsSettings: View {
    let status: [Capability: Bool]
    let refresh: () async -> Void
    let showOnboarding: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SystemRunSettingsView()

            Text("Permita estes itens para que o Zero possa notificar e capturar quando necessário.")
                .padding(.top, 4)

            PermissionStatusList(status: self.status, refresh: self.refresh)
                .padding(.horizontal, 2)
                .padding(.vertical, 6)

            LocationAccessSettings()

            Button("Reiniciar integração") { self.showOnboarding() }
                .buttonStyle(.bordered)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
    }
}

private struct LocationAccessSettings: View {
    @AppStorage(locationModeKey) private var locationModeRaw: String = ZeroLocationMode.off.rawValue
    @AppStorage(locationPreciseKey) private var locationPreciseEnabled: Bool = true
    @State private var lastLocationModeRaw: String = ZeroLocationMode.off.rawValue

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Acesso à Localização")
                .font(.body)

            Picker("", selection: self.$locationModeRaw) {
                Text("Desativado").tag(ZeroLocationMode.off.rawValue)
                Text("Durante o Uso").tag(ZeroLocationMode.whileUsing.rawValue)
                Text("Sempre").tag(ZeroLocationMode.always.rawValue)
            }
            .labelsHidden()
            .pickerStyle(.menu)

            Toggle("Localização Precisa", isOn: self.$locationPreciseEnabled)
                .disabled(self.locationMode == .off)

            Text("O modo 'Sempre' pode exigir aprovação nos Ajustes do Sistema para localização em segundo plano.")
                .font(.footnote)
                .foregroundStyle(.tertiary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .onAppear {
            self.lastLocationModeRaw = self.locationModeRaw
        }
        .onChange(of: self.locationModeRaw) { _, newValue in
            let previous = self.lastLocationModeRaw
            self.lastLocationModeRaw = newValue
            guard let mode = ZeroLocationMode(rawValue: newValue) else { return }
            Task {
                let granted = await self.requestLocationAuthorization(mode: mode)
                if !granted {
                    await MainActor.run {
                        self.locationModeRaw = previous
                        self.lastLocationModeRaw = previous
                    }
                }
            }
        }
    }

    private var locationMode: ZeroLocationMode {
        ZeroLocationMode(rawValue: self.locationModeRaw) ?? .off
    }

    private func requestLocationAuthorization(mode: ZeroLocationMode) async -> Bool {
        guard mode != .off else { return true }
        guard CLLocationManager.locationServicesEnabled() else {
            await MainActor.run { LocationPermissionHelper.openSettings() }
            return false
        }

        let status = CLLocationManager().authorizationStatus
        let requireAlways = mode == .always
        if PermissionManager.isLocationAuthorized(status: status, requireAlways: requireAlways) {
            return true
        }
        let updated = await LocationPermissionRequester.shared.request(always: requireAlways)
        return PermissionManager.isLocationAuthorized(status: updated, requireAlways: requireAlways)
    }
}

struct PermissionStatusList: View {
    let status: [Capability: Bool]
    let refresh: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Capability.allCases, id: \.self) { cap in
                PermissionRow(capability: cap, status: self.status[cap] ?? false) {
                    Task { await self.handle(cap) }
                }
            }
            Button {
                Task { await self.refresh() }
            } label: {
                Label("Atualizar", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .font(.footnote)
            .padding(.top, 2)
            .help("Atualizar status")
        }
    }

    @MainActor
    private func handle(_ cap: Capability) async {
        _ = await PermissionManager.ensure([cap], interactive: true)
        await self.refresh()
    }
}

struct PermissionRow: View {
    let capability: Capability
    let status: Bool
    let compact: Bool
    let action: () -> Void

    init(capability: Capability, status: Bool, compact: Bool = false, action: @escaping () -> Void) {
        self.capability = capability
        self.status = status
        self.compact = compact
        self.action = action
    }

    var body: some View {
        HStack(spacing: self.compact ? 10 : 12) {
            ZStack {
                Circle().fill(self.status ? Color.green.opacity(0.2) : Color.gray.opacity(0.15))
                    .frame(width: self.iconSize, height: self.iconSize)
                Image(systemName: self.icon)
                    .foregroundStyle(self.status ? Color.green : Color.secondary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(self.title).font(.body.weight(.semibold))
                Text(self.subtitle).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if self.status {
                Label("Concedido", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Button("Conceder") { self.action() }
                    .buttonStyle(.bordered)
            }
        }
        .padding(.vertical, self.compact ? 4 : 6)
    }

    private var iconSize: CGFloat { self.compact ? 28 : 32 }

    private var title: String {
        switch self.capability {
        case .appleScript: "Automação (AppleScript)"
        case .notifications: "Notificações"
        case .accessibility: "Acessibilidade"
        case .screenRecording: "Gravação de Tela"
        case .microphone: "Microfone"
        case .speechRecognition: "Reconhecimento de Fala"
        case .camera: "Câmera"
        case .location: "Localização"
        }
    }

    private var subtitle: String {
        switch self.capability {
        case .appleScript:
            "Controlar outros aplicativos (p. ex. Terminal) para ações de automação"
        case .notifications: "Mostrar alertas na área de trabalho para atividades do agente"
        case .accessibility: "Controlar elementos da interface quando uma ação exigir"
        case .screenRecording: "Capturar a tela para contexto ou capturas de tela"
        case .microphone: "Permitir Ativação por Voz e captura de áudio"
        case .speechRecognition: "Transcrever frases de ativação por voz no dispositivo"
        case .camera: "Capturar fotos e vídeo da câmera"
        case .location: "Compartilhar localização quando solicitado pelo agente"
        }
    }

    private var icon: String {
        switch self.capability {
        case .appleScript: "applescript"
        case .notifications: "bell"
        case .accessibility: "hand.raised"
        case .screenRecording: "display"
        case .microphone: "mic"
        case .speechRecognition: "waveform"
        case .camera: "camera"
        case .location: "location"
        }
    }
}

#if DEBUG
struct PermissionsSettings_Previews: PreviewProvider {
    static var previews: some View {
        PermissionsSettings(
            status: [
                .appleScript: true,
                .notifications: true,
                .accessibility: false,
                .screenRecording: false,
                .microphone: true,
                .speechRecognition: false,
            ],
            refresh: {},
            showOnboarding: {})
            .frame(width: SettingsTab.windowWidth, height: SettingsTab.windowHeight)
    }
}
#endif
