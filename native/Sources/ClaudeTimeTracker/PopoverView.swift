import SwiftUI

struct PopoverView: View {
    @Bindable var store: TimeTrackStore

    var body: some View {
        VStack(spacing: 0) {
            HeroSection(store: store)
            Divider().opacity(0.4)
            TodaySection(store: store)
            Divider().opacity(0.4)
            RecentSection(store: store)
            Divider().opacity(0.4)
            FooterSection(store: store)
        }
        .frame(width: 360)
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear { store.start() }
    }
}

private struct HeroSection: View {
    let store: TimeTrackStore

    var body: some View {
        if let active = store.activeSession {
            activeHero(active)
        } else {
            emptyHero
        }
    }

    private func activeHero(_ session: Session) -> some View {
        let elapsed = store.now.timeIntervalSince(session.start)
        let colorIdx = store.colorIndex(for: session.project)
        let accent = Color(hex: ProjectPalette.hex(for: colorIdx))

        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Circle().fill(accent).frame(width: 7, height: 7)
                Text(session.project)
                    .font(.system(size: 13, weight: .semibold))
                Spacer()
                Text("Started \(TimeFormat.clockTime(session.start))")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Text(TimeFormat.elapsed(elapsed))
                .font(.system(size: 30, weight: .semibold, design: .rounded))
                .monospacedDigit()

            HStack(spacing: 6) {
                Button {
                    TimeTrackShell.stop()
                    store.reloadAll()
                } label: {
                    Label("Stop", systemImage: "stop.fill")
                        .font(.system(size: 12, weight: .semibold))
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)

                Button {
                    TimeTrackShell.syncDoc()
                } label: {
                    Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12, weight: .semibold))
                }
                .buttonStyle(.bordered)
                Spacer()
            }
        }
        .padding(14)
    }

    private var emptyHero: some View {
        VStack(spacing: 6) {
            Text("No timer running")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.secondary)
            Text("Start working in Claude Code — timer auto-starts")
                .font(.system(size: 11))
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 22)
    }
}

private struct TodaySection: View {
    let store: TimeTrackStore

    var body: some View {
        let today = store.todaySessions()
        let totalMin = store.totalSeconds(in: today) / 60

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("TODAY")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(.tertiary)
                Spacer()
                Text(TimeFormat.hm(minutes: totalMin))
                    .font(.system(size: 11, weight: .medium))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }

            if today.isEmpty {
                Text("No sessions yet today")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            } else {
                TimelineStrip(sessions: today, store: store)
                    .frame(height: 24)
            }
        }
        .padding(14)
    }
}

private struct TimelineStrip: View {
    let sessions: [Session]
    let store: TimeTrackStore

    var body: some View {
        GeometryReader { geo in
            let dayStart = Calendar.current.startOfDay(for: Date())
            let totalSecs = 86400.0
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.primary.opacity(0.05))

                ForEach(sessions) { session in
                    let startOffset = session.start.timeIntervalSince(dayStart)
                    let endOffset = session.end.timeIntervalSince(dayStart)
                    let x = geo.size.width * (startOffset / totalSecs)
                    let w = max(2, geo.size.width * ((endOffset - startOffset) / totalSecs))
                    let idx = store.colorIndex(for: session.project)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: ProjectPalette.hex(for: idx)))
                        .frame(width: w, height: geo.size.height - 8)
                        .offset(x: x, y: 4)
                }
            }
        }
    }
}

private struct RecentSection: View {
    let store: TimeTrackStore

    var body: some View {
        let recent = Array(store.sessions.reversed().prefix(4))
        VStack(alignment: .leading, spacing: 6) {
            Text("RECENT")
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.5)
                .foregroundStyle(.tertiary)

            if recent.isEmpty {
                Text("No sessions yet")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            } else {
                ForEach(recent) { session in
                    SessionRow(session: session, store: store)
                }
            }
        }
        .padding(14)
    }
}

private struct SessionRow: View {
    let session: Session
    let store: TimeTrackStore

    var body: some View {
        let idx = store.colorIndex(for: session.project)
        let color = Color(hex: ProjectPalette.hex(for: idx))
        let minutes = session.durationSeconds / 60

        HStack(spacing: 8) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(session.project)
                .font(.system(size: 12, weight: .medium))
            Spacer()
            Text(TimeFormat.hm(minutes: minutes))
                .font(.system(size: 11))
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
    }
}

private struct FooterSection: View {
    let store: TimeTrackStore
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        HStack {
            if let last = store.lastActivity {
                Text("Activity \(TimeFormat.clockTime(last))")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }
            Spacer()
            Button {
                NSApp.activate(ignoringOtherApps: true)
                openWindow(id: "dashboard")
            } label: {
                Label("Dashboard", systemImage: "chart.bar.fill")
                    .font(.system(size: 11, weight: .medium))
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            Button {
                NSApp.terminate(nil)
            } label: {
                Text("Quit")
                    .font(.system(size: 11))
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }
}
