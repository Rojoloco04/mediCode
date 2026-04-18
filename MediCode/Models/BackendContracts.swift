import Foundation

enum ResponderRole: String, Codable, CaseIterable, Sendable {
    case firstResponder = "first_responder"
    case triageNurse = "triage_nurse"
}

enum ResponderStatus: String, Codable, CaseIterable, Sendable {
    case pending
    case active
    case suspended
}

struct ResponderAccount: Codable, Equatable, Sendable, Identifiable {
    var id: UUID
    var authUserId: UUID
    var role: ResponderRole
    var organizationName: String
    var credentialIdHash: String
    var status: ResponderStatus
    var lastVerifiedAt: Date?
}

struct SyncHealthProfileRequest: Codable, Equatable, Sendable {
    var profile: PatientEmergencyProfile
    var importedSnapshot: HealthImportSnapshot
}

struct SyncHealthProfileResponse: Codable, Equatable, Sendable {
    var profile: PatientEmergencyProfile
}

struct PublishEmergencyCardRequest: Codable, Equatable, Sendable {
    var profileId: UUID
    var profileVersion: Int
    var sourceLanguage: String
}

struct PublishEmergencyCardResponse: Codable, Equatable, Sendable {
    var shareToken: String
    var tokenVersion: Int
    var universalLink: URL
    var publishedAt: Date
}

struct OpenResponderAccessRequest: Codable, Equatable, Sendable {
    var shareToken: String
    var responderUserId: UUID
    var enteredCredentialId: String
    var responderLanguageCode: String
}

struct OpenResponderAccessResponse: Codable, Equatable, Sendable {
    var sessionId: UUID
    var responder: ResponderAccount
    var summary: EmergencySummary
}

struct TranslateEmergencySummaryRequest: Codable, Equatable, Sendable {
    var profileId: UUID
    var profileVersion: Int
    var summary: EmergencySummary
    var targetLanguageCode: String
}

struct TranslateEmergencySummaryResponse: Codable, Equatable, Sendable {
    var translatedSummary: EmergencySummary
    var targetLanguageCode: String
    var cacheHit: Bool
}

struct LogResponderAccessRequest: Codable, Equatable, Sendable {
    var profileId: UUID
    var responderAccountId: UUID
    var action: String
    var targetLanguageCode: String?
}
