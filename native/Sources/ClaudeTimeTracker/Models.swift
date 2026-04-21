import Foundation

struct Session: Codable, Identifiable, Hashable {
    var project: String
    var group: String?
    var start: Date
    var stop: Date?
    var autoStopped: Bool?
    var reads: Int?
    var edits: Int?
    var bashCalls: Int?

    var id: String { "\(project)|\(start.timeIntervalSince1970)" }

    enum CodingKeys: String, CodingKey {
        case project, group, start, stop
        case autoStopped = "auto_stopped"
        case reads, edits
        case bashCalls = "bash_calls"
    }

    var isActive: Bool { stop == nil }

    var end: Date { stop ?? Date() }

    var durationSeconds: TimeInterval { end.timeIntervalSince(start) }

    enum Activity: String { case deepWork, investigation, tooling, mixed }

    var activity: Activity {
        let total = (reads ?? 0) + (edits ?? 0) + (bashCalls ?? 0)
        guard total > 0 else { return .mixed }
        let editRatio = Double(edits ?? 0) / Double(total)
        let readRatio = Double(reads ?? 0) / Double(total)
        let bashRatio = Double(bashCalls ?? 0) / Double(total)
        if editRatio >= 0.3 { return .deepWork }
        if readRatio >= 0.8 { return .investigation }
        if bashRatio >= 0.4 { return .tooling }
        return .mixed
    }
}

struct Project: Codable, Identifiable, Hashable {
    var name: String
    var match: String?
    var group: String?
    var rate: Double?

    var id: String { name }
}

struct ProjectsFile: Codable {
    var projects: [Project]
}

enum ProjectPalette {
    static let colors: [UInt32] = [
        0xF5A524, 0x3B82F6, 0xA78BFA, 0x10B981, 0xEF4444,
        0x06B6D4, 0xEC4899, 0xF97316, 0x14B8A6, 0x8B5CF6,
    ]
    static func hex(for index: Int) -> UInt32 { colors[index % colors.count] }
}
