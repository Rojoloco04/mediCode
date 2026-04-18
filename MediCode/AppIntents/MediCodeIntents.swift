import AppIntents
import Foundation

struct OpenMediCodeIntent: AppIntent {
    static let title: LocalizedStringResource = "Open MediCode"
    static let description = IntentDescription("Open the QR card or jump directly to the emergency profile.")
    static let openAppWhenRun = true

    @Parameter(title: "Destination")
    var destination: MediCodeQuickAction

    init() {
        destination = .showQRCode
    }

    init(destination: MediCodeQuickAction) {
        self.destination = destination
    }

    func perform() async throws -> some IntentResult {
        let store = ProfileStore()
        await store.storePendingRoute(destination.route)
        return .result()
    }
}

struct MediCodeShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        return [
            AppShortcut(
                intent: OpenMediCodeIntent(destination: .showQRCode),
                phrases: [
                    "Open \(.applicationName) QR card",
                    "Show my \(.applicationName) emergency QR"
                ],
                shortTitle: "Open QR Card",
                systemImageName: "qrcode.viewfinder"
            ),
            AppShortcut(
                intent: OpenMediCodeIntent(destination: .editProfile),
                phrases: [
                    "Edit my \(.applicationName) profile",
                    "Update \(.applicationName) profile"
                ],
                shortTitle: "Edit Profile",
                systemImageName: "person.text.rectangle"
            )
        ]
    }
}
