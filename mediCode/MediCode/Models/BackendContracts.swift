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
    var authUserId: UUID?
    var fullName: String
    var workEmail: String
    var role: ResponderRole
    var organizationName: String
    var licenseRegion: String
    var credentialIdHash: String
    var status: ResponderStatus
    var lastVerifiedAt: Date?

    var canAccessScannedData: Bool {
        status == .active
    }
}

struct RegisterResponderRequest: Codable, Equatable, Sendable {
    var fullName: String
    var workEmail: String
    var role: ResponderRole
    var organizationName: String
    var credentialId: String
    var licenseRegion: String
}

struct RegisterResponderResponse: Codable, Equatable, Sendable {
    var responder: ResponderAccount
    var registrationMessage: String
}

struct FetchResponderStatusRequest: Codable, Equatable, Sendable {
    var workEmail: String
    var credentialId: String
}

struct FetchResponderStatusResponse: Codable, Equatable, Sendable {
    var responder: ResponderAccount
    var statusMessage: String
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
    var summary: EmergencySummary
}

struct PublishEmergencyCardResponse: Codable, Equatable, Sendable {
    var shareToken: String
    var tokenVersion: Int
    var universalLink: URL
    var publishedAt: Date
}

struct OpenResponderAccessRequest: Codable, Equatable, Sendable {
    var shareToken: String
    var responderAccountId: UUID
    var responderLanguageCode: String
}

struct OpenResponderAccessResponse: Codable, Equatable, Sendable {
    var sessionId: UUID
    var profileId: UUID
    var profileVersion: Int
    var responder: ResponderAccount
    var sourceSummary: EmergencySummary
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
