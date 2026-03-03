import Foundation

public enum ZeroCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum ZeroCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum ZeroCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum ZeroCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct ZeroCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: ZeroCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: ZeroCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: ZeroCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: ZeroCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct ZeroCameraClipParams: Codable, Sendable, Equatable {
    public var facing: ZeroCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: ZeroCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: ZeroCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: ZeroCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
