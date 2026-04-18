import Foundation

enum BackendError: LocalizedError {
    case notConfigured
    case invalidResponse
    case requestFailed(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return String(localized: "Supabase is not configured yet. MediCode is using local preview data.")
        case .invalidResponse:
            return String(localized: "The backend returned an unexpected response.")
        case .requestFailed(let message):
            return message
        }
    }
}

protocol BackendAPI {
    func registerResponder(_ request: RegisterResponderRequest) async throws -> RegisterResponderResponse
    func fetchResponderStatus(_ request: FetchResponderStatusRequest) async throws -> FetchResponderStatusResponse
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

    func registerResponder(_ request: RegisterResponderRequest) async throws -> RegisterResponderResponse {
        try await call("registerResponderSelf", body: request, as: RegisterResponderResponse.self)
    }

    func fetchResponderStatus(_ request: FetchResponderStatusRequest) async throws -> FetchResponderStatusResponse {
        try await call("fetchResponderStatus", body: request, as: FetchResponderStatusResponse.self)
    }

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
            let message = String(data: data, encoding: .utf8) ?? String(localized: "Request failed.")
            throw BackendError.requestFailed(message)
        }

        return try JSONDecoder.mediCode.decode(responseType, from: data)
    }
}

struct PreviewBackendClient: BackendAPI {
    func registerResponder(_ request: RegisterResponderRequest) async throws -> RegisterResponderResponse {
        let responder = ResponderAccount(
            id: UUID(),
            authUserId: UUID(),
            fullName: request.fullName,
            workEmail: request.workEmail,
            role: request.role,
            organizationName: request.organizationName,
            licenseRegion: request.licenseRegion,
            credentialIdHash: "preview-hash-\(request.credentialId.lowercased())",
            status: .active,
            lastVerifiedAt: .now
        )
        return RegisterResponderResponse(
            responder: responder,
            registrationMessage: "Preview registration approved immediately so you can test responder access."
        )
    }

    func fetchResponderStatus(_ request: FetchResponderStatusRequest) async throws -> FetchResponderStatusResponse {
        let responder = ResponderAccount(
            id: UUID(),
            authUserId: UUID(),
            fullName: "Preview Responder",
            workEmail: request.workEmail,
            role: .firstResponder,
            organizationName: "Preview EMS",
            licenseRegion: "US-TX",
            credentialIdHash: "preview-hash-\(request.credentialId.lowercased())",
            status: .active,
            lastVerifiedAt: .now
        )
        return FetchResponderStatusResponse(
            responder: responder,
            statusMessage: "Responder account is active."
        )
    }

    func syncHealthProfile(_ request: SyncHealthProfileRequest) async throws -> SyncHealthProfileResponse {
        SyncHealthProfileResponse(profile: request.profile)
    }

    func publishEmergencyCard(_ request: PublishEmergencyCardRequest) async throws -> PublishEmergencyCardResponse {
        let tokenVersion = max(request.profileVersion, 1)
        let token = try previewShareToken(
            profileId: request.profileId,
            profileVersion: tokenVersion,
            summary: request.summary
        )
        let url = URL(string: "medicode://responder?token=\(token)")!
        return PublishEmergencyCardResponse(
            shareToken: token,
            tokenVersion: tokenVersion,
            universalLink: url,
            publishedAt: .now
        )
    }

    func openResponderAccess(_ request: OpenResponderAccessRequest) async throws -> OpenResponderAccessResponse {
        let responder = ResponderAccount(
            id: request.responderAccountId,
            authUserId: UUID(),
            fullName: "Preview Responder",
            workEmail: "responder@preview.medicode.app",
            role: .firstResponder,
            organizationName: "Preview EMS",
            licenseRegion: "US-TX",
            credentialIdHash: "preview-hash",
            status: .active,
            lastVerifiedAt: .now
        )
        let storedPayload = decodedPreviewPayload(from: request.shareToken)
        let sourceSummary = storedPayload?.summary ?? EmergencySummary(
            fullName: "Preview Patient",
            bloodType: "O+",
            allergies: ["Penicillin"],
            conditions: ["Asthma"],
            medications: ["Albuterol"],
            emergencyContacts: [EmergencyContact(name: "Jane Doe", relationship: "Sibling", phoneNumber: "+1 555-0100")],
            manualNotes: "Carries an inhaler in left jacket pocket.",
            sourceLanguage: "en"
        )
        let translatedSummary = try await translateEmergencySummary(
            TranslateEmergencySummaryRequest(
                profileId: storedPayload?.profileId ?? UUID(uuidString: "11111111-2222-3333-4444-555555555555")!,
                profileVersion: storedPayload?.profileVersion ?? 1,
                summary: sourceSummary,
                targetLanguageCode: request.responderLanguageCode
            )
        ).translatedSummary
        return OpenResponderAccessResponse(
            sessionId: UUID(),
            profileId: storedPayload?.profileId ?? UUID(uuidString: "11111111-2222-3333-4444-555555555555")!,
            profileVersion: storedPayload?.profileVersion ?? 1,
            responder: responder,
            sourceSummary: sourceSummary,
            summary: translatedSummary
        )
    }

    func translateEmergencySummary(_ request: TranslateEmergencySummaryRequest) async throws -> TranslateEmergencySummaryResponse {
        let translated = PreviewMedicalTranslator.translate(
            summary: request.summary,
            targetLanguageCode: request.targetLanguageCode
        )
        return TranslateEmergencySummaryResponse(
            translatedSummary: translated,
            targetLanguageCode: request.targetLanguageCode,
            cacheHit: false
        )
    }

    func logResponderAccess(_ request: LogResponderAccessRequest) async throws {}
}

private struct EmptyResponse: Decodable {}

private enum PreviewMedicalTranslator {
    static func translate(summary: EmergencySummary, targetLanguageCode: String) -> EmergencySummary {
        guard targetLanguageCode.lowercased().hasPrefix("es") else {
            return summary
        }

        return EmergencySummary(
            fullName: summary.fullName,
            bloodType: summary.bloodType,
            allergies: summary.allergies.map(translateSpanish),
            conditions: summary.conditions.map(translateSpanish),
            medications: summary.medications.map(translateSpanish),
            emergencyContacts: summary.emergencyContacts.map {
                var contact = $0
                contact.relationship = translateSpanish(contact.relationship)
                return contact
            },
            manualNotes: summary.manualNotes.map(translateSpanish),
            sourceLanguage: summary.sourceLanguage
        )
    }

    private static func translateSpanish(_ text: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return text }

        let glossary: [(String, String)] = [
            ("carries an inhaler in left jacket pocket", "lleva un inhalador en el bolsillo izquierdo de la chaqueta"),
            ("service dog may be nearby", "el perro de servicio puede estar cerca"),
            ("uses blue inhaler", "usa inhalador azul"),
            ("left jacket pocket", "bolsillo izquierdo de la chaqueta"),
            ("phone number", "numero de telefono"),
            ("shellfish", "mariscos"),
            ("penicillin", "penicilina"),
            ("peanuts", "cacahuates"),
            ("peanut", "cacahuate"),
            ("asthma", "asma"),
            ("diabetes", "diabetes"),
            ("epilepsy", "epilepsia"),
            ("latex", "latex"),
            ("insulin", "insulina"),
            ("inhaler", "inhalador"),
            ("sibling", "hermano o hermana"),
            ("partner", "pareja"),
            ("parent", "padre o madre"),
            ("mother", "madre"),
            ("father", "padre"),
            ("wife", "esposa"),
            ("husband", "esposo"),
            ("daughter", "hija"),
            ("son", "hijo")
        ]

        let translated = glossary.reduce(trimmed) { partial, pair in
            partial.replacingOccurrences(
                of: pair.0,
                with: pair.1,
                options: [.caseInsensitive, .regularExpression]
            )
        }

        return preserveInitialCapitalization(from: trimmed, to: translated)
    }

    private static func preserveInitialCapitalization(from source: String, to translated: String) -> String {
        guard let first = source.first, first.isUppercase, let translatedFirst = translated.first else {
            return translated
        }
        return String(translatedFirst).uppercased() + translated.dropFirst()
    }
}

private struct PreviewSharePayload: Codable {
    var profileId: UUID
    var profileVersion: Int
    var summary: EmergencySummary
}

private func previewShareToken(
    profileId: UUID,
    profileVersion: Int,
    summary: EmergencySummary
) throws -> String {
    let payload = PreviewSharePayload(
        profileId: profileId,
        profileVersion: profileVersion,
        summary: summary
    )
    let data = try JSONEncoder.mediCode.encode(payload)
    return "local.\(data.base64URLEncodedString())"
}

private func decodedPreviewPayload(from shareToken: String) -> PreviewSharePayload? {
    guard shareToken.hasPrefix("local.") else { return nil }
    let encodedPayload = String(shareToken.dropFirst("local.".count))
    guard let data = Data(base64URLEncoded: encodedPayload) else { return nil }
    return try? JSONDecoder.mediCode.decode(PreviewSharePayload.self, from: data)
}

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

private extension Data {
    func base64URLEncodedString() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    init?(base64URLEncoded string: String) {
        let remainder = string.count % 4
        let padding = remainder == 0 ? "" : String(repeating: "=", count: 4 - remainder)
        let normalized = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/") + padding
        self.init(base64Encoded: normalized)
    }
}
