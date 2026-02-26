// swift-tools-version: 6.0
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
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.3.0"),
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
            path: "Sources/ZEROIPC",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ZeroDiscovery",
            dependencies: [
                .product(name: "ZeroKit", package: "ZeroKit"),
                .product(name: "ZeroProtocol", package: "ZeroKit"),
            ],
            path: "Sources/ZERODiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Zero",
            dependencies: [
                "ZeroIPC",
                "ZeroDiscovery",
                "MenuBarExtraAccess",
                .product(name: "ZeroKit", package: "ZeroKit"),
                .product(name: "ZeroProtocol", package: "ZeroKit"),
                .product(name: "ZeroChatUI", package: "ZeroKit"),
                .product(name: "SwabbleKit", package: "Swabble"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            path: "Sources/ZERO",
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .process("Resources/MenuBarMascot.png"),
                .process("Resources/ZERO.icns"),
                .process("Resources/ZERO_Icon_Alpha.png"),
                .process("Resources/AppIcon_Official.png"),
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
            path: "Sources/ZEROMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "ZeroIPCTests",
            dependencies: ["Zero", "ZeroIPC", "ZeroDiscovery"],
            path: "Tests/ZEROIPCTests"
        ),
    ])
