import ZeroKit
import Network
import Observation
import SwiftUI
import UIKit

@MainActor
@Observable
private final class ConnectStatusStore {
    var text: String?
}

extension ConnectStatusStore: @unchecked Sendable {}

struct SettingsTab: View {
    @Environment(NodeAppModel.self) private var appModel: NodeAppModel
    @Environment(VoiceWakeManager.self) private var voiceWake: VoiceWakeManager
    @Environment(GatewayConnectionController.self) private var gatewayController: GatewayConnectionController
    @Environment(\.dismiss) private var dismiss
    @AppStorage("node.displayName") private var displayName: String = "iOS Node"
    @AppStorage("node.instanceId") private var instanceId: String = UUID().uuidString
    @AppStorage("voiceWake.enabled") private var voiceWakeEnabled: Bool = false
    @AppStorage("talk.enabled") private var talkEnabled: Bool = false
    @AppStorage("talk.button.enabled") private var talkButtonEnabled: Bool = true
    @AppStorage("camera.enabled") private var cameraEnabled: Bool = true
    @AppStorage("location.enabledMode") private var locationEnabledModeRaw: String = ZeroLocationMode.off.rawValue
    @AppStorage("location.preciseEnabled") private var locationPreciseEnabled: Bool = true
    @AppStorage("screen.preventSleep") private var preventSleep: Bool = true
    @AppStorage("gateway.preferredStableID") private var preferredGatewayStableID: String = ""
    @AppStorage("gateway.lastDiscoveredStableID") private var lastDiscoveredGatewayStableID: String = ""
    @AppStorage("gateway.manual.enabled") private var manualGatewayEnabled: Bool = false
    @AppStorage("gateway.manual.host") private var manualGatewayHost: String = ""
    @AppStorage("gateway.manual.port") private var manualGatewayPort: Int = 18789
    @AppStorage("gateway.manual.tls") private var manualGatewayTLS: Bool = true
    @AppStorage("gateway.discovery.debugLogs") private var discoveryDebugLogsEnabled: Bool = false
    @AppStorage("canvas.debugStatusEnabled") private var canvasDebugStatusEnabled: Bool = false
    @State private var connectStatus = ConnectStatusStore()
    @State private var connectingGatewayID: String?
    @State private var localIPAddress: String?
    @State private var lastLocationModeRaw: String = ZeroLocationMode.off.rawValue
    @State private var gatewayToken: String = ""
    @State private var gatewayPassword: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Node") {
                    TextField("Nome", text: self.$displayName)
                    Text(self.instanceId)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    LabeledContent("IP", value: self.localIPAddress ?? "—")
                        .contextMenu {
                            if let ip = self.localIPAddress {
                                Button {
                                    UIPasteboard.general.string = ip
                                } label: {
                                    Label("Copiar", systemImage: "doc.on.doc")
                                }
                            }
                        }
                    LabeledContent("Plataforma", value: self.platformString())
                    LabeledContent("Versão", value: self.appVersion())
                    LabeledContent("Modelo", value: self.modelIdentifier())
                }

                Section("Gateway") {
                    LabeledContent("Busca", value: self.gatewayController.discoveryStatusText)
                    LabeledContent("Status", value: self.appModel.gatewayStatusText)
                    if let serverName = self.appModel.gatewayServerName {
                        LabeledContent("Servidor", value: serverName)
                        if let addr = self.appModel.gatewayRemoteAddress {
                            let parts = Self.parseHostPort(from: addr)
                            let urlString = Self.httpURLString(host: parts?.host, port: parts?.port, fallback: addr)
                            LabeledContent("Endereço") {
                                Text(urlString)
                            }
                            .contextMenu {
                                Button {
                                    UIPasteboard.general.string = urlString
                                } label: {
                                    Label("Copiar URL", systemImage: "doc.on.doc")
                                }

                                if let parts {
                                    Button {
                                        UIPasteboard.general.string = parts.host
                                    } label: {
                                        Label("Copiar Host", systemImage: "doc.on.doc")
                                    }

                                    Button {
                                        UIPasteboard.general.string = "\(parts.port)"
                                    } label: {
                                        Label("Copiar Porta", systemImage: "doc.on.doc")
                                    }
                                }
                            }
                        }

                        Button("Desconectar", role: .destructive) {
                            self.appModel.disconnectGateway()
                        }

                        self.gatewayList(showing: .availableOnly)
                    } else {
                        self.gatewayList(showing: .all)
                    }

                    if let text = self.connectStatus.text {
                        Text(text)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    DisclosureGroup("Avançado") {
                        Toggle("Usar Gateway Manual", isOn: self.$manualGatewayEnabled)

                        TextField("Host", text: self.$manualGatewayHost)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        TextField("Porta", value: self.$manualGatewayPort, format: .number)
                            .keyboardType(.numberPad)

                        Toggle("Usar TLS", isOn: self.$manualGatewayTLS)

                        Button {
                            Task { await self.connectManual() }
                        } label: {
                            if self.connectingGatewayID == "manual" {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                    Text("Conectando…")
                                }
                            } else {
                                Text("Conectar (Manual)")
                            }
                        }
                        .disabled(self.connectingGatewayID != nil || self.manualGatewayHost
                            .trimmingCharacters(in: .whitespacesAndNewlines)
                            .isEmpty || self.manualGatewayPort <= 0 || self.manualGatewayPort > 65535)

                        Text(
                            "Use isto quando a busca por mDNS/Bonjour estiver bloqueada. "
                                + "O WebSocket do gateway escuta na porta 18789 por padrão.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)

                        Toggle("Logs de Depuração da Busca", isOn: self.$discoveryDebugLogsEnabled)
                            .onChange(of: self.discoveryDebugLogsEnabled) { _, newValue in
                                self.gatewayController.setDiscoveryDebugLoggingEnabled(newValue)
                            }

                        NavigationLink("Logs de Busca") {
                            GatewayDiscoveryDebugLogView()
                        }

                        Toggle("Status de Depuração do Canvas", isOn: self.$canvasDebugStatusEnabled)

                        TextField("Token do Gateway", text: self.$gatewayToken)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        SecureField("Senha do Gateway", text: self.$gatewayPassword)
                    }
                }

                Section("Voz") {
                    Toggle("Ativação por Voz", isOn: self.$voiceWakeEnabled)
                        .onChange(of: self.voiceWakeEnabled) { _, newValue in
                            self.appModel.setVoiceWakeEnabled(newValue)
                        }
                    Toggle("Modo de Fala", isOn: self.$talkEnabled)
                        .onChange(of: self.talkEnabled) { _, newValue in
                            self.appModel.setTalkEnabled(newValue)
                        }
                    // Keep this separate so users can hide the side bubble without disabling Talk Mode.
                    Toggle("Mostrar Botão de Fala", isOn: self.$talkButtonEnabled)

                    NavigationLink {
                        VoiceWakeWordsSettingsView()
                    } label: {
                        LabeledContent(
                            "Palavras de Ativação",
                            value: VoiceWakePreferences.displayString(for: self.voiceWake.triggerWords))
                    }
                }

                Section("Câmera") {
                    Toggle("Permitir Câmera", isOn: self.$cameraEnabled)
                    Text("Permite que o gateway solicite fotos ou clipes curtos de vídeo (apenas em primeiro plano).")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Localização") {
                    Picker("Acesso à Localização", selection: self.$locationEnabledModeRaw) {
                        Text("Desativado").tag(ZeroLocationMode.off.rawValue)
                        Text("Durante o Uso").tag(ZeroLocationMode.whileUsing.rawValue)
                        Text("Sempre").tag(ZeroLocationMode.always.rawValue)
                    }
                    .pickerStyle(.segmented)

                    Toggle("Localização Precisa", isOn: self.$locationPreciseEnabled)
                        .disabled(self.locationMode == .off)

                    Text("O modo 'Sempre' requer permissão do sistema e pode solicitar a abertura dos Ajustes.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Tela") {
                    Toggle("Prevenir Repouso", isOn: self.$preventSleep)
                    Text("Mantém a tela ativa enquanto o Zero estiver aberto.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Ajustes")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        self.dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .accessibilityLabel("Fechar")
                }
            }
            .onAppear {
                self.localIPAddress = Self.primaryIPv4Address()
                self.lastLocationModeRaw = self.locationEnabledModeRaw
                let trimmedInstanceId = self.instanceId.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedInstanceId.isEmpty {
                    self.gatewayToken = GatewaySettingsStore.loadGatewayToken(instanceId: trimmedInstanceId) ?? ""
                    self.gatewayPassword = GatewaySettingsStore.loadGatewayPassword(instanceId: trimmedInstanceId) ?? ""
                }
            }
            .onChange(of: self.preferredGatewayStableID) { _, newValue in
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty else { return }
                GatewaySettingsStore.savePreferredGatewayStableID(trimmed)
            }
            .onChange(of: self.gatewayToken) { _, newValue in
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                let instanceId = self.instanceId.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !instanceId.isEmpty else { return }
                GatewaySettingsStore.saveGatewayToken(trimmed, instanceId: instanceId)
            }
            .onChange(of: self.gatewayPassword) { _, newValue in
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                let instanceId = self.instanceId.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !instanceId.isEmpty else { return }
                GatewaySettingsStore.saveGatewayPassword(trimmed, instanceId: instanceId)
            }
            .onChange(of: self.appModel.gatewayServerName) { _, _ in
                self.connectStatus.text = nil
            }
            .onChange(of: self.locationEnabledModeRaw) { _, newValue in
                let previous = self.lastLocationModeRaw
                self.lastLocationModeRaw = newValue
                guard let mode = ZeroLocationMode(rawValue: newValue) else { return }
                Task {
                    let granted = await self.appModel.requestLocationPermissions(mode: mode)
                    if !granted {
                        await MainActor.run {
                            self.locationEnabledModeRaw = previous
                            self.lastLocationModeRaw = previous
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func gatewayList(showing: GatewayListMode) -> some View {
        if self.gatewayController.gateways.isEmpty {
            Text("Nenhum gateway encontrado ainda.")
                .foregroundStyle(.secondary)
        } else {
            let connectedID = self.appModel.connectedGatewayID
            let rows = self.gatewayController.gateways.filter { gateway in
                let isConnected = gateway.stableID == connectedID
                switch showing {
                case .all:
                    return true
                case .availableOnly:
                    return !isConnected
                }
            }

            if rows.isEmpty, showing == .availableOnly {
                Text("Nenhum outro gateway encontrado.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(rows) { gateway in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(gateway.name)
                            let detailLines = self.gatewayDetailLines(gateway)
                            ForEach(detailLines, id: \.self) { line in
                                Text(line)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()

                        Button {
                            Task { await self.connect(gateway) }
                        } label: {
                            if self.connectingGatewayID == gateway.id {
                                ProgressView()
                                    .progressViewStyle(.circular)
                            } else {
                                Text("Conectar")
                            }
                        }
                        .disabled(self.connectingGatewayID != nil)
                    }
                }
            }
        }
    }

    private enum GatewayListMode: Equatable {
        case all
        case availableOnly
    }

    private func platformString() -> String {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        return "iOS \(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"
    }

    private var locationMode: ZeroLocationMode {
        ZeroLocationMode(rawValue: self.locationEnabledModeRaw) ?? .off
    }

    private func appVersion() -> String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"
    }

    private func deviceFamily() -> String {
        switch UIDevice.current.userInterfaceIdiom {
        case .pad:
            "iPad"
        case .phone:
            "iPhone"
        default:
            "iOS"
        }
    }

    private func modelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafeBytes(of: &systemInfo.machine) { ptr in
            String(bytes: ptr.prefix { $0 != 0 }, encoding: .utf8)
        }
        let trimmed = machine?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "unknown" : trimmed
    }

    private func connect(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) async {
        self.connectingGatewayID = gateway.id
        self.manualGatewayEnabled = false
        self.preferredGatewayStableID = gateway.stableID
        GatewaySettingsStore.savePreferredGatewayStableID(gateway.stableID)
        self.lastDiscoveredGatewayStableID = gateway.stableID
        GatewaySettingsStore.saveLastDiscoveredGatewayStableID(gateway.stableID)
        defer { self.connectingGatewayID = nil }

        await self.gatewayController.connect(gateway)
    }

    private func connectManual() async {
        let host = self.manualGatewayHost.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !host.isEmpty else {
            self.connectStatus.text = "Falha: host necessário"
            return
        }
        guard self.manualGatewayPort > 0, self.manualGatewayPort <= 65535 else {
            self.connectStatus.text = "Falha: porta inválida"
            return
        }

        self.connectingGatewayID = "manual"
        self.manualGatewayEnabled = true
        defer { self.connectingGatewayID = nil }

        await self.gatewayController.connectManual(
            host: host,
            port: self.manualGatewayPort,
            useTLS: self.manualGatewayTLS)
    }

    private static func primaryIPv4Address() -> String? {
        var addrList: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&addrList) == 0, let first = addrList else { return nil }
        defer { freeifaddrs(addrList) }

        var fallback: String?
        var en0: String?

        for ptr in sequence(first: first, next: { $0.pointee.ifa_next }) {
            let flags = Int32(ptr.pointee.ifa_flags)
            let isUp = (flags & IFF_UP) != 0
            let isLoopback = (flags & IFF_LOOPBACK) != 0
            let name = String(cString: ptr.pointee.ifa_name)
            let family = ptr.pointee.ifa_addr.pointee.sa_family
            if !isUp || isLoopback || family != UInt8(AF_INET) { continue }

            var addr = ptr.pointee.ifa_addr.pointee
            var buffer = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let result = getnameinfo(
                &addr,
                socklen_t(ptr.pointee.ifa_addr.pointee.sa_len),
                &buffer,
                socklen_t(buffer.count),
                nil,
                0,
                NI_NUMERICHOST)
            guard result == 0 else { continue }
            let len = buffer.prefix { $0 != 0 }
            let bytes = len.map { UInt8(bitPattern: $0) }
            guard let ip = String(bytes: bytes, encoding: .utf8) else { continue }

            if name == "en0" { en0 = ip; break }
            if fallback == nil { fallback = ip }
        }

        return en0 ?? fallback
    }

    private static func parseHostPort(from address: String) -> SettingsHostPort? {
        SettingsNetworkingHelpers.parseHostPort(from: address)
    }

    private static func httpURLString(host: String?, port: Int?, fallback: String) -> String {
        SettingsNetworkingHelpers.httpURLString(host: host, port: port, fallback: fallback)
    }

    private func gatewayDetailLines(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) -> [String] {
        var lines: [String] = []
        if let lanHost = gateway.lanHost { lines.append("LAN: \(lanHost)") }
        if let tailnet = gateway.tailnetDns { lines.append("Tailnet: \(tailnet)") }

        let gatewayPort = gateway.gatewayPort
        let canvasPort = gateway.canvasPort
        if gatewayPort != nil || canvasPort != nil {
            let gw = gatewayPort.map(String.init) ?? "—"
            let canvas = canvasPort.map(String.init) ?? "—"
            lines.append("Portas: gateway \(gw) · canvas \(canvas)")
        }

        if lines.isEmpty {
            lines.append(gateway.debugID)
        }

        return lines
    }
}
