import Foundation
import SwiftUI

enum TimeFormat {
    static func elapsed(_ seconds: TimeInterval) -> String {
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }

    static func hm(minutes: Double) -> String {
        let h = Int(minutes) / 60
        let m = Int(minutes.rounded()) % 60
        if h > 0 && m > 0 { return "\(h)h \(String(format: "%02d", m))m" }
        if h > 0 { return "\(h)h" }
        return "\(m)m"
    }

    static func clockTime(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        f.amSymbol = "AM"
        f.pmSymbol = "PM"
        return f.string(from: date)
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}
