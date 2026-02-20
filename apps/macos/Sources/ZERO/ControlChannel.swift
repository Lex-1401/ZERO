import ZeroKit
import ZeroProtocol
import Foundation
import Observation
import SwiftUI

struct ControlHeartbeatEvent: Codable {
    let ts: Double
    let status: String
    let to: String?
    let preview: String?
    let durationMs: Double?
    let hasMedia: Bool?
    let reason: String?
}

struct ControlAgentEvent: Codable, Sendable, Identifiable {
    var id: String { "\(self.runId)-\(self.seq)" }
    let runId: String
    let seq: Int
    let stream: String
    let ts: Double
    let data: [String: ZeroProtocol.AnyCodable]
    let summary: String?
}

enum ControlChannelError: Error, LocalizedError {
    case disconnected
    case badResponse(String)

    var errorDescription: String? {
        switch self {
        case .disconnected: "Control channel disconnected"
        case let .badResponse(msg): msg
        }
    }
}

@MainActor
@Observable
final class ControlChannel {
    static let shared = ControlChannel()

    enum Mode {
        case local
        case remote(target: String, identity: String)
    }

    enum ConnectionState: Equatable {
        case disconnected
        case connecting
        case connected
        case degraded(String)
    }

    private(set) var state: ConnectionState = .disconnected {
        didSet {
            CanvasManager.shared.refreshDebugStatus()
            guard oldValue != self.state else { return }
            switch self.state {
            case .connected:
                self.logger.info("control channel state -> connected")
            case .connecting:
                self.logger.info("control channel state -> connecting")
            case .disconnected:
                self.logger.info("control channel state -> disconnected")
                self.scheduleRecovery(reason: "disconnected")
            case let .degraded(message):
                let detail = message.isEmpty ? "degraded" : "degraded: \(message)"
                self.logger.info("control channel state -> \(detail, privacy: .public)")
                self.scheduleRecovery(reason: message)
            }
        }
    }

    private(set) var lastPingMs: Double?
    private(set) var authSourceLabel: String?

    private let logger = Logger(subsystem: "com.zero", category: "control")

    private var eventTask: Task<Void, Never>?
    private var recoveryTask: Task<Void, Never>?
    private var lastRecoveryAt: Date?

    private init() {
        self.startEventStream()
    }

    func configure() async {
        self.logger.info("control channel configure mode=local")
        await self.refreshEndpoint(reason: "configure")
    }

    func configure(mode: Mode = .local) async throws {
        switch mode {
        case .local:
            await self.configure()
        case let .remote(target, identity):
            do {
                _ = (target, identity)
                let idSet = !identity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                self.logger.info(
                    "control channel configure mode=remote " +
                        "target=\(target, privacy: .public) identitySet=\(idSet, privacy: .public)")
                self.state = .connecting
                _ = try await GatewayEndpointStore.shared.ensureRemoteControlTunnel()
                await self.refreshEndpoint(reason: "configure")
            } catch {
                self.state = .degraded(error.localizedDescription)
                throw error
            }
        }
    }

    func refreshEndpoint(reason: String) async {
        self.logger.info("control channel refresh endpoint reason=\(reason, privacy: .public)")
        self.state = .connecting
        do {
            try await self.establishGatewayConnection()
            self.state = .connected
            PresenceReporter.shared.sendImmediate(reason: "connect")
        } catch {
            let message = self.friendlyGatewayMessage(error)
            self.state = .degraded(message)
        }
    }

    func disconnect() async {
        await GatewayConnection.shared.shutdown()
        self.state = .disconnected
        self.lastPingMs = nil
        self.authSourceLabel = nil
    }

    func health(timeout: TimeInterval? = nil) async throws -> Data {
        do {
            let start = Date()
            var params: [String: AnyHashable]?
            if let timeout {
                params = ["timeout": AnyHashable(Int(timeout * 1000))]
            }
            let timeoutMs = (timeout ?? 15) * 1000
            let payload = try await self.request(method: "health", params: params, timeoutMs: timeoutMs)
            let ms = Date().timeIntervalSince(start) * 1000
            self.lastPingMs = ms
            self.state = .connected
            return payload
        } catch {
            let message = self.friendlyGatewayMessage(error)
            self.state = .degraded(message)
            throw ControlChannelError.badResponse(message)
        }
    }

    func lastHeartbeat() async throws -> ControlHeartbeatEvent? {
        let data = try await self.request(method: "last-heartbeat")
        return try JSONDecoder().decode(ControlHeartbeatEvent?.self, from: data)
    }

    func request(
        method: String,
        params: [String: AnyHashable]? = nil,
        timeoutMs: Double? = nil) async throws -> Data
    {
        do {
            let rawParams = params?.reduce(into: [String: ZeroKit.AnyCodable]()) {
                $0[$1.key] = ZeroKit.AnyCodable($1.value.base)
            }
            let data = try await GatewayConnection.shared.request(
                method: method,
                params: rawParams,
                timeoutMs: timeoutMs)
            self.state = .connected
            return data
        } catch {
            let message = self.friendlyGatewayMessage(error)
            self.state = .degraded(message)
            throw ControlChannelError.badResponse(message)
        }
    }

    private func friendlyGatewayMessage(_ error: Error) -> String {
        // Mapeia erros de URLSession/WS em texto acionável e voltado para o usuário.
        if let ctrlErr = error as? ControlChannelError, let desc = ctrlErr.errorDescription {
            return desc
        }

        // Se o gateway rejeitar explicitamente o hello (ex: incompatibilidade de auth/token), exibe isso.
        if let urlErr = error as? URLError,
           urlErr.code == .dataNotAllowed // usado para falhas de auth WS close 1008
        {
            let reason = urlErr.failureURLString ?? urlErr.localizedDescription
            let tokenKey = CommandResolver.connectionModeIsRemote()
                ? "gateway.remote.token"
                : "gateway.auth.token"
            return
                "Gateway rejeitou o token; defina \(tokenKey) (ou ZERO_GATEWAY_TOKEN) " +
                "ou limpe-o no gateway. " +
                "Motivo: \(reason)"
        }

        // Erro comum: conectamos na porta localhost configurada, mas ela está ocupada
        // por outro processo (ex: um gateway de desenvolvimento local ou um encaminhamento SSH travado).
        // O handshake do gateway retorna algo que não podemos processar.
        let nsError = error as NSError
        if nsError.domain == "Gateway",
           nsError.localizedDescription.contains("hello failed (unexpected response)")
        {
            let port = GatewayEnvironment.gatewayPort()
            return """
            Handshake do Gateway recebeu dados inesperados em localhost:\(port).
            Outro processo está usando essa porta ou o encaminhamento SSH falhou.
            Pare o gateway local ou encaminhamento de porta em \(port) e tente o modo Remoto novamente.
            """
        }

        if let urlError = error as? URLError {
            let port = GatewayEnvironment.gatewayPort()
            switch urlError.code {
            case .cancelled:
                return "A conexão com o Gateway foi encerrada; inicie o gateway (localhost:\(port)) e tente novamente."
            case .cannotFindHost, .cannotConnectToHost:
                let isRemote = CommandResolver.connectionModeIsRemote()
                if isRemote {
                    return """
                    Não foi possível alcançar o gateway em localhost:\(port).
                    O modo Remoto usa um túnel SSH — verifique o destino SSH e se o túnel está em execução.
                    """
                }
                return "Não foi possível alcançar o gateway em localhost:\(port); certifique-se de que o gateway esteja em execução."
            case .networkConnectionLost:
                return "A conexão com o Gateway caiu; o gateway provavelmente reiniciou — tente novamente."
            case .timedOut:
                return "A requisição ao Gateway expirou; verifique o gateway em localhost:\(port)."
            case .notConnectedToInternet:
                return "Sem conectividade de rede; não foi possível alcançar o gateway."
            default:
                break
            }
        }

        if nsError.domain == "Gateway", nsError.code == 5 {
            let port = GatewayEnvironment.gatewayPort()
            return "A requisição ao Gateway expirou; verifique o processo do gateway em localhost:\(port)."
        }

        let detail = nsError.localizedDescription.isEmpty ? "erro desconhecido do gateway" : nsError.localizedDescription
        let trimmed = detail.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.lowercased().hasPrefix("gateway error:") { return trimmed }
        return "Erro no Gateway: \(trimmed)"
    }

    private func scheduleRecovery(reason: String) {
        let now = Date()
        if let last = self.lastRecoveryAt, now.timeIntervalSince(last) < 10 { return }
        guard self.recoveryTask == nil else { return }
        self.lastRecoveryAt = now

        self.recoveryTask = Task { [weak self] in
            guard let self else { return }
            let mode = await MainActor.run { AppStateStore.shared.connectionMode }
            guard mode != .unconfigured else {
                self.recoveryTask = nil
                return
            }

            let trimmedReason = reason.trimmingCharacters(in: .whitespacesAndNewlines)
            let reasonText = trimmedReason.isEmpty ? "unknown" : trimmedReason
            self.logger.info(
                "control channel recovery starting " +
                    "mode=\(String(describing: mode), privacy: .public) " +
                    "reason=\(reasonText, privacy: .public)")
            if mode == .local {
                GatewayProcessManager.shared.setActive(true)
            }
            if mode == .remote {
                do {
                    let port = try await GatewayEndpointStore.shared.ensureRemoteControlTunnel()
                    self.logger.info("control channel recovery ensured SSH tunnel port=\(port, privacy: .public)")
                } catch {
                    self.logger.error(
                        "control channel recovery tunnel failed \(error.localizedDescription, privacy: .public)")
                }
            }

            await self.refreshEndpoint(reason: "recovery:\(reasonText)")
            if case .connected = self.state {
                self.logger.info("control channel recovery finished")
            } else if case let .degraded(message) = self.state {
                self.logger.error("control channel recovery failed \(message, privacy: .public)")
            }

            self.recoveryTask = nil
        }
    }

    private func establishGatewayConnection(timeoutMs: Int = 5000) async throws {
        try await GatewayConnection.shared.refresh()
        let ok = try await GatewayConnection.shared.healthOK(timeoutMs: timeoutMs)
        if ok == false {
            throw NSError(
                domain: "Gateway",
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "gateway health not ok"])
        }
        await self.refreshAuthSourceLabel()
    }

    private func refreshAuthSourceLabel() async {
        let isRemote = CommandResolver.connectionModeIsRemote()
        let authSource = await GatewayConnection.shared.authSource()
        self.authSourceLabel = Self.formatAuthSource(authSource, isRemote: isRemote)
    }

    private static func formatAuthSource(_ source: GatewayAuthSource?, isRemote: Bool) -> String? {
        guard let source else { return nil }
        switch source {
        case .deviceToken:
            return "Autenticação: token de dispositivo (dispositivo emparelhado)"
        case .sharedToken:
            return "Autenticação: token compartilhado (\(isRemote ? "gateway.remote.token" : "gateway.auth.token"))"
        case .password:
            return "Autenticação: senha (\(isRemote ? "gateway.remote.password" : "gateway.auth.password"))"
        case .none:
            return "Autenticação: nenhuma"
        }
    }

    func sendSystemEvent(_ text: String, params: [String: AnyHashable] = [:]) async throws {
        var merged = params
        merged["text"] = AnyHashable(text)
        _ = try await self.request(method: "system-event", params: merged)
    }

    private func startEventStream() {
        self.eventTask?.cancel()
        self.eventTask = Task { [weak self] in
            guard let self else { return }
            let stream = await GatewayConnection.shared.subscribe()
            for await push in stream {
                if Task.isCancelled { return }
                await MainActor.run { [weak self] in
                    self?.handle(push: push)
                }
            }
        }
    }

    private func handle(push: GatewayPush) {
        switch push {
        case let .event(evt) where evt.event == "agent":
            if let payload = evt.payload,
               let agent = try? GatewayPayloadDecoding.decode(payload, as: ControlAgentEvent.self)
            {
                AgentEventStore.shared.append(agent)
                self.routeWorkActivity(from: agent)
            }
        case let .event(evt) where evt.event == "heartbeat":
            if let payload = evt.payload,
               let heartbeat = try? GatewayPayloadDecoding.decode(payload, as: ControlHeartbeatEvent.self),
               let data = try? JSONEncoder().encode(heartbeat)
            {
                NotificationCenter.default.post(name: .controlHeartbeat, object: data)
            }
        case let .event(evt) where evt.event == "shutdown":
            self.state = .degraded("gateway shutdown")
        case .snapshot:
            self.state = .connected
        default:
            break
        }
    }

    private func routeWorkActivity(from event: ControlAgentEvent) {
        // We currently treat VoiceWake as the "main" session for UI purposes.
        // In the future, the gateway can include a sessionKey to distinguish runs.
        let sessionKey = (event.data["sessionKey"]?.value as? String) ?? "main"

        switch event.stream.lowercased() {
        case "job":
            if let state = event.data["state"]?.value as? String {
                WorkActivityStore.shared.handleJob(sessionKey: sessionKey, state: state)
            }
        case "tool":
            let phase = event.data["phase"]?.value as? String ?? ""
            let name = event.data["name"]?.value as? String
            let meta = event.data["meta"]?.value as? String
            let args = Self.bridgeToProtocolArgs(event.data["args"])
            WorkActivityStore.shared.handleTool(
                sessionKey: sessionKey,
                phase: phase,
                name: name,
                meta: meta,
                args: args)
        default:
            break
        }
    }

    private static func bridgeToProtocolArgs(
        _ value: ZeroProtocol.AnyCodable?) -> [String: ZeroProtocol.AnyCodable]?
    {
        guard let value else { return nil }
        if let dict = value.value as? [String: ZeroProtocol.AnyCodable] {
            return dict
        }
        if let dict = value.value as? [String: ZeroKit.AnyCodable],
           let data = try? JSONEncoder().encode(dict),
           let decoded = try? JSONDecoder().decode([String: ZeroProtocol.AnyCodable].self, from: data)
        {
            return decoded
        }
        if let data = try? JSONEncoder().encode(value),
           let decoded = try? JSONDecoder().decode([String: ZeroProtocol.AnyCodable].self, from: data)
        {
            return decoded
        }
        return nil
    }
}

extension Notification.Name {
    static let controlHeartbeat = Notification.Name("zero.control.heartbeat")
    static let controlAgentEvent = Notification.Name("zero.control.agent")
}
