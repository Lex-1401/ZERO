import Foundation

public enum ZeroChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(ZeroChatEventPayload)
    case agent(ZeroAgentEventPayload)
    case seqGap
}

public protocol ZeroChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> ZeroChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [ZeroChatAttachmentPayload]) async throws -> ZeroChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> ZeroChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<ZeroChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension ZeroChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "ZeroChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> ZeroChatSessionsListResponse {
        throw NSError(
            domain: "ZeroChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
