import Foundation
import Testing
@testable import Zero

@Suite(.serialized)
struct ZeroConfigFileTests {
    @Test
    func configPathRespectsEnvOverride() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("zero-config-\(UUID().uuidString)")
            .appendingPathComponent("zero.json")
            .path

        await TestIsolation.withEnvValues(["ZERO_CONFIG_PATH": override]) {
            #expect(ZeroConfigFile.url().path == override)
        }
    }

    @MainActor
    @Test
    func remoteGatewayPortParsesAndMatchesHost() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("zero-config-\(UUID().uuidString)")
            .appendingPathComponent("zero.json")
            .path

        await TestIsolation.withEnvValues(["ZERO_CONFIG_PATH": override]) {
            ZeroConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "ws://gateway.ts.net:19999",
                    ],
                ],
            ])
            #expect(ZeroConfigFile.remoteGatewayPort() == 19999)
            #expect(ZeroConfigFile.remoteGatewayPort(matchingHost: "gateway.ts.net") == 19999)
            #expect(ZeroConfigFile.remoteGatewayPort(matchingHost: "gateway") == 19999)
            #expect(ZeroConfigFile.remoteGatewayPort(matchingHost: "other.ts.net") == nil)
        }
    }

    @MainActor
    @Test
    func setRemoteGatewayUrlPreservesScheme() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("zero-config-\(UUID().uuidString)")
            .appendingPathComponent("zero.json")
            .path

        await TestIsolation.withEnvValues(["ZERO_CONFIG_PATH": override]) {
            ZeroConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "wss://old-host:111",
                    ],
                ],
            ])
            ZeroConfigFile.setRemoteGatewayUrl(host: "new-host", port: 2222)
            let root = ZeroConfigFile.loadDict()
            let url = ((root["gateway"] as? [String: Any])?["remote"] as? [String: Any])?["url"] as? String
            #expect(url == "wss://new-host:2222")
        }
    }

    @Test
    func stateDirOverrideSetsConfigPath() async {
        let dir = FileManager().temporaryDirectory
            .appendingPathComponent("zero-state-\(UUID().uuidString)", isDirectory: true)
            .path

        await TestIsolation.withEnvValues([
            "ZERO_CONFIG_PATH": nil,
            "ZERO_STATE_DIR": dir,
        ]) {
            #expect(ZeroConfigFile.stateDirURL().path == dir)
            #expect(ZeroConfigFile.url().path == "\(dir)/zero.json")
        }
    }
}
