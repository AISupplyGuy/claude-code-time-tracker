import Foundation

enum StatsRange: String, CaseIterable, Identifiable {
    case today, week, month, all
    var id: String { rawValue }
    var title: String {
        switch self {
        case .today: "Today"
        case .week: "This week"
        case .month: "This month"
        case .all: "All time"
        }
    }
}

struct ProjectHours: Identifiable {
    var project: String
    var hours: Double
    var colorIndex: Int
    var id: String { project }
}

struct CategorySlice: Identifiable {
    var label: String
    var minutes: Double
    var colorHex: UInt32
    var id: String { label }
    var pct: Double = 0
}

struct TimelineSegment: Identifiable {
    var project: String
    var colorIndex: Int
    var startMinute: Double   // minutes from dayStart (local)
    var endMinute: Double
    var isLive: Bool
    var id: String { "\(project)-\(startMinute)" }
}

struct Stats {
    var totalMinutes: Double
    var sessionCount: Int
    var projectHours: [ProjectHours]
    var categories: [CategorySlice]
    var timeline: [TimelineSegment]
    var sparklineByDay: [Double]  // minutes tracked per day over last 7 days
    var focusScore: Int
    var contextSwitches: Int

    static let empty = Stats(
        totalMinutes: 0,
        sessionCount: 0,
        projectHours: [],
        categories: [],
        timeline: [],
        sparklineByDay: Array(repeating: 0, count: 7),
        focusScore: 0,
        contextSwitches: 0
    )
}

enum StatsEngine {
    static func compute(sessions: [Session], projects: [Project], range: StatsRange, now: Date) -> Stats {
        let cal = Calendar.current
        let filtered = filter(sessions: sessions, range: range, cal: cal, now: now)

        let totalMinutes = filtered.reduce(0.0) { $0 + $1.durationSeconds / 60 }

        var hoursByProject: [String: Double] = [:]
        for s in filtered { hoursByProject[s.project, default: 0] += s.durationSeconds / 3600 }
        let projectHours = hoursByProject
            .map { (name, hours) -> ProjectHours in
                let idx = projects.firstIndex(where: { $0.name == name }) ?? 0
                return ProjectHours(project: name, hours: hours, colorIndex: idx)
            }
            .sorted { $0.hours > $1.hours }

        let categories = categoryBreakdown(filtered)

        let timeline = buildTimeline(sessions: filtered, projects: projects, cal: cal, now: now, range: range)

        let sparkline = last7DaysSparkline(sessions: sessions, cal: cal, now: now)

        var switches = 0
        var last: String? = nil
        for s in filtered.sorted(by: { $0.start < $1.start }) {
            if let l = last, l != s.project { switches += 1 }
            last = s.project
        }
        let focus = focusScore(totalMinutes: totalMinutes, switches: switches)

        return Stats(
            totalMinutes: totalMinutes,
            sessionCount: filtered.count,
            projectHours: projectHours,
            categories: categories,
            timeline: timeline,
            sparklineByDay: sparkline,
            focusScore: focus,
            contextSwitches: switches
        )
    }

    private static func filter(sessions: [Session], range: StatsRange, cal: Calendar, now: Date) -> [Session] {
        switch range {
        case .today:
            return sessions.filter { cal.isDate($0.start, inSameDayAs: now) }
        case .week:
            let startOfWeek = cal.dateInterval(of: .weekOfYear, for: now)?.start ?? now
            return sessions.filter { $0.start >= startOfWeek }
        case .month:
            let comps = cal.dateComponents([.year, .month], from: now)
            let monthStart = cal.date(from: comps) ?? now
            return sessions.filter { $0.start >= monthStart }
        case .all:
            return sessions
        }
    }

    private static func categoryBreakdown(_ sessions: [Session]) -> [CategorySlice] {
        var buckets: [Session.Activity: Double] = [:]
        for s in sessions {
            buckets[s.activity, default: 0] += s.durationSeconds / 60
        }
        let defs: [(Session.Activity, String, UInt32)] = [
            (.deepWork, "Deep work", 0x10B981),
            (.investigation, "Investigation", 0x3B82F6),
            (.tooling, "Tooling", 0xF5A524),
            (.mixed, "Mixed", 0xA78BFA),
        ]
        let total = buckets.values.reduce(0, +)
        var slices = defs.map { def -> CategorySlice in
            let mins = buckets[def.0] ?? 0
            let pct = total > 0 ? (mins / total) * 100 : 0
            return CategorySlice(label: def.1, minutes: mins, colorHex: def.2, pct: pct)
        }
        slices.sort { $0.minutes > $1.minutes }
        return slices
    }

    private static func buildTimeline(sessions: [Session], projects: [Project], cal: Calendar, now: Date, range: StatsRange) -> [TimelineSegment] {
        guard range == .today else { return [] }
        let dayStart = cal.startOfDay(for: now)
        return sessions.map { s in
            let startMin = s.start.timeIntervalSince(dayStart) / 60
            let endMin = s.end.timeIntervalSince(dayStart) / 60
            let idx = projects.firstIndex { $0.name == s.project } ?? 0
            return TimelineSegment(
                project: s.project,
                colorIndex: idx,
                startMinute: startMin,
                endMinute: endMin,
                isLive: s.isActive
            )
        }
    }

    private static func last7DaysSparkline(sessions: [Session], cal: Calendar, now: Date) -> [Double] {
        var result: [Double] = []
        for offset in (0..<7).reversed() {
            guard let day = cal.date(byAdding: .day, value: -offset, to: now) else { continue }
            let mins = sessions
                .filter { cal.isDate($0.start, inSameDayAs: day) }
                .reduce(0.0) { $0 + $1.durationSeconds / 60 }
            result.append(mins)
        }
        return result
    }

    private static func focusScore(totalMinutes: Double, switches: Int) -> Int {
        guard totalMinutes > 0 else { return 0 }
        let base = 100
        let penalty = min(switches * 6, 60)
        return max(0, base - penalty)
    }
}
