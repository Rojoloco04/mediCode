import AppIntents
import SwiftUI
import WidgetKit

struct MediCodeWidgetConfigurationIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "MediCode Widget"
    static let description = IntentDescription("Choose the quick action the widget should open.")

    @Parameter(title: "Quick Action")
    var action: MediCodeQuickAction?

    init() {
        action = .showQRCode
    }
}

struct MediCodeWidgetEntry: TimelineEntry {
    let date: Date
    let widgetState: WidgetSharedState
    let action: MediCodeQuickAction
}

struct MediCodeWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> MediCodeWidgetEntry {
        MediCodeWidgetEntry(date: .now, widgetState: .empty, action: .showQRCode)
    }

    func snapshot(for configuration: MediCodeWidgetConfigurationIntent, in context: Context) async -> MediCodeWidgetEntry {
        MediCodeWidgetEntry(date: .now, widgetState: await ProfileStore().loadWidgetState(), action: configuration.action ?? .showQRCode)
    }

    func timeline(for configuration: MediCodeWidgetConfigurationIntent, in context: Context) async -> Timeline<MediCodeWidgetEntry> {
        let entry = MediCodeWidgetEntry(date: .now, widgetState: await ProfileStore().loadWidgetState(), action: configuration.action ?? .showQRCode)
        return Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(900)))
    }
}

struct MediCodeWidgetEntryView: View {
    var entry: MediCodeWidgetProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: entry.widgetState.isPublished ? "qrcode.viewfinder" : "heart.text.square")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.red)

            Text(entry.widgetState.displayName.isEmpty ? String(localized: "MediCode") : entry.widgetState.displayName)
                .font(.headline)
                .lineLimit(1)
                .privacySensitive(false)

            Text(entry.widgetState.isPublished ? String(localized: "Open QR Card") : String(localized: "Finish Setup"))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(deepLink(for: entry.action))
    }

    private func deepLink(for action: MediCodeQuickAction) -> URL {
        switch action {
        case .showQRCode:
            return URL(string: "medicode://qr-card")!
        case .editProfile:
            return URL(string: "medicode://profile")!
        }
    }
}

@main
struct MediCodeWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "com.medicode.quick-action",
            intent: MediCodeWidgetConfigurationIntent.self,
            provider: MediCodeWidgetProvider()
        ) { entry in
            MediCodeWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("mediCode")
        .description("Open the emergency QR card without exposing private health details in the widget.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}
