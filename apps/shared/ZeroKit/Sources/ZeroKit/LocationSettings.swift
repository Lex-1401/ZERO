import Foundation

public enum ZeroLocationMode: String, Codable, Sendable, CaseIterable {
    case off
    case whileUsing
    case always
}
