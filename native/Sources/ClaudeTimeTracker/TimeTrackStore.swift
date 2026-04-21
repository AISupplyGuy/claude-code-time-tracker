import Foundation
import Observation

@Observable
@MainActor
final class TimeTrackStore {
    private(set) var sessions: [Session] = []
    private(set) var projects: [Project] = []
    private(set) var lastActivity: Date?
    private(set) var lastError: String?

    private let root: URL
    private var watchers: [DispatchSourceFileSystemObject] = []
    private var tickTimer: Timer?
    var now: Date = .now

    init(root: URL = URL(fileURLWithPath: NSHomeDirectory()).appending(path: ".timetrack")) {
        self.root = root
    }

    func start() {
        reloadAll()
        watchDir()
        tickTimer?.invalidate()
        tickTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.now = .now }
        }
    }

    func stop() {
        watchers.forEach { $0.cancel() }
        watchers.removeAll()
        tickTimer?.invalidate()
        tickTimer = nil
    }

    // MARK: - Loads

    func reloadAll() {
        reloadSessions()
        reloadProjects()
        reloadLastActivity()
    }

    private func reloadSessions() {
        let url = root.appending(path: "sessions.json")
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            sessions = try decoder.decode([Session].self, from: data)
        } catch CocoaError.fileReadNoSuchFile {
            sessions = []
        } catch {
            lastError = "sessions.json: \(error.localizedDescription)"
        }
    }

    private func reloadProjects() {
        let url = root.appending(path: "projects.json")
        do {
            let data = try Data(contentsOf: url)
            let file = try JSONDecoder().decode(ProjectsFile.self, from: data)
            projects = file.projects
        } catch CocoaError.fileReadNoSuchFile {
            projects = []
        } catch {
            lastError = "projects.json: \(error.localizedDescription)"
        }
    }

    private func reloadLastActivity() {
        let url = root.appending(path: "last_activity")
        guard let s = try? String(contentsOf: url, encoding: .utf8),
              let ts = TimeInterval(s.trimmingCharacters(in: .whitespacesAndNewlines))
        else {
            lastActivity = nil
            return
        }
        lastActivity = Date(timeIntervalSince1970: ts)
    }

    // MARK: - Derived state

    var activeSession: Session? { sessions.last(where: { $0.isActive }) }

    func project(named name: String) -> Project? {
        projects.first { $0.name == name }
    }

    func colorIndex(for projectName: String) -> Int {
        projects.firstIndex(where: { $0.name == projectName }) ?? 0
    }

    func todaySessions() -> [Session] {
        let cal = Calendar.current
        return sessions.filter { cal.isDateInToday($0.start) }
    }

    func totalSeconds(in sessions: [Session]) -> TimeInterval {
        sessions.reduce(0) { $0 + $1.durationSeconds }
    }

    // MARK: - Watch

    private func watchDir() {
        watchers.forEach { $0.cancel() }
        watchers.removeAll()

        let fd = open(root.path, O_EVTONLY)
        guard fd >= 0 else {
            lastError = "cannot open \(root.path) for watching"
            return
        }
        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .extend, .rename, .delete, .attrib],
            queue: .main
        )
        source.setEventHandler { [weak self] in
            self?.reloadAll()
        }
        source.setCancelHandler { close(fd) }
        source.resume()
        watchers.append(source)
    }
}
