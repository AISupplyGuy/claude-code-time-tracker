import SwiftUI
import Charts

struct DashboardView: View {
    @Bindable var store: TimeTrackStore
    @State private var range: StatsRange = .today
    @State private var search: String = ""

    var body: some View {
        HStack(spacing: 0) {
            Sidebar(range: $range)
            Divider()
            DashboardContent(store: store, range: range, search: $search)
        }
        .frame(minWidth: 980, minHeight: 680)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct Sidebar: View {
    @Binding var range: StatsRange

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color(hex: 0xD97757))
                    .frame(width: 26, height: 26)
                    .overlay(Image(systemName: "timer").foregroundStyle(.white))
                VStack(alignment: .leading, spacing: 1) {
                    Text("TimeTrack").font(.system(size: 13, weight: .semibold))
                    Text("Claude Code").font(.system(size: 10)).foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 16)

            VStack(alignment: .leading, spacing: 2) {
                sidebarLabel("VIEWS")
                ForEach(StatsRange.allCases) { r in
                    SidebarItem(title: r.title, icon: icon(for: r), selected: range == r) {
                        range = r
                    }
                }
            }
            .padding(.horizontal, 8)

            Spacer()
        }
        .frame(width: 200)
        .background(Color.primary.opacity(0.03))
    }

    private func icon(for range: StatsRange) -> String {
        switch range {
        case .today: "sun.max.fill"
        case .week: "calendar"
        case .month: "calendar.badge.clock"
        case .all: "infinity"
        }
    }

    private func sidebarLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold))
            .tracking(0.5)
            .foregroundStyle(.tertiary)
            .padding(.horizontal, 6)
            .padding(.top, 4)
            .padding(.bottom, 2)
    }
}

private struct SidebarItem: View {
    let title: String
    let icon: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .frame(width: 14)
                Text(title)
                    .font(.system(size: 12.5, weight: selected ? .semibold : .regular))
                Spacer()
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(selected ? Color.primary.opacity(0.08) : .clear)
            )
            .foregroundStyle(selected ? .primary : .secondary)
        }
        .buttonStyle(.plain)
    }
}

private struct DashboardContent: View {
    let store: TimeTrackStore
    let range: StatsRange
    @Binding var search: String

    var body: some View {
        let stats = StatsEngine.compute(sessions: store.sessions, projects: store.projects, range: range, now: store.now)

        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                header
                NowPlayingCard(store: store)
                StatCardsRow(stats: stats)
                HStack(alignment: .top, spacing: 14) {
                    BigTimelineView(stats: stats, store: store, range: range)
                        .frame(maxWidth: .infinity)
                    DonutCard(stats: stats)
                        .frame(width: 320)
                }
                ClaudeRecapCard(stats: stats, store: store)
                SessionsTableCard(store: store, range: range, search: $search)
            }
            .padding(18)
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(range.title)
                    .font(.system(size: 22, weight: .semibold))
                Text(headerSubtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
    }

    private var headerSubtitle: String {
        let df = DateFormatter()
        df.dateStyle = .full
        return df.string(from: Date())
    }
}

private struct NowPlayingCard: View {
    let store: TimeTrackStore

    var body: some View {
        if let active = store.activeSession {
            body(for: active)
        } else {
            EmptyView()
        }
    }

    private func body(for session: Session) -> some View {
        let elapsed = store.now.timeIntervalSince(session.start)
        let colorIdx = store.colorIndex(for: session.project)
        let accent = Color(hex: ProjectPalette.hex(for: colorIdx))

        return HStack(alignment: .firstTextBaseline, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Label("TRACKING NOW", systemImage: "record.circle.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(accent)
                    .tracking(0.5)
                Text(TimeFormat.elapsed(elapsed))
                    .font(.system(size: 42, weight: .semibold, design: .rounded))
                    .monospacedDigit()
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(session.project)
                    .font(.system(size: 15, weight: .semibold))
                Text("\(session.group ?? "—") · started \(TimeFormat.clockTime(session.start))")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                TimeTrackShell.stop()
                store.reloadAll()
            } label: {
                Label("Stop", systemImage: "stop.fill")
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)

            Button {
                TimeTrackShell.syncDoc()
            } label: {
                Label("Sync", systemImage: "arrow.triangle.2.circlepath")
            }
            .buttonStyle(.bordered)
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.primary.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.primary.opacity(0.07), lineWidth: 0.5)
                )
        )
    }
}

private struct StatCardsRow: View {
    let stats: Stats

    var body: some View {
        HStack(spacing: 12) {
            StatCard(
                label: "TOTAL",
                value: TimeFormat.hm(minutes: stats.totalMinutes),
                sub: "\(stats.sessionCount) session\(stats.sessionCount == 1 ? "" : "s")",
                sparklineData: stats.sparklineByDay,
                sparklineColor: Color(hex: 0x86E6B1)
            )
            StatCard(
                label: "FOCUS",
                value: "\(stats.focusScore)",
                sub: "\(stats.contextSwitches) switch\(stats.contextSwitches == 1 ? "" : "es")",
                sparklineData: stats.sparklineByDay,
                sparklineColor: Color(hex: 0x3B82F6)
            )
            StatCard(
                label: "PROJECTS",
                value: "\(stats.projectHours.count)",
                sub: stats.projectHours.first.map { "Top: \($0.project)" } ?? "—",
                sparklineData: stats.sparklineByDay,
                sparklineColor: Color(hex: 0xA78BFA)
            )
            StatCard(
                label: "TOP CATEGORY",
                value: stats.categories.first(where: { $0.minutes > 0 })?.label ?? "—",
                sub: stats.categories.first(where: { $0.minutes > 0 }).map { "\(Int($0.pct))%" } ?? "",
                sparklineData: stats.sparklineByDay,
                sparklineColor: Color(hex: 0xF5A524)
            )
        }
    }
}

private struct StatCard: View {
    let label: String
    let value: String
    let sub: String
    let sparklineData: [Double]
    let sparklineColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.5)
                .foregroundStyle(.tertiary)
            HStack(alignment: .firstTextBaseline) {
                Text(value)
                    .font(.system(size: 22, weight: .medium, design: .rounded))
                    .monospacedDigit()
                Spacer()
                Sparkline(data: sparklineData, color: sparklineColor)
                    .frame(width: 60, height: 20)
            }
            Text(sub)
                .font(.system(size: 10.5))
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.primary.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
                )
        )
    }
}

private struct Sparkline: View {
    let data: [Double]
    let color: Color

    var body: some View {
        Chart(Array(data.enumerated()), id: \.offset) { item in
            LineMark(x: .value("i", item.offset), y: .value("v", item.element))
                .foregroundStyle(color)
                .interpolationMethod(.catmullRom)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartPlotStyle { $0.background(Color.clear) }
    }
}

private struct BigTimelineView: View {
    let stats: Stats
    let store: TimeTrackStore
    let range: StatsRange

    private let dayStartHour = 6
    private let dayEndHour = 22
    private var dayStartMin: Double { Double(dayStartHour * 60) }
    private var dayEndMin: Double { Double(dayEndHour * 60) }
    private var rangeMin: Double { dayEndMin - dayStartMin }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Timeline").font(.system(size: 13, weight: .semibold))
                Spacer()
                ForEach(stats.projectHours.prefix(4)) { p in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(hex: ProjectPalette.hex(for: p.colorIndex)))
                            .frame(width: 6, height: 6)
                        Text(p.project)
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if range == .today {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.primary.opacity(0.04))

                        ForEach(stats.timeline) { seg in
                            let leftFrac = max(0, (seg.startMinute - dayStartMin) / rangeMin)
                            let widthFrac = max(0.003, (seg.endMinute - seg.startMinute) / rangeMin)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color(hex: ProjectPalette.hex(for: seg.colorIndex)))
                                .opacity(seg.isLive ? 1 : 0.88)
                                .frame(width: geo.size.width * widthFrac, height: geo.size.height - 8)
                                .offset(x: geo.size.width * leftFrac, y: 4)
                        }

                        let nowMin = (store.now.timeIntervalSince(Calendar.current.startOfDay(for: store.now))) / 60
                        if nowMin >= dayStartMin && nowMin <= dayEndMin {
                            let x = geo.size.width * ((nowMin - dayStartMin) / rangeMin)
                            Rectangle()
                                .fill(Color.primary)
                                .frame(width: 1)
                                .offset(x: x)
                        }
                    }
                }
                .frame(height: 48)

                HStack(spacing: 0) {
                    ForEach(dayStartHour...dayEndHour, id: \.self) { h in
                        let label = h == 12 ? "12p" : h < 12 ? "\(h)a" : "\(h - 12)p"
                        Text(label)
                            .font(.system(size: 9.5))
                            .foregroundStyle(.tertiary)
                            .frame(maxWidth: .infinity)
                    }
                }
            } else {
                WeeklyBars(stats: stats, store: store, range: range)
                    .frame(height: 80)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.primary.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
                )
        )
    }
}

private struct WeeklyBars: View {
    let stats: Stats
    let store: TimeTrackStore
    let range: StatsRange

    var body: some View {
        Chart(Array(stats.sparklineByDay.enumerated()), id: \.offset) { item in
            BarMark(
                x: .value("day", dayLabel(forOffset: item.offset)),
                y: .value("minutes", item.element)
            )
            .foregroundStyle(Color(hex: 0xD97757))
            .cornerRadius(3)
        }
        .chartYAxis { AxisMarks(position: .leading) }
    }

    private func dayLabel(forOffset offset: Int) -> String {
        let cal = Calendar.current
        let day = cal.date(byAdding: .day, value: -(6 - offset), to: Date()) ?? Date()
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f.string(from: day)
    }
}

private struct DonutCard: View {
    let stats: Stats

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Categories").font(.system(size: 13, weight: .semibold))

            HStack(spacing: 14) {
                ZStack {
                    Chart(stats.categories.filter { $0.minutes > 0 }) { cat in
                        SectorMark(
                            angle: .value("minutes", cat.minutes),
                            innerRadius: .ratio(0.62),
                            angularInset: 1.5
                        )
                        .foregroundStyle(Color(hex: cat.colorHex))
                        .cornerRadius(2)
                    }
                    .frame(width: 110, height: 110)

                    VStack(spacing: 1) {
                        Text(TimeFormat.hm(minutes: stats.totalMinutes))
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .monospacedDigit()
                        Text("total")
                            .font(.system(size: 9))
                            .foregroundStyle(.tertiary)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(stats.categories) { cat in
                        HStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: cat.colorHex))
                                .frame(width: 8, height: 8)
                            Text(cat.label).font(.system(size: 11))
                            Spacer(minLength: 4)
                            Text("\(Int(cat.pct.rounded()))%")
                                .font(.system(size: 11))
                                .monospacedDigit()
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.primary.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
                )
        )
    }
}

private struct ClaudeRecapCard: View {
    let stats: Stats
    let store: TimeTrackStore

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 7)
                .fill(LinearGradient(colors: [Color(hex: 0xD97757), Color(hex: 0xB85D3E)], startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 26, height: 26)
                .overlay(Image(systemName: "sparkles").foregroundStyle(.white).font(.system(size: 13)))

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text("Recap").font(.system(size: 13, weight: .bold))
                    Text("by Claude")
                        .font(.system(size: 10, weight: .semibold))
                        .padding(.horizontal, 5).padding(.vertical, 1)
                        .background(RoundedRectangle(cornerRadius: 3).fill(Color(hex: 0xD97757).opacity(0.2)))
                        .foregroundStyle(Color(hex: 0xD97757))
                }
                Text(recapText)
                    .font(.system(size: 12.5))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(LinearGradient(
                    colors: [Color(hex: 0xD97757).opacity(0.10), Color(hex: 0xD97757).opacity(0.02)],
                    startPoint: .top, endPoint: .bottom
                ))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color(hex: 0xD97757).opacity(0.25), lineWidth: 0.5)
                )
        )
    }

    private var recapText: String {
        guard stats.totalMinutes > 0 else {
            return "No sessions tracked yet. Start working in Claude Code to begin."
        }
        let total = TimeFormat.hm(minutes: stats.totalMinutes)
        let projCount = stats.projectHours.count
        let projLabel = projCount == 1 ? "project" : "projects"
        var text = "You've tracked \(total) across \(projCount) \(projLabel)."
        if let top = stats.projectHours.first {
            text += " Most time on \(top.project) (\(TimeFormat.hm(minutes: top.hours * 60)))."
        }
        let switches = stats.contextSwitches
        let switchLabel = switches == 1 ? "switch" : "switches"
        text += " Focus score: \(stats.focusScore)/100 with \(switches) context \(switchLabel)."
        return text
    }
}

private struct SessionsTableCard: View {
    let store: TimeTrackStore
    let range: StatsRange
    @Binding var search: String

    var body: some View {
        let sessions = filteredSessions()
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Sessions").font(.system(size: 13, weight: .semibold))
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                    TextField("Search project…", text: $search)
                        .textFieldStyle(.plain)
                        .font(.system(size: 11))
                        .frame(width: 160)
                }
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.primary.opacity(0.05)))
            }
            .padding(14)

            HStack {
                Text("START").frame(width: 72, alignment: .leading)
                Text("SESSION").frame(maxWidth: .infinity, alignment: .leading)
                Text("DURATION").frame(width: 80, alignment: .trailing)
            }
            .font(.system(size: 10, weight: .semibold))
            .tracking(0.4)
            .foregroundStyle(.tertiary)
            .padding(.horizontal, 14).padding(.bottom, 6)

            if sessions.isEmpty {
                Text("No sessions for this period")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                ForEach(sessions) { s in
                    SessionRowDash(session: s, store: store)
                    Divider().opacity(0.3)
                }
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.primary.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
                )
        )
    }

    private func filteredSessions() -> [Session] {
        let cal = Calendar.current
        let scoped: [Session] = {
            switch range {
            case .today: return store.sessions.filter { cal.isDate($0.start, inSameDayAs: store.now) }
            case .week:
                let start = cal.dateInterval(of: .weekOfYear, for: store.now)?.start ?? store.now
                return store.sessions.filter { $0.start >= start }
            case .month:
                let comps = cal.dateComponents([.year, .month], from: store.now)
                let start = cal.date(from: comps) ?? store.now
                return store.sessions.filter { $0.start >= start }
            case .all: return store.sessions
            }
        }()
        let searchLower = search.lowercased()
        let filtered = searchLower.isEmpty
            ? scoped
            : scoped.filter { $0.project.lowercased().contains(searchLower) }
        return filtered.sorted { $0.start > $1.start }
    }
}

private struct SessionRowDash: View {
    let session: Session
    let store: TimeTrackStore

    var body: some View {
        let idx = store.colorIndex(for: session.project)
        let color = Color(hex: ProjectPalette.hex(for: idx))
        let mins = session.durationSeconds / 60

        HStack(alignment: .top) {
            Text(TimeFormat.clockTime(session.start))
                .frame(width: 72, alignment: .leading)
                .font(.system(size: 11.5))
                .monospacedDigit()
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Circle().fill(color).frame(width: 6, height: 6)
                    Text(session.project)
                        .font(.system(size: 12.5, weight: .semibold))
                    Text(activityLabel(session.activity))
                        .font(.system(size: 10, weight: .semibold))
                        .padding(.horizontal, 5).padding(.vertical, 1)
                        .background(RoundedRectangle(cornerRadius: 3).fill(color.opacity(0.18)))
                        .foregroundStyle(color)
                }
                if session.isActive {
                    Text("Live")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(color)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(TimeFormat.hm(minutes: mins))
                .frame(width: 80, alignment: .trailing)
                .font(.system(size: 12))
                .monospacedDigit()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }

    private func activityLabel(_ a: Session.Activity) -> String {
        switch a {
        case .deepWork: "deep work"
        case .investigation: "investigation"
        case .tooling: "tooling"
        case .mixed: "mixed"
        }
    }
}
