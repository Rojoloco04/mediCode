import Foundation
import WidgetKit

actor ProfileStore {
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private let appStateURL: URL
    private let widgetSuiteName = "group.com.medicode.shared"
    private let widgetStateKey = "widget_state"
    private let routeKey = "pending_route"

    init(fileManager: FileManager = .default) {
        encoder = JSONEncoder()
        decoder = JSONDecoder()
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601

        let supportDirectory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = supportDirectory.appendingPathComponent("MediCode", isDirectory: true)
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: nil)
        appStateURL = directory.appendingPathComponent("patient-state.json")
    }

    func loadAppState() -> PatientAppState {
        guard
            let data = try? Data(contentsOf: appStateURL),
            let state = try? decoder.decode(PatientAppState.self, from: data)
        else {
            return .empty
        }
        return state
    }

    func saveAppState(_ state: PatientAppState) {
        guard let data = try? encoder.encode(state) else { return }
        try? data.write(to: appStateURL, options: [.atomic])
    }

    func saveWidgetState(_ state: WidgetSharedState) {
        guard
            let defaults = UserDefaults(suiteName: widgetSuiteName),
            let data = try? encoder.encode(state)
        else {
            return
        }
        defaults.set(data, forKey: widgetStateKey)
        WidgetCenter.shared.reloadAllTimelines()
    }

    func loadWidgetState() -> WidgetSharedState {
        guard
            let defaults = UserDefaults(suiteName: widgetSuiteName),
            let data = defaults.data(forKey: widgetStateKey),
            let state = try? decoder.decode(WidgetSharedState.self, from: data)
        else {
            return .empty
        }
        return state
    }

    func storePendingRoute(_ route: AppRoute) {
        UserDefaults(suiteName: widgetSuiteName)?.set(route.rawValue, forKey: routeKey)
    }

    func consumePendingRoute() -> AppRoute? {
        let defaults = UserDefaults(suiteName: widgetSuiteName)
        guard let rawValue = defaults?.string(forKey: routeKey), let route = AppRoute(rawValue: rawValue) else {
            return nil
        }
        defaults?.removeObject(forKey: routeKey)
        return route
    }
}
