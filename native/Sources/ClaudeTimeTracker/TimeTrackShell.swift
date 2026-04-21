import Foundation

enum TimeTrackShell {
    static let scriptURL = URL(fileURLWithPath: NSHomeDirectory())
        .appending(path: ".timetrack")
        .appending(path: "timetrack.sh")

    @discardableResult
    static func run(_ args: [String], cwd: String? = nil) -> (status: Int32, stdout: String, stderr: String) {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/bin/bash")
        proc.arguments = [scriptURL.path] + args
        if let cwd { proc.currentDirectoryURL = URL(fileURLWithPath: cwd) }

        let out = Pipe(), err = Pipe()
        proc.standardOutput = out
        proc.standardError = err

        do {
            try proc.run()
            proc.waitUntilExit()
        } catch {
            return (-1, "", error.localizedDescription)
        }
        let outStr = String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        let errStr = String(data: err.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        return (proc.terminationStatus, outStr, errStr)
    }

    static func stop() { run(["stop"]) }
    static func syncDoc() { run(["sync-doc"]) }
    static func start(cwd: String) { run(["start"], cwd: cwd) }
}
