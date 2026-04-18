import Foundation

enum BackendError: LocalizedError {
    case notConfigured
    case invalidResponse
    case requestFailed(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured yet. MediCode is using local preview data."
        case .invalidResponse:
            return "The backend returned an unexpected response."
        case .requestFailed(let message):
            return message
        }
    }
}

protocol BackendAPI {
    func syncHealthProfile(_ request: SyncHealthProfileRequest) async throws -> SyncHealthProfileResponse
    func publishEmergencyCard(_ request: PublishEmergencyCardRequest) async throws -> PublishEmergencyCardResponse
    func openResponderAccess(_ request: OpenResponderAccessRequest) async throws -> OpenResponderAccessResponse
    func translateEmergencySummary(_ request: TranslateEmergencySummaryRequest) async throws -> TranslateEmergencySummaryResponse
    func logResponderAccess(_ request: LogResponderAccessRequest) async throws
}

struct BackendConfiguration: Sendable {
    var functionsBaseURL: URL
    var anonKey: String
}

struct SupabaseBackendClient: BackendAPI {
    let configuration: BackendConfiguration
    let urlSession: URLSession = .shared

    func syncHealthProfile(_ request: SyncHealthProfileRequest) async throws -> SyncHealthProfileResponse {
        try await call("syncHealthProfile", body: request, as: SyncHealthProfileResponse.self)
    }

    func publishEmergencyCard(_ request: PublishEmergencyCardRequest) async throws -> PublishEmergencyCardResponse {
        try await call("publishEmergencyCard", body: request, as: PublishEmergencyCardResponse.self)
    }

    func openResponderAccess(_ request: OpenResponderAccessRequest) async throws -> OpenResponderAccessResponse {
        try await call("openResponderAccess", body: request, as: OpenResponderAccessResponse.self)
    }

    func translateEmergencySummary(_ request: TranslateEmergencySummaryRequest) async throws -> TranslateEmergencySummaryResponse {
        try await call("translateEmergencySummary", body: request, as: TranslateEmergencySummaryResponse.self)
    }

    func logResponderAccess(_ request: LogResponderAccessRequest) async throws {
        _ = try await call("logResponderAccess", body: request, as: EmptyResponse.self)
    }

    private func call<Request: Encodable, Response: Decodable>(
        _ functionName: String,
        body: Request,
        as responseType: Response.Type
    ) async throws -> Response {
        guard configuration.functionsBaseURL.host != "example.supabase.co" else {
            throw BackendError.notConfigured
        }

        var request = URLRequest(url: configuration.functionsBaseURL.appendingPathComponent(functionName))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(configuration.anonKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder.mediCode.encode(body)

        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw BackendError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Request failed."
            throw BackendError.requestFailed(message)
        }

        return try JSONDecoder.mediCode.decode(responseType, from: data)
    }
}

struct PreviewBackendClient: BackendAPI {
    func syncHealthProfile(_ request: SyncHealthProfileRequest) async throws -> SyncHealthProfileResponse {
        SyncHealthProfileResponse(profile: request.profile)
    }

    func publishEmergencyCard(_ request: PublishEmergencyCardRequest) async throws -> PublishEmergencyCardResponse {
        let tokenVersion = max(request.profileVersion, 1)
        let token = "preview-\(request.profileId.uuidString.lowercased())-\(tokenVersion)"
        let url = URL(string: "https://medicode.example.com/emergency/\(request.profileId.uuidString.lowercased())?token=\(token)")!
        return PublishEmergencyCardResponse(
            shareToken: token,
            tokenVersion: tokenVersion,
            universalLink: url,
            publishedAt: .now
        )
    }

    func openResponderAccess(_ request: OpenResponderAccessRequest) async throws -> OpenResponderAccessResponse {
        let responder = ResponderAccount(
            id: UUID(),
            authUserId: request.responderUserId,
            role: .firstResponder,
            organizationName: "Preview EMS",
            credentialIdHash: "preview-hash",
            status: .active,
            lastVerifiedAt: .now
        )
        let summary = EmergencySummary(
            fullName: "Preview Patient",
            bloodType: "O+",
            allergies: ["Penicillin"],
            conditions: ["Asthma"],
            medications: ["Albuterol"],
            emergencyContacts: [EmergencyContact(name: "Jane Doe", relationship: "Sibling", phoneNumber: "+1 555-0100")],
            manualNotes: "Carries an inhaler in left jacket pocket.",
            sourceLanguage: "en"
        )
        return OpenResponderAccessResponse(sessionId: UUID(), responder: responder, summary: summary)
    }

    func translateEmergencySummary(_ request: TranslateEmergencySummaryRequest) async throws -> TranslateEmergencySummaryResponse {
        TranslateEmergencySummaryResponse(
            translatedSummary: request.summary,
            targetLanguageCode: request.targetLanguageCode,
            cacheHit: false
        )
    }

    func logResponderAccess(_ request: LogResponderAccessRequest) async throws {}
}

private struct EmptyResponse: Decodable {}

extension JSONEncoder {
    static let mediCode: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

extension JSONDecoder {
    static let mediCode: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
