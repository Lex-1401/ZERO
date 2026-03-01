import ZeroChatUI
import ZeroProtocol
import Testing
@testable import Zero

@Suite struct MacGatewayChatTransportMappingTests {
    @Test func snapshotMapsToHealthAndReconnected() {
        let snapshot = Snapshot(
            presence: [],
            health: ZeroProtocol.AnyCodable(["ok": ZeroProtocol.AnyCodable(false)]),
            stateversion: StateVersion(presence: 1, health: 1),
            uptimems: 123,
            configpath: nil,
            statedir: nil,
            sessiondefaults: nil)

        let hello = HelloOk(
            type: "hello",
            _protocol: 2,
            server: [:],
            features: [:],
            snapshot: snapshot,
            canvashosturl: nil,
            auth: nil,
            policy: [:])

        let mapped = MacGatewayChatTransport.mapPushToTransportEvents(.snapshot(hello))
        #expect(mapped.count == 2)
        switch mapped[0] {
        case let .health(ok):
            #expect(ok == false)
        default:
            Issue.record("expected .health as first event from snapshot, got \(String(describing: mapped[0]))")
        }
        switch mapped[1] {
        case .reconnected:
            break // expected
        default:
            Issue.record("expected .reconnected as second event from snapshot, got \(String(describing: mapped[1]))")
        }
    }

    @Test func healthEventMapsToHealth() {
        let frame = EventFrame(
            type: "event",
            event: "health",
            payload: ZeroProtocol.AnyCodable(["ok": ZeroProtocol.AnyCodable(true)]),
            seq: 1,
            stateversion: nil)

        let mapped = MacGatewayChatTransport.mapPushToTransportEvents(.event(frame))
        #expect(mapped.count == 1)
        switch mapped[0] {
        case let .health(ok):
            #expect(ok == true)
        default:
            Issue.record("expected .health from health event, got \(String(describing: mapped[0]))")
        }
    }

    @Test func tickEventMapsToTick() {
        let frame = EventFrame(type: "event", event: "tick", payload: nil, seq: 1, stateversion: nil)
        let mapped = MacGatewayChatTransport.mapPushToTransportEvents(.event(frame))
        #expect(mapped.count == 1)
        #expect({
            if case .tick = mapped[0] { return true }
            return false
        }())
    }

    @Test func chatEventMapsToChat() {
        let payload = ZeroProtocol.AnyCodable([
            "runId": ZeroProtocol.AnyCodable("run-1"),
            "sessionKey": ZeroProtocol.AnyCodable("main"),
            "state": ZeroProtocol.AnyCodable("final"),
        ])
        let frame = EventFrame(type: "event", event: "chat", payload: payload, seq: 1, stateversion: nil)
        let mapped = MacGatewayChatTransport.mapPushToTransportEvents(.event(frame))
        #expect(mapped.count == 1)

        switch mapped[0] {
        case let .chat(chat):
            #expect(chat.runId == "run-1")
            #expect(chat.sessionKey == "main")
            #expect(chat.state == "final")
        default:
            Issue.record("expected .chat from chat event, got \(String(describing: mapped[0]))")
        }
    }

    @Test func unknownEventMapsToEmpty() {
        let frame = EventFrame(
            type: "event",
            event: "unknown",
            payload: ZeroProtocol.AnyCodable(["a": ZeroProtocol.AnyCodable(1)]),
            seq: 1,
            stateversion: nil)
        let mapped = MacGatewayChatTransport.mapPushToTransportEvents(.event(frame))
        #expect(mapped.isEmpty)
    }

    @Test func seqGapMapsToSeqGap() {
        let mapped = MacGatewayChatTransport.mapPushToTransportEvents(.seqGap(expected: 1, received: 9))
        #expect(mapped.count == 1)
        #expect({
            if case .seqGap = mapped[0] { return true }
            return false
        }())
    }
}
