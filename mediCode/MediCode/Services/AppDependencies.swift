import Foundation

struct AppDependencies {
    var profileStore: ProfileStore
    var healthKit: any HealthKitProviding
    var backend: any BackendAPI
    var qrCardService: QRCardService
    var usesPreviewBackend: Bool

    static func live() -> AppDependencies {
        let backendClient: any BackendAPI
        if
            let info = Bundle.main.infoDictionary,
            let functionsURLString = info["MediCodeSupabaseFunctionsURL"] as? String,
            let anonKey = info["MediCodeSupabaseAnonKey"] as? String,
            let functionsBaseURL = URL(string: functionsURLString),
            !functionsURLString.isEmpty,
            !anonKey.isEmpty
        {
            backendClient = SupabaseBackendClient(
                configuration: BackendConfiguration(
                    functionsBaseURL: functionsBaseURL,
                    anonKey: anonKey
                )
            )
        } else {
            backendClient = PreviewBackendClient()
        }

        return AppDependencies(
            profileStore: ProfileStore(),
            healthKit: LiveHealthKitService(),
            backend: backendClient,
            qrCardService: QRCardService(),
            usesPreviewBackend: backendClient is PreviewBackendClient
        )
    }

    static func preview() -> AppDependencies {
        AppDependencies(
            profileStore: ProfileStore(),
            healthKit: PreviewHealthKitService(),
            backend: PreviewBackendClient(),
            qrCardService: QRCardService(),
            usesPreviewBackend: true
        )
    }
}
