import CoreLocation
import Foundation

enum LocationLanguageMapper {
    static func languageCode(forRegionCode regionCode: String?) -> String {
        guard let regionCode else { return "en" }
        switch regionCode.uppercased() {
        case "MX", "ES", "AR", "CO", "PE":
            return "es"
        case "FR", "BE", "CA":
            return "fr"
        case "DE", "AT", "CH":
            return "de"
        case "JP":
            return "ja"
        case "CN", "TW", "SG":
            return "zh"
        case "BR", "PT":
            return "pt"
        case "SA", "AE", "EG":
            return "ar"
        default:
            return "en"
        }
    }
}

@MainActor
final class ResponderLocationLanguageService: NSObject, @preconcurrency CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private let geocoder = CLGeocoder()
    private var continuation: CheckedContinuation<String, Error>?

    override init() {
        super.init()
        manager.delegate = self
    }

    func requestSuggestedLanguage() async throws -> String {
        let status = manager.authorizationStatus
        if let location = manager.location, status == .authorizedWhenInUse || status == .authorizedAlways {
            return try await reverseGeocodeLanguage(from: location)
        }

        manager.requestWhenInUseAuthorization()
        manager.requestLocation()
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else {
            finish(with: .success("en"))
            return
        }

        Task {
            let language = (try? await reverseGeocodeLanguage(from: location)) ?? "en"
            finish(with: .success(language))
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        finish(with: .failure(error))
    }

    private func reverseGeocodeLanguage(from location: CLLocation) async throws -> String {
        let placemarks = try await geocoder.reverseGeocodeLocation(location)
        return LocationLanguageMapper.languageCode(forRegionCode: placemarks.first?.isoCountryCode)
    }

    private func finish(with result: Result<String, Error>) {
        switch result {
        case .success(let language):
            continuation?.resume(returning: language)
        case .failure(let error):
            continuation?.resume(throwing: error)
        }
        continuation = nil
    }
}
