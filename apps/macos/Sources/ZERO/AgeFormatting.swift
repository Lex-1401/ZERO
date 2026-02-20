import Foundation

// Human-friendly age string (e.g., "2m ago").
func age(from date: Date, now: Date = .init()) -> String {
    let seconds = max(0, Int(now.timeIntervalSince(date)))
    let minutes = seconds / 60
    let hours = minutes / 60
    let days = hours / 24

    if seconds < 60 { return "agora há pouco" }
    if minutes == 1 { return "há 1 minuto" }
    if minutes < 60 { return "há \(minutes)m" }
    if hours == 1 { return "há 1 hora" }
    if hours < 24 { return "há \(hours)h" }
    if days == 1 { return "ontem" }
    return "há \(days)d"
}
