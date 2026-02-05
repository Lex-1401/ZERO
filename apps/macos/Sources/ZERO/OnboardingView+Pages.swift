import AppKit
import ZeroChatUI
import ZeroDiscovery
import ZeroIPC
import SwiftUI

extension OnboardingView {
    @ViewBuilder
    func pageView(for pageIndex: Int) -> some View {
        switch pageIndex {
        case 0:
            self.welcomePage()
        case 1:
            self.connectionPage()
        case 2:
            self.anthropicAuthPage()
        case 3:
            self.wizardPage()
        case 5:
            self.permissionsPage()
        case 6:
            self.cliPage()
        case 8:
            self.onboardingChatPage()
        case 9:
            self.readyPage()
        default:
            EmptyView()
        }
    }

    func welcomePage() -> some View {
        self.onboardingPage {
            VStack(spacing: 22) {
                Text("Bem-vindo ao Zero")
                    .font(.largeTitle.weight(.semibold))
                Text("O Zero é um poderoso assistente pessoal de IA que pode se conectar ao WhatsApp ou Telegram.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .frame(maxWidth: 560)
                    .fixedSize(horizontal: false, vertical: true)

                self.onboardingCard(spacing: 10, padding: 14) {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(Color(nsColor: .systemOrange))
                            .frame(width: 22)
                            .padding(.top, 1)

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Aviso de segurança")
                                .font(.headline)
                            Text(
                                "O agente de IA conectado (ex: Claude) pode acionar ações poderosas no seu Mac, " +
                                    "incluindo executar comandos, ler/gravar arquivos e capturar capturas de tela — " +
                                    "dependendo das permissões que você conceder.\n\n" +
                                    "Ative o Zero apenas se entender os riscos e confiar nos comandos e " +
                                    "integrações que você utiliza.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .frame(maxWidth: 520)
            }
            .padding(.top, 16)
        }
    }

    func connectionPage() -> some View {
        self.onboardingPage {
            Text("Escolha seu Gateway")
                .font(.largeTitle.weight(.semibold))
            Text(
                "O Zero usa um único Gateway que permanece em execução. Escolha este Mac, " +
                    "conecte-se a um gateway descoberto por perto ou configure mais tarde.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .frame(maxWidth: 520)
                .fixedSize(horizontal: false, vertical: true)

            self.onboardingCard(spacing: 12, padding: 14) {
                VStack(alignment: .leading, spacing: 10) {
                    let localSubtitle: String = {
                        guard let probe = self.localGatewayProbe else {
                            return "O Gateway inicia automaticamente neste Mac."
                        }
                        let base = probe.expected
                            ? "Gateway existente detectado"
                            : "Porta \(probe.port) já está em uso"
                        let command = probe.command.isEmpty ? "" : " (\(probe.command) pid \(probe.pid))"
                        return "\(base)\(command). Irá anexar."
                    }()
                    self.connectionChoiceButton(
                        title: "Este Mac",
                        subtitle: localSubtitle,
                        selected: self.state.connectionMode == .local)
                    {
                        self.selectLocalGateway()
                    }

                    Divider().padding(.vertical, 4)

                    HStack(spacing: 8) {
                        Image(systemName: "dot.radiowaves.left.and.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(self.gatewayDiscovery.statusText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if self.gatewayDiscovery.gateways.isEmpty {
                            ProgressView().controlSize(.small)
                            Button("Atualizar") {
                                self.gatewayDiscovery.refreshWideAreaFallbackNow(timeoutSeconds: 5.0)
                            }
                            .buttonStyle(.link)
                            .help("Retry Tailscale discovery (DNS-SD).")
                        }
                        Spacer(minLength: 0)
                    }

                    if self.gatewayDiscovery.gateways.isEmpty {
                        Text("Procurando gateways próximos…")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.leading, 4)
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Gateways próximos")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .padding(.leading, 4)
                            ForEach(self.gatewayDiscovery.gateways.prefix(6)) { gateway in
                                self.connectionChoiceButton(
                                    title: gateway.displayName,
                                    subtitle: self.gatewaySubtitle(for: gateway),
                                    selected: self.isSelectedGateway(gateway))
                                {
                                    self.selectRemoteGateway(gateway)
                                }
                            }
                        }
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color(NSColor.controlBackgroundColor)))
                    }

                    self.connectionChoiceButton(
                        title: "Configurar depois",
                        subtitle: "Não iniciar o Gateway ainda.",
                        selected: self.state.connectionMode == .unconfigured)
                    {
                        self.selectUnconfiguredGateway()
                    }

                    Button(self.showAdvancedConnection ? "Ocultar Avançado" : "Avançado…") {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.9)) {
                            self.showAdvancedConnection.toggle()
                        }
                        if self.showAdvancedConnection, self.state.connectionMode != .remote {
                            self.state.connectionMode = .remote
                        }
                    }
                    .buttonStyle(.link)

                    if self.showAdvancedConnection {
                        let labelWidth: CGFloat = 110
                        let fieldWidth: CGFloat = 320

                        VStack(alignment: .leading, spacing: 10) {
                            Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 8) {
                                GridRow {
                                    Text("Transporte")
                                        .font(.callout.weight(.semibold))
                                        .frame(width: labelWidth, alignment: .leading)
                                    Picker("Transporte", selection: self.$state.remoteTransport) {
                                        Text("Túnel SSH").tag(AppState.RemoteTransport.ssh)
                                        Text("Direto (ws/wss)").tag(AppState.RemoteTransport.direct)
                                    }
                                    .pickerStyle(.segmented)
                                    .frame(width: fieldWidth)
                                }
                                if self.state.remoteTransport == .direct {
                                    GridRow {
                                        Text("URL do Gateway")
                                            .font(.callout.weight(.semibold))
                                            .frame(width: labelWidth, alignment: .leading)
                                        TextField("wss://gateway.example.ts.net", text: self.$state.remoteUrl)
                                            .textFieldStyle(.roundedBorder)
                                            .frame(width: fieldWidth)
                                    }
                                }
                                if self.state.remoteTransport == .ssh {
                                    GridRow {
                                        Text("Alvo SSH")
                                            .font(.callout.weight(.semibold))
                                            .frame(width: labelWidth, alignment: .leading)
                                        TextField("user@host[:port]", text: self.$state.remoteTarget)
                                            .textFieldStyle(.roundedBorder)
                                            .frame(width: fieldWidth)
                                    }
                                    GridRow {
                                        Text("Arquivo de identidade")
                                            .font(.callout.weight(.semibold))
                                            .frame(width: labelWidth, alignment: .leading)
                                        TextField("/Users/you/.ssh/id_ed25519", text: self.$state.remoteIdentity)
                                            .textFieldStyle(.roundedBorder)
                                            .frame(width: fieldWidth)
                                    }
                                    GridRow {
                                        Text("Raiz do projeto")
                                            .font(.callout.weight(.semibold))
                                            .frame(width: labelWidth, alignment: .leading)
                                        TextField("/home/you/Projects/zero", text: self.$state.remoteProjectRoot)
                                            .textFieldStyle(.roundedBorder)
                                            .frame(width: fieldWidth)
                                    }
                                    GridRow {
                                        Text("Caminho da CLI")
                                            .font(.callout.weight(.semibold))
                                            .frame(width: labelWidth, alignment: .leading)
                                        TextField(
                                            "/Applications/Zero.app/.../zero",
                                            text: self.$state.remoteCliPath)
                                            .textFieldStyle(.roundedBorder)
                                            .frame(width: fieldWidth)
                                    }
                                }
                            }

                            Text(self.state.remoteTransport == .direct
                                ? "Dica: use o Tailscale Serve para que o gateway tenha um certificado HTTPS válido."
                                : "Dica: mantenha o Tailscale ativado para que seu gateway permaneça acessível.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }
            }
        }
    }

    func gatewaySubtitle(for gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String? {
        if self.state.remoteTransport == .direct {
            return GatewayDiscoveryHelpers.directUrl(for: gateway) ?? "Apenas emparelhamento de Gateway"
        }
        if let host = GatewayDiscoveryHelpers.sanitizedTailnetHost(gateway.tailnetDns) ?? gateway.lanHost {
            let portSuffix = gateway.sshPort != 22 ? " · ssh \(gateway.sshPort)" : ""
            return "\(host)\(portSuffix)"
        }
        return "Apenas emparelhamento de Gateway"
    }

    func isSelectedGateway(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) -> Bool {
        guard self.state.connectionMode == .remote else { return false }
        let preferred = self.preferredGatewayID ?? GatewayDiscoveryPreferences.preferredStableID()
        return preferred == gateway.stableID
    }

    func connectionChoiceButton(
        title: String,
        subtitle: String?,
        selected: Bool,
        action: @escaping () -> Void) -> some View
    {
        Button {
            withAnimation(.spring(response: 0.25, dampingFraction: 0.9)) {
                action()
            }
        } label: {
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.callout.weight(.semibold))
                        .lineLimit(1)
                        .truncationMode(.tail)
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                    }
                }
                Spacer(minLength: 0)
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.accentColor)
                } else {
                    Image(systemName: "arrow.right.circle")
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(selected ? Color.accentColor.opacity(0.12) : Color.clear))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(
                        selected ? Color.accentColor.opacity(0.45) : Color.clear,
                        lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    func anthropicAuthPage() -> some View {
        self.onboardingPage {
            Text("Conectar Claude")
                .font(.largeTitle.weight(.semibold))
            Text("Dê ao seu modelo o token que ele precisa!")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 540)
                .fixedSize(horizontal: false, vertical: true)
            Text("O Zero suporta qualquer modelo — recomendamos fortemente o Opus 4.5 para a melhor experiência.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 540)
                .fixedSize(horizontal: false, vertical: true)

            self.onboardingCard(spacing: 12, padding: 16) {
                HStack(alignment: .center, spacing: 10) {
                    Circle()
                        .fill(self.anthropicAuthVerified ? Color.green : Color.orange)
                        .frame(width: 10, height: 10)
                    Text(
                        self.anthropicAuthConnected
                            ? (self.anthropicAuthVerified
                                ? "Claude conectado (OAuth) — verificado"
                                : "Claude conectado (OAuth)")
                            : "Não conectado ainda")
                        .font(.headline)
                    Spacer()
                }

                if self.anthropicAuthConnected, self.anthropicAuthVerifying {
                    Text("Verificando OAuth…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else if !self.anthropicAuthConnected {
                    Text(self.anthropicAuthDetectedStatus.shortDescription)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else if self.anthropicAuthVerified, let date = self.anthropicAuthVerifiedAt {
                    Text("OAuth funcional detectado (\(date.formatted(date: .abbreviated, time: .shortened))).")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Text(
                    "Isto permite que o Zero use o Claude imediatamente. As credenciais são armazenadas em " +
                        "`~/.zero/credentials/oauth.json` (apenas para o proprietário).")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 12) {
                    Text(ZeroOAuthStore.oauthURL().path)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)

                    Spacer()

                    Button("Revelar") {
                        NSWorkspace.shared.activateFileViewerSelecting([ZeroOAuthStore.oauthURL()])
                    }
                    .buttonStyle(.bordered)

                    Button("Atualizar") {
                        self.refreshAnthropicOAuthStatus()
                    }
                    .buttonStyle(.bordered)
                }

                Divider().padding(.vertical, 2)

                HStack(spacing: 12) {
                    if !self.anthropicAuthVerified {
                        if self.anthropicAuthConnected {
                            Button("Verificar") {
                                Task { await self.verifyAnthropicOAuthIfNeeded(force: true) }
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(self.anthropicAuthBusy || self.anthropicAuthVerifying)

                            if self.anthropicAuthVerificationFailed {
                                Button("Reautenticar (OAuth)") {
                                    self.startAnthropicOAuth()
                                }
                                .buttonStyle(.bordered)
                                .disabled(self.anthropicAuthBusy || self.anthropicAuthVerifying)
                            }
                        } else {
                            Button {
                                self.startAnthropicOAuth()
                            } label: {
                                if self.anthropicAuthBusy {
                                    ProgressView()
                                } else {
                                    Text("Abrir login do Claude (OAuth)")
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(self.anthropicAuthBusy)
                        }
                    }
                }

                if !self.anthropicAuthVerified, self.anthropicAuthPKCE != nil {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Cole o valor `code#state`")
                            .font(.headline)
                        TextField("code#state", text: self.$anthropicAuthCode)
                            .textFieldStyle(.roundedBorder)

                        Toggle("Autodetectar da área de transferência", isOn: self.$anthropicAuthAutoDetectClipboard)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .disabled(self.anthropicAuthBusy)

                        Toggle("Autoconectar quando detectado", isOn: self.$anthropicAuthAutoConnectClipboard)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .disabled(self.anthropicAuthBusy)

                        Button("Conectar") {
                            Task { await self.finishAnthropicOAuth() }
                        }
                        .buttonStyle(.bordered)
                        .disabled(
                            self.anthropicAuthBusy ||
                                self.anthropicAuthCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    .onReceive(Self.clipboardPoll) { _ in
                        self.pollAnthropicClipboardIfNeeded()
                    }
                }

                self.onboardingCard(spacing: 8, padding: 12) {
                    Text("Chave de API (avançado)")
                        .font(.headline)
                    Text(
                        "Você também pode usar uma chave de API da Anthropic, mas esta interface é apenas instrutiva por enquanto " +
                            "(aplicativos GUI não herdam automaticamente suas variáveis de ambiente de shell como `ANTHROPIC_API_KEY`).")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .shadow(color: .clear, radius: 0)
                .background(Color.clear)

                if let status = self.anthropicAuthStatus {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .task { await self.verifyAnthropicOAuthIfNeeded() }
    }

    func permissionsPage() -> some View {
        self.onboardingPage {
            Text("Conceder permissões")
                .font(.largeTitle.weight(.semibold))
            Text("Essas permissões do macOS permitem que o Zero automatize aplicativos e capture o contexto neste Mac.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 520)
                .fixedSize(horizontal: false, vertical: true)

            self.onboardingCard(spacing: 8, padding: 12) {
                ForEach(Capability.allCases, id: \.self) { cap in
                    PermissionRow(
                        capability: cap,
                        status: self.permissionMonitor.status[cap] ?? false,
                        compact: true)
                    {
                        Task { await self.request(cap) }
                    }
                }

                HStack(spacing: 12) {
                    Button {
                        Task { await self.refreshPerms() }
                    } label: {
                        Label("Atualizar", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .help("Atualizar status")
                    if self.isRequesting {
                        ProgressView()
                            .controlSize(.small)
                    }
                }
                .padding(.top, 4)
            }
        }
    }

    func cliPage() -> some View {
        self.onboardingPage {
            Text("Instalar a CLI")
                .font(.largeTitle.weight(.semibold))
            Text("Necessário para o modo local: instala o `zero` para que o launchd possa executar o gateway.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 520)
                .fixedSize(horizontal: false, vertical: true)

            self.onboardingCard(spacing: 10) {
                HStack(spacing: 12) {
                    Button {
                        Task { await self.installCLI() }
                    } label: {
                        let title = self.cliInstalled ? "Reinstalar CLI" : "Instalar CLI"
                        ZStack {
                            Text(title)
                                .opacity(self.installingCLI ? 0 : 1)
                            if self.installingCLI {
                                ProgressView()
                                    .controlSize(.mini)
                            }
                        }
                        .frame(minWidth: 120)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(self.installingCLI)

                    Button(self.copied ? "Copiado" : "Copiar comando de instalação") {
                        self.copyToPasteboard(self.devLinkCommand)
                    }
                    .disabled(self.installingCLI)

                    if self.cliInstalled, let loc = self.cliInstallLocation {
                        Label("Instalado em \(loc)", systemImage: "checkmark.circle.fill")
                            .font(.footnote)
                            .foregroundStyle(.green)
                    }
                }

                if let cliStatus {
                    Text(cliStatus)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else if !self.cliInstalled, self.cliInstallLocation == nil {
                    Text(
                        """
                        Instala um ambiente de execução Node 22+ em espaço de usuário e a CLI (sem Homebrew).
                        Execute novamente a qualquer momento para reinstalar ou atualizar.
                        """)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    func workspacePage() -> some View {
        self.onboardingPage {
            Text("Espaço de trabalho do agente")
                .font(.largeTitle.weight(.semibold))
            Text(
                "O Zero executa o agente a partir de um espaço de trabalho dedicado para que possa carregar o `AGENTS.md` " +
                    "e gravar arquivos lá sem se misturar com seus outros projetos.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 560)
                .fixedSize(horizontal: false, vertical: true)

            self.onboardingCard(spacing: 10) {
                if self.state.connectionMode == .remote {
                    Text("Gateway remoto detectado")
                        .font(.headline)
                    Text(
                        "Crie o espaço de trabalho no host remoto (acesse via SSH primeiro). " +
                            "O aplicativo macOS ainda não consegue gravar arquivos no seu gateway via SSH.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Button(self.copied ? "Copiado" : "Copiar comando de configuração") {
                        self.copyToPasteboard(self.workspaceBootstrapCommand)
                    }
                    .buttonStyle(.bordered)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pasta do espaço de trabalho")
                            .font(.headline)
                        TextField(
                            AgentWorkspace.displayPath(for: ZeroConfigFile.defaultWorkspaceURL()),
                            text: self.$workspacePath)
                            .textFieldStyle(.roundedBorder)

                        HStack(spacing: 12) {
                            Button {
                                Task { await self.applyWorkspace() }
                            } label: {
                                if self.workspaceApplying {
                                    ProgressView()
                                } else {
                                    Text("Criar espaço de trabalho")
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(self.workspaceApplying)

                            Button("Abrir pasta") {
                                let url = AgentWorkspace.resolveWorkspaceURL(from: self.workspacePath)
                                NSWorkspace.shared.open(url)
                            }
                            .buttonStyle(.bordered)
                            .disabled(self.workspaceApplying)

                            Button("Salvar na configuração") {
                                Task {
                                    let url = AgentWorkspace.resolveWorkspaceURL(from: self.workspacePath)
                                    let saved = await self.saveAgentWorkspace(AgentWorkspace.displayPath(for: url))
                                    if saved {
                                        self.workspaceStatus =
                                            "Salvo em ~/.zero/zero.json (agents.defaults.workspace)"
                                    }
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(self.workspaceApplying)
                        }
                    }

                    if let workspaceStatus {
                        Text(workspaceStatus)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    } else {
                        Text(
                            "Dica: edite o AGENTS.md nesta pasta para moldar o comportamento do assistente. " +
                                "Para backup, torne o espaço de trabalho um repositório git privado para que a " +
                                "“memória” do seu agente seja versionada.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
            }
        }
    }

    func onboardingChatPage() -> some View {
        VStack(spacing: 16) {
            Text("Conheça seu agente")
                .font(.largeTitle.weight(.semibold))
            Text(
                "Este é um chat de integração dedicado. Seu agente se apresentará, " +
                    "aprenderá quem você é e ajudará você a conectar o WhatsApp ou Telegram se desejar.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 520)
                .fixedSize(horizontal: false, vertical: true)

            self.onboardingGlassCard(padding: 8) {
                ZeroChatView(viewModel: self.onboardingChatModel, style: .onboarding)
                    .frame(maxHeight: .infinity)
            }
            .frame(maxHeight: .infinity)
        }
        .padding(.horizontal, 28)
        .frame(width: self.pageWidth, height: self.contentHeight, alignment: .top)
    }

    func readyPage() -> some View {
        self.onboardingPage {
            Text("Tudo pronto")
                .font(.largeTitle.weight(.semibold))
            self.onboardingCard {
                if self.state.connectionMode == .unconfigured {
                    self.featureRow(
                        title: "Configurar depois",
                        subtitle: "Escolha Local ou Remoto nos Ajustes → Geral quando estiver pronto.",
                        systemImage: "gearshape")
                    Divider()
                        .padding(.vertical, 6)
                }
                if self.state.connectionMode == .remote {
                    self.featureRow(
                        title: "Checklist do gateway remoto",
                        subtitle: """
                        No seu host gateway: instale/atualize o pacote `zero` e certifique-se de que as credenciais existam
                        (tipicamente `~/.zero/credentials/oauth.json`). Então conecte-se novamente se necessário.
                        """,
                        systemImage: "network")
                    Divider()
                        .padding(.vertical, 6)
                }
                self.featureRow(
                    title: "Abra o painel da barra de menus",
                    subtitle: "Clique no ícone do Zero na barra de menus para chat rápido e status.",
                    systemImage: "bubble.left.and.bubble.right")
                self.featureActionRow(
                    title: "Conectar WhatsApp ou Telegram",
                    subtitle: "Abra Ajustes → Canais para vincular canais e monitorar o status.",
                    systemImage: "link",
                    buttonTitle: "Abrir Ajustes → Canais")
                {
                    self.openSettings(tab: .channels)
                }
                self.featureRow(
                    title: "Experimente a Ativação por Voz",
                    subtitle: "Ative a Ativação por Voz nos Ajustes para comandos mãos-livres com uma sobreposição de transcrição ao vivo.",
                    systemImage: "waveform.circle")
                self.featureRow(
                    title: "Use o painel + Canvas",
                    subtitle: "Abra o painel da barra de menus para chat rápido; o agente pode mostrar prévias " +
                        "e visuais mais ricos no Canvas.",
                    systemImage: "rectangle.inset.filled.and.person.filled")
                self.featureActionRow(
                    title: "Dê mais poderes ao seu agente",
                    subtitle: "Ative habilidades opcionais (Peekaboo, oracle, camsnap, …) em Ajustes → Habilidades.",
                    systemImage: "sparkles",
                    buttonTitle: "Abrir Ajustes → Habilidades")
                {
                    self.openSettings(tab: .skills)
                }
                self.skillsOverview
                Toggle("Iniciar ao fazer login", isOn: self.$state.launchAtLogin)
                    .onChange(of: self.state.launchAtLogin) { _, newValue in
                        AppStateStore.updateLaunchAtLogin(enabled: newValue)
                    }
            }
        }
        .task { await self.maybeLoadOnboardingSkills() }
    }

    private func maybeLoadOnboardingSkills() async {
        guard !self.didLoadOnboardingSkills else { return }
        self.didLoadOnboardingSkills = true
        await self.onboardingSkillsModel.refresh()
    }

    private var skillsOverview: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()
                .padding(.vertical, 6)

            HStack(spacing: 10) {
                Text("Habilidades incluídas")
                    .font(.headline)
                Spacer(minLength: 0)
                if self.onboardingSkillsModel.isLoading {
                    ProgressView()
                        .controlSize(.small)
                } else {
                    Button("Atualizar") {
                        Task { await self.onboardingSkillsModel.refresh() }
                    }
                    .buttonStyle(.link)
                }
            }

            if let error = self.onboardingSkillsModel.error {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Não foi possível carregar as habilidades do Gateway.")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.orange)
                    Text(
                        "Certifique-se de que o Gateway esteja em execução e conectado, " +
                            "em seguida, clique em Atualizar (ou abra Ajustes → Habilidades).")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Detalhes: \(error)")
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            } else if self.onboardingSkillsModel.skills.isEmpty {
                Text("Nenhuma habilidade relatada ainda.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 10) {
                        ForEach(self.onboardingSkillsModel.skills) { skill in
                            HStack(alignment: .top, spacing: 10) {
                                Text(skill.emoji ?? "✨")
                                    .font(.callout)
                                    .frame(width: 22, alignment: .leading)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(skill.name)
                                        .font(.callout.weight(.semibold))
                                    Text(skill.description)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                Spacer(minLength: 0)
                            }
                        }
                    }
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color(NSColor.windowBackgroundColor)))
                }
                .frame(maxHeight: 160)
            }
        }
    }
}
