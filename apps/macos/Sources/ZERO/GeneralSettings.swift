import AppKit
import ZeroDiscovery
import ZeroIPC
import ZeroKit
import Observation
import SwiftUI

struct GeneralSettings: View {
    @Bindable var state: AppState
    @AppStorage(cameraEnabledKey) private var cameraEnabled: Bool = false
    private let healthStore = HealthStore.shared
    private let gatewayManager = GatewayProcessManager.shared
    @State private var gatewayDiscovery = GatewayDiscoveryModel(
        localDisplayName: InstanceIdentity.displayName)
    @State private var gatewayStatus: GatewayEnvironmentStatus = .checking
    @State private var remoteStatus: RemoteStatus = .idle
    @State private var showRemoteAdvanced = false
    private let isPreview = ProcessInfo.processInfo.isPreview
    private var isNixMode: Bool { ProcessInfo.processInfo.isNixMode }
    private var remoteLabelWidth: CGFloat { 88 }

    var body: some View {
        ScrollView(.vertical) {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 12) {
                    SettingsToggleRow(
                        title: "Zero ativo",
                        subtitle: "Pause para parar o gateway do Zero; nenhuma mensagem será processada.",
                        binding: self.activeBinding)

                    self.connectionSection

                    Divider()

                    SettingsToggleRow(
                        title: "Iniciar ao fazer login",
                        subtitle: "Iniciar o Zero automaticamente após você iniciar a sessão.",
                        binding: self.$state.launchAtLogin)

                    SettingsToggleRow(
                        title: "Mostrar ícone no Dock",
                        subtitle: "Manter o Zero visível no Dock em vez de apenas na barra de menus.",
                        binding: self.$state.showDockIcon)

                    SettingsToggleRow(
                        title: "Animações no ícone da barra de menus",
                        subtitle: "Ativar piscadas e movimentos no ícone de status.",
                        binding: self.$state.iconAnimationsEnabled)

                    SettingsToggleRow(
                        title: "Permitir Canvas",
                        subtitle: "Permitir que o agente mostre e controle o painel Canvas.",
                        binding: self.$state.canvasEnabled)

                    SettingsToggleRow(
                        title: "Permitir Câmera",
                        subtitle: "Permitir que o agente capture uma foto ou vídeo curto através da câmera integrada.",
                        binding: self.$cameraEnabled)

                    SettingsToggleRow(
                        title: "Ativar Peekaboo Bridge",
                        subtitle: "Permitir que ferramentas assinadas (ex: peekaboo) realizem automação de interface via PeekabooBridge.",
                        binding: self.$state.peekabooBridgeEnabled)

                    SettingsToggleRow(
                        title: "Ativar ferramentas de depuração",
                        subtitle: "Mostrar a guia de Depuração com utilitários de desenvolvimento.",
                        binding: self.$state.debugPaneEnabled)
                }

                Spacer(minLength: 12)
                HStack {
                    Spacer()
                    Button("Encerrar Zero") { NSApp.terminate(nil) }
                        .buttonStyle(.borderedProminent)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
            .padding(.bottom, 16)
        }
        .onAppear {
            guard !self.isPreview else { return }
            self.refreshGatewayStatus()
        }
        .onChange(of: self.state.canvasEnabled) { _, enabled in
            if !enabled {
                CanvasManager.shared.hideAll()
            }
        }
    }

    private var activeBinding: Binding<Bool> {
        Binding(
            get: { !self.state.isPaused },
            set: { self.state.isPaused = !$0 })
    }

    private var connectionSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("O Zero executa")
                .font(.title3.weight(.semibold))
                .frame(maxWidth: .infinity, alignment: .leading)

            Picker("Modo", selection: self.$state.connectionMode) {
                Text("Não configurado").tag(AppState.ConnectionMode.unconfigured)
                Text("Local (este Mac)").tag(AppState.ConnectionMode.local)
                Text("Remoto (outro host)").tag(AppState.ConnectionMode.remote)
            }
            .pickerStyle(.menu)
            .labelsHidden()
            .frame(width: 260, alignment: .leading)

            if self.state.connectionMode == .unconfigured {
                Text("Escolha Local ou Remoto para iniciar o Gateway.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if self.state.connectionMode == .local {
                // In Nix mode, gateway is managed declaratively - no install buttons.
                if !self.isNixMode {
                    self.gatewayInstallerCard
                }
                TailscaleIntegrationSection(
                    connectionMode: self.state.connectionMode,
                    isPaused: self.state.isPaused)
                self.healthRow
            }

            if self.state.connectionMode == .remote {
                self.remoteCard
            }
        }
    }

    private var remoteCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            self.remoteTransportRow

            if self.state.remoteTransport == .ssh {
                self.remoteSshRow
            } else {
                self.remoteDirectRow
            }

            GatewayDiscoveryInlineList(
                discovery: self.gatewayDiscovery,
                currentTarget: self.state.remoteTarget,
                currentUrl: self.state.remoteUrl,
                transport: self.state.remoteTransport)
            { gateway in
                self.applyDiscoveredGateway(gateway)
            }
            .padding(.leading, self.remoteLabelWidth + 10)

            self.remoteStatusView
                .padding(.leading, self.remoteLabelWidth + 10)

            if self.state.remoteTransport == .ssh {
                DisclosureGroup(isExpanded: self.$showRemoteAdvanced) {
                    VStack(alignment: .leading, spacing: 8) {
                        LabeledContent("Arquivo de identidade") {
                            TextField("/Users/you/.ssh/id_ed25519", text: self.$state.remoteIdentity)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 280)
                        }
                        LabeledContent("Raiz do projeto") {
                            TextField("/home/you/Projects/zero", text: self.$state.remoteProjectRoot)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 280)
                        }
                        LabeledContent("Caminho da CLI") {
                            TextField("/Applications/Zero.app/.../zero", text: self.$state.remoteCliPath)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 280)
                        }
                    }
                    .padding(.top, 4)
                } label: {
                    Text("Avançado")
                        .font(.callout.weight(.semibold))
                }
            }

            // Diagnostics
            VStack(alignment: .leading, spacing: 4) {
                Text("Canal de controle")
                    .font(.caption.weight(.semibold))
                if !self.isControlStatusDuplicate || ControlChannel.shared.lastPingMs != nil {
                    let status = self.isControlStatusDuplicate ? nil : self.controlStatusLine
                    let ping = ControlChannel.shared.lastPingMs.map { "Ping \(Int($0)) ms" }
                    let line = [status, ping].compactMap(\.self).joined(separator: " · ")
                    if !line.isEmpty {
                        Text(line)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                if let hb = HeartbeatStore.shared.lastEvent {
                    let ageText = age(from: Date(timeIntervalSince1970: hb.ts / 1000))
                    Text("Último batimento: \(hb.status) · \(ageText)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let authLabel = ControlChannel.shared.authSourceLabel {
                    Text(authLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if self.state.remoteTransport == .ssh {
                Text("Dica: ative o Tailscale para um acesso remoto estável.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            } else {
                Text("Dica: use o Tailscale Serve para que o gateway tenha um certificado HTTPS válido.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .transition(.opacity)
        .onAppear { self.gatewayDiscovery.start() }
        .onDisappear { self.gatewayDiscovery.stop() }
    }

    private var remoteTransportRow: some View {
        HStack(alignment: .center, spacing: 10) {
            Text("Transporte")
                .font(.callout.weight(.semibold))
                .frame(width: self.remoteLabelWidth, alignment: .leading)
            Picker("Transporte", selection: self.$state.remoteTransport) {
                Text("Túnel SSH").tag(AppState.RemoteTransport.ssh)
                Text("Direto (ws/wss)").tag(AppState.RemoteTransport.direct)
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 320)
        }
    }

    private var remoteSshRow: some View {
        HStack(alignment: .center, spacing: 10) {
            Text("Alvo SSH")
                .font(.callout.weight(.semibold))
                .frame(width: self.remoteLabelWidth, alignment: .leading)
            TextField("user@host[:22]", text: self.$state.remoteTarget)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)
            Button {
                Task { await self.testRemote() }
            } label: {
                if self.remoteStatus == .checking {
                    ProgressView().controlSize(.small)
                } else {
                    Text("Testar remoto")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(self.remoteStatus == .checking || self.state.remoteTarget
                .trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }

    private var remoteDirectRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .center, spacing: 10) {
                Text("Gateway")
                    .font(.callout.weight(.semibold))
                    .frame(width: self.remoteLabelWidth, alignment: .leading)
                TextField("wss://gateway.exemplo.ts.net", text: self.$state.remoteUrl)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: .infinity)
                Button {
                    Task { await self.testRemote() }
                } label: {
                    if self.remoteStatus == .checking {
                        ProgressView().controlSize(.small)
                    } else {
                        Text("Testar remoto")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(self.remoteStatus == .checking || self.state.remoteUrl
                    .trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            Text("O modo direto requer uma URL ws:// ou wss:// (o Tailscale Serve usa wss://<magicdns>).")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.leading, self.remoteLabelWidth + 10)
        }
    }

    private var controlStatusLine: String {
        switch ControlChannel.shared.state {
        case .connected: "Conectado"
        case .connecting: "Conectando…"
        case .disconnected: "Desconectado"
        case let .degraded(msg): msg
        }
    }

    @ViewBuilder
    private var remoteStatusView: some View {
        switch self.remoteStatus {
        case .idle:
            EmptyView()
        case .checking:
            Text("Testando…")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .ok:
            Label("Pronto", systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        case let .failed(message):
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
    }

    private var isControlStatusDuplicate: Bool {
        guard case let .failed(message) = self.remoteStatus else { return false }
        return message == self.controlStatusLine
    }

    private var gatewayInstallerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Circle()
                    .fill(self.gatewayStatusColor)
                    .frame(width: 10, height: 10)
                Text(self.gatewayStatus.message)
                    .font(.callout)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let gatewayVersion = self.gatewayStatus.gatewayVersion,
               let required = self.gatewayStatus.requiredGateway,
               gatewayVersion != required
            {
                Text("Installed: \(gatewayVersion) · Required: \(required)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else if let gatewayVersion = self.gatewayStatus.gatewayVersion {
                Text("Gateway \(gatewayVersion) detectado")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let node = self.gatewayStatus.nodeVersion {
                Text("Node \(node)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if case let .attachedExisting(details) = self.gatewayManager.status {
                Text(details ?? "Usando instância de gateway existente")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let failure = self.gatewayManager.lastFailureReason {
                Text("Última falha: \(failure)")
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button("Verificar novamente") { self.refreshGatewayStatus() }
                .buttonStyle(.bordered)

            Text("O Gateway inicia automaticamente no modo local via launchd (\(gatewayLaunchdLabel)).")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .padding(12)
        .background(Color.gray.opacity(0.08))
        .cornerRadius(10)
    }

    private func refreshGatewayStatus() {
        Task {
            let status = await Task.detached(priority: .utility) {
                GatewayEnvironment.check()
            }.value
            self.gatewayStatus = status
        }
    }

    private var gatewayStatusColor: Color {
        switch self.gatewayStatus.kind {
        case .ok: .green
        case .checking: .secondary
        case .missingNode, .missingGateway, .incompatible, .error: .orange
        }
    }

    private var healthCard: some View {
        let snapshot = self.healthStore.snapshot
        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Circle()
                    .fill(self.healthStore.state.tint)
                    .frame(width: 10, height: 10)
                Text(self.healthStore.summaryLine)
                    .font(.callout.weight(.semibold))
            }

            if let snap = snapshot {
                let linkId = snap.channelOrder?.first(where: {
                    if let summary = snap.channels[$0] { return summary.linked != nil }
                    return false
                }) ?? snap.channels.keys.first(where: {
                    if let summary = snap.channels[$0] { return summary.linked != nil }
                    return false
                })
                let linkLabel =
                    linkId.flatMap { snap.channelLabels?[$0] } ??
                    linkId?.capitalized ??
                    "Link channel"
                let linkAge = linkId.flatMap { snap.channels[$0]?.authAgeMs }
                Text("\(linkLabel) auth age: \(healthAgeString(linkAge))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Cofre de sessões: \(snap.sessions.path) (\(snap.sessions.count) entradas)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let recent = snap.sessions.recent.first {
                    let lastActivity = recent.updatedAt != nil
                        ? relativeAge(from: Date(timeIntervalSince1970: (recent.updatedAt ?? 0) / 1000))
                        : "unknown"
                    Text("Última atividade: \(recent.key) \(lastActivity)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text("Última verificação: \(relativeAge(from: self.healthStore.lastSuccess))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else if let error = self.healthStore.lastError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            } else {
                Text("Verificação de saúde pendente…")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                Button {
                    Task { await self.healthStore.refresh(onDemand: true) }
                } label: {
                    if self.healthStore.isRefreshing {
                        ProgressView().controlSize(.small)
                    } else {
                        Label("Executar Verificação de Saúde", systemImage: "arrow.clockwise")
                    }
                }
                .disabled(self.healthStore.isRefreshing)

                Divider().frame(height: 18)

                Button {
                    self.revealLogs()
                } label: {
                    Label("Revelar Registros", systemImage: "doc.text.magnifyingglass")
                }
            }
        }
        .padding(12)
        .background(Color.gray.opacity(0.08))
        .cornerRadius(10)
    }
}

private enum RemoteStatus: Equatable {
    case idle
    case checking
    case ok
    case failed(String)
}

extension GeneralSettings {
    private var healthRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Circle()
                    .fill(self.healthStore.state.tint)
                    .frame(width: 10, height: 10)
                Text(self.healthStore.summaryLine)
                    .font(.callout)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let detail = self.healthStore.detailLine {
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 10) {
                Button("Tentar agora") {
                    Task { await HealthStore.shared.refresh(onDemand: true) }
                }
                .disabled(self.healthStore.isRefreshing)

                Button("Abrir registros") { self.revealLogs() }
                    .buttonStyle(.link)
                    .foregroundStyle(.secondary)
            }
            .font(.caption)
        }
    }

    @MainActor
    func testRemote() async {
        self.remoteStatus = .checking
        let settings = CommandResolver.connectionSettings()
        if self.state.remoteTransport == .direct {
            let trimmedUrl = self.state.remoteUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmedUrl.isEmpty else {
                self.remoteStatus = .failed("Configure uma URL de gateway primeiro")
                return
            }
            guard Self.isValidWsUrl(trimmedUrl) else {
                self.remoteStatus = .failed("A URL do gateway deve começar com ws:// ou wss://")
                return
            }
        } else {
            guard !settings.target.isEmpty else {
                self.remoteStatus = .failed("Configure um alvo SSH primeiro")
                return
            }

            // Step 1: basic SSH reachability check
            let sshResult = await ShellExecutor.run(
                command: Self.sshCheckCommand(target: settings.target, identity: settings.identity),
                cwd: nil,
                env: nil,
                timeout: 8)

            guard sshResult.ok else {
                self.remoteStatus = .failed(self.formatSSHFailure(sshResult, target: settings.target))
                return
            }
        }

        // Step 2: control channel health check
        let originalMode = AppStateStore.shared.connectionMode
        do {
            try await ControlChannel.shared.configure(mode: .remote(
                target: settings.target,
                identity: settings.identity))
            let data = try await ControlChannel.shared.health(timeout: 10)
            if decodeHealthSnapshot(from: data) != nil {
                self.remoteStatus = .ok
            } else {
                self.remoteStatus = .failed("O canal de controle retornou um JSON de saúde inválido")
            }
        } catch {
            self.remoteStatus = .failed(error.localizedDescription)
        }

        // Restore original mode if we temporarily switched
        switch originalMode {
        case .remote:
            break
        case .local:
            try? await ControlChannel.shared.configure(mode: .local)
        case .unconfigured:
            await ControlChannel.shared.disconnect()
        }
    }

    private static func isValidWsUrl(_ raw: String) -> Bool {
        guard let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)) else { return false }
        let scheme = url.scheme?.lowercased() ?? ""
        guard scheme == "ws" || scheme == "wss" else { return false }
        let host = url.host?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return !host.isEmpty
    }

    private static func sshCheckCommand(target: String, identity: String) -> [String] {
        var args: [String] = [
            "/usr/bin/ssh",
            "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=5",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", "UpdateHostKeys=yes",
        ]
        if !identity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            args.append(contentsOf: ["-i", identity])
        }
        args.append(target)
        args.append("echo ok")
        return args
    }

    private func formatSSHFailure(_ response: Response, target: String) -> String {
        let payload = response.payload.flatMap { String(data: $0, encoding: .utf8) }
        let trimmed = payload?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: \.isNewline)
            .joined(separator: " ")
        if let trimmed,
           trimmed.localizedCaseInsensitiveContains("host key verification failed")
        {
            let host = CommandResolver.parseSSHTarget(target)?.host ?? target
            return "SSH check failed: Host key verification failed. Remove the old key with " +
                "`ssh-keygen -R \(host)` and try again."
        }
        if let trimmed, !trimmed.isEmpty {
            if let message = response.message, message.hasPrefix("exit ") {
                return "SSH check failed: \(trimmed) (\(message))"
            }
            return "SSH check failed: \(trimmed)"
        }
        if let message = response.message {
            return "SSH check failed (\(message))"
        }
        return "SSH check failed"
    }

    private func revealLogs() {
        let target = LogLocator.bestLogFile()

        if let target {
            NSWorkspace.shared.selectFile(
                target.path,
                inFileViewerRootedAtPath: target.deletingLastPathComponent().path)
            return
        }

        let alert = NSAlert()
        alert.messageText = "Arquivo de registro não encontrado"
        alert.informativeText = """
        Procurou por registros do zero em /tmp/zero/.
        Execute uma verificação de saúde ou envie uma mensagem para gerar atividade, então tente novamente.
        """
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    private func applyDiscoveredGateway(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) {
        MacNodeModeCoordinator.shared.setPreferredGatewayStableID(gateway.stableID)

        let host = gateway.tailnetDns ?? gateway.lanHost
        guard let host else { return }
        let user = NSUserName()
        if self.state.remoteTransport == .direct {
            if let url = GatewayDiscoveryHelpers.directUrl(for: gateway) {
                self.state.remoteUrl = url
            }
        } else {
            self.state.remoteTarget = GatewayDiscoveryModel.buildSSHTarget(
                user: user,
                host: host,
                port: gateway.sshPort)
            self.state.remoteCliPath = gateway.cliPath ?? ""
            ZeroConfigFile.setRemoteGatewayUrl(host: host, port: gateway.gatewayPort)
        }
    }
}

private func healthAgeString(_ ms: Double?) -> String {
    guard let ms else { return "unknown" }
    return msToAge(ms)
}

#if DEBUG
struct GeneralSettings_Previews: PreviewProvider {
    static var previews: some View {
        GeneralSettings(state: .preview)
            .frame(width: SettingsTab.windowWidth, height: SettingsTab.windowHeight)
            .environment(TailscaleService.shared)
    }
}

@MainActor
extension GeneralSettings {
    static func exerciseForTesting() {
        let state = AppState(preview: true)
        state.connectionMode = .remote
        state.remoteTransport = .ssh
        state.remoteTarget = "user@host:2222"
        state.remoteUrl = "wss://gateway.example.ts.net"
        state.remoteIdentity = "/tmp/id_ed25519"
        state.remoteProjectRoot = "/tmp/zero"
        state.remoteCliPath = "/tmp/zero"

        let view = GeneralSettings(state: state)
        view.gatewayStatus = GatewayEnvironmentStatus(
            kind: .ok,
            nodeVersion: "1.0.0",
            gatewayVersion: "1.0.0",
            requiredGateway: nil,
            message: "Gateway ready")
        view.remoteStatus = .failed("SSH failed")
        view.showRemoteAdvanced = true
        _ = view.body

        state.connectionMode = .unconfigured
        _ = view.body

        state.connectionMode = .local
        view.gatewayStatus = GatewayEnvironmentStatus(
            kind: .error("Gateway offline"),
            nodeVersion: nil,
            gatewayVersion: nil,
            requiredGateway: nil,
            message: "Gateway offline")
        _ = view.body
    }
}
#endif
