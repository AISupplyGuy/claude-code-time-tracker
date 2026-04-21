// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ClaudeTimeTracker",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "ClaudeTimeTracker", targets: ["ClaudeTimeTracker"]),
    ],
    targets: [
        .executableTarget(
            name: "ClaudeTimeTracker",
            path: "Sources/ClaudeTimeTracker"
        ),
    ]
)
