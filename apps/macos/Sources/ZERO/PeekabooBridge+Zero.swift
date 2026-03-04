import Foundation
import PeekabooBridge

extension PeekabooBridgeConstants {
    /// Socket hosted by ZERO.app (primary host).
    /// Added via extension to avoid patching the external Peekaboo library checkout.
    public static var zeroSocketPath: String {
        let fileManager = FileManager.default
        let baseDirectory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support")
        let directory = baseDirectory.appendingPathComponent("ZERO", isDirectory: true)
        return directory.appendingPathComponent(self.socketName, isDirectory: false).path
    }
}
