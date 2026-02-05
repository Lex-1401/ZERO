// swift-tools-version: 6.2
// Package manifest for the Zero macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Zero",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "ZeroIPC", targets: ["ZeroIPC"]),
        .library(name: "ZeroDiscovery", targets: ["ZeroDiscovery"]),
        .executable(name: "Zero", targets: ["Zero"]),
        .executable(name: "zero-mac", targets: ["ZeroMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/ZeroKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "ZeroIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ZeroDiscovery",
            dependencies: [
                .product(name: "ZeroKit", package: "ZeroKit"),
            ],
            path: "Sources/ZeroDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Zero",
            dependencies: [
                "ZeroIPC",
                "ZeroDiscovery",
                .product(name: "ZeroKit", package: "ZeroKit"),
                .product(name: "ZeroChatUI", package: "ZeroKit"),
                .product(name: "ZeroProtocol", package: "ZeroKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Zero.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "ZeroMacCLI",
            dependencies: [
                "ZeroDiscovery",
                .product(name: "ZeroKit", package: "ZeroKit"),
                .product(name: "ZeroProtocol", package: "ZeroKit"),
            ],
            path: "Sources/ZeroMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "ZeroIPCTests",
            dependencies: [
                "ZeroIPC",
                "Zero",
                "ZeroDiscovery",
                .product(name: "ZeroProtocol", package: "ZeroKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
