import SwiftUI
import AppKit

@main
struct ClaudeTimeTrackerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var store = TimeTrackStore()

    var body: some Scene {
        MenuBarExtra {
            PopoverView(store: store)
        } label: {
            MenuBarLabel(store: store)
        }
        .menuBarExtraStyle(.window)

        Window("Time Track", id: "dashboard") {
            DashboardView(store: store)
        }
        .defaultSize(width: 1100, height: 720)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
    }
}

private struct MenuBarLabel: View {
    @Bindable var store: TimeTrackStore

    var body: some View {
        if let active = store.activeSession {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                Text(TimeFormat.elapsed(store.now.timeIntervalSince(active.start)))
                    .monospacedDigit()
            }
        } else {
            Image(systemName: "timer")
        }
    }
}
