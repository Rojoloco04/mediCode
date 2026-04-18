import Foundation

enum HealthImportStatus: String, Codable, CaseIterable, Sendable {
    case notStarted
    case pendingReview
    case ready
    case partial
    case denied
    case unavailable
}

struct EmergencyContact: Codable, Hashable, Identifiable, Sendable {
    var id: UUID
    var name: String
    var relationship: String
    var phoneNumber: String

    init(
        id: UUID = UUID(),
        name: String = "",
        relationship: String = "",
        phoneNumber: String = ""
    ) {
        self.id = id
        self.name = name
        self.relationship = relationship
        self.phoneNumber = phoneNumber
    }
}

struct HealthImportSnapshot: Codable, Equatable, Sendable {
    var bloodType: String?
    var allergies: [String]
    var conditions: [String]
    var medications: [String]
    var medicalIDNotes: [String]
    var importedAt: Date
    var status: HealthImportStatus
}

struct PatientEmergencyProfile: Codable, Equatable, Sendable, Identifiable {
    var id: UUID
    var ownerUserId: UUID
    var sourceLanguage: String
    var fullName: String
    var bloodType: String
    var allergies: [String]
    var conditions: [String]
    var medications: [String]
    var emergencyContacts: [EmergencyContact]
    var manualNotes: String
    var healthImportStatus: HealthImportStatus
    var lastHealthSyncAt: Date?
    var publishedShareTokenVersion: Int
    var updatedAt: Date

    static func empty(sourceLanguage: String = Locale.current.language.languageCode?.identifier ?? "en") -> PatientEmergencyProfile {
        PatientEmergencyProfile(
            id: UUID(),
            ownerUserId: UUID(),
            sourceLanguage: sourceLanguage,
            fullName: "",
            bloodType: "",
            allergies: [],
            conditions: [],
            medications: [],
            emergencyContacts: [EmergencyContact()],
            manualNotes: "",
            healthImportStatus: .notStarted,
            lastHealthSyncAt: nil,
            publishedShareTokenVersion: 0,
            updatedAt: .now
        )
    }

    var isConfigured: Bool {
        !fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var emergencySummary: EmergencySummary {
        EmergencySummary(
            fullName: fullName,
            bloodType: normalizedOrNil(bloodType),
            allergies: allergies.cleanedList(),
            conditions: conditions.cleanedList(),
            medications: medications.cleanedList(),
            emergencyContacts: emergencyContacts.filter { !$0.name.isEmpty || !$0.phoneNumber.isEmpty },
            manualNotes: normalizedOrNil(manualNotes),
            sourceLanguage: sourceLanguage
        )
    }
}

struct EmergencySummary: Codable, Equatable, Sendable {
    var fullName: String
    var bloodType: String?
    var allergies: [String]
    var conditions: [String]
    var medications: [String]
    var emergencyContacts: [EmergencyContact]
    var manualNotes: String?
    var sourceLanguage: String
}

struct ResponderPatientRecord: Codable, Equatable, Sendable, Identifiable {
    var profileId: UUID
    var shareToken: String
    var profileVersion: Int
    var sourceSummary: EmergencySummary
    var localizedSummary: EmergencySummary
    var targetLanguageCode: String
    var lastAccessedAt: Date
    var sessionId: UUID

    var id: UUID {
        profileId
    }
}

struct PublishedEmergencyCard: Codable, Equatable, Sendable {
    var shareToken: String
    var tokenVersion: Int
    var universalLink: URL
    var publishedAt: Date
}

struct WidgetSharedState: Codable, Equatable, Sendable {
    var isConfigured: Bool
    var isPublished: Bool
    var displayName: String
    var tokenVersion: Int
    var lastPublishedAt: Date?

    static let empty = WidgetSharedState(
        isConfigured: false,
        isPublished: false,
        displayName: "",
        tokenVersion: 0,
        lastPublishedAt: nil
    )
}

struct PatientAppState: Codable, Equatable, Sendable {
    var profile: PatientEmergencyProfile?
    var publishedCard: PublishedEmergencyCard?
    var responderPortal: ResponderPortalState?

    static let empty = PatientAppState(profile: nil, publishedCard: nil, responderPortal: .empty)

    var sanitizedForPersistence: PatientAppState {
        PatientAppState(
            profile: profile,
            publishedCard: publishedCard,
            responderPortal: responderPortal?.sanitizedForPersistence ?? .empty
        )
    }
}

struct ResponderPortalState: Codable, Equatable, Sendable {
    var account: ResponderAccount?
    var records: [ResponderPatientRecord]
    var selectedRecordID: UUID?
    var pendingShareToken: String?
    var lastDownloadedAt: Date?

    static let empty = ResponderPortalState(
        account: nil,
        records: [],
        selectedRecordID: nil,
        pendingShareToken: nil,
        lastDownloadedAt: nil
    )

    init(
        account: ResponderAccount?,
        records: [ResponderPatientRecord],
        selectedRecordID: UUID?,
        pendingShareToken: String?,
        lastDownloadedAt: Date?
    ) {
        self.account = account
        self.records = records
        self.selectedRecordID = selectedRecordID
        self.pendingShareToken = pendingShareToken
        self.lastDownloadedAt = lastDownloadedAt
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        account = try container.decodeIfPresent(ResponderAccount.self, forKey: .account)
        records = try container.decodeIfPresent([ResponderPatientRecord].self, forKey: .records) ?? []
        selectedRecordID = try container.decodeIfPresent(UUID.self, forKey: .selectedRecordID)
        pendingShareToken = try container.decodeIfPresent(String.self, forKey: .pendingShareToken)
        lastDownloadedAt = try container.decodeIfPresent(Date.self, forKey: .lastDownloadedAt)
    }

    var sanitizedForPersistence: ResponderPortalState {
        ResponderPortalState(
            account: account,
            records: [],
            selectedRecordID: nil,
            pendingShareToken: nil,
            lastDownloadedAt: lastDownloadedAt
        )
    }
}

enum SensitiveContext: Sendable {
    case widgetLocked
    case widgetUnlocked
    case qrCard
    case responderSummary
}

enum RedactionRule {
    static func allowsSensitiveDetails(in context: SensitiveContext) -> Bool {
        switch context {
        case .widgetLocked:
            return false
        case .widgetUnlocked, .qrCard, .responderSummary:
            return true
        }
    }
}

enum HealthProfileNormalizer {
    static func merge(
        base: PatientEmergencyProfile,
        snapshot: HealthImportSnapshot,
        now: Date = .now
    ) -> PatientEmergencyProfile {
        var merged = base
        merged.bloodType = chooseManualFirst(base.bloodType, imported: snapshot.bloodType ?? "")
        merged.allergies = chooseManualFirst(base.allergies, imported: snapshot.allergies)
        merged.conditions = chooseManualFirst(base.conditions, imported: snapshot.conditions)
        merged.medications = chooseManualFirst(base.medications, imported: snapshot.medications)
        merged.manualNotes = chooseManualFirst(base.manualNotes, imported: snapshot.medicalIDNotes.joined(separator: "\n"))
        merged.healthImportStatus = snapshot.status
        merged.lastHealthSyncAt = snapshot.importedAt
        merged.updatedAt = now
        return merged
    }

    private static func chooseManualFirst(_ current: String, imported: String) -> String {
        let currentValue = normalizedOrNil(current)
        return currentValue ?? imported
    }

    private static func chooseManualFirst(_ current: [String], imported: [String]) -> [String] {
        let currentValue = current.cleanedList()
        return currentValue.isEmpty ? imported.cleanedList() : currentValue
    }
}

func normalizedOrNil(_ value: String) -> String? {
    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return normalized.isEmpty ? nil : normalized
}

extension Array where Element == String {
    func cleanedList() -> [String] {
        var seen = Set<String>()
        return compactMap { normalizedOrNil($0) }
            .filter { seen.insert($0.lowercased()).inserted }
    }
}

func deviceLanguageCode(for locale: Locale = .autoupdatingCurrent) -> String {
    let code = locale.language.languageCode?.identifier ?? "en"
    return code == "und" ? "en" : code
}

func upsertingResponderRecord(
    _ record: ResponderPatientRecord,
    into records: [ResponderPatientRecord]
) -> [ResponderPatientRecord] {
    let filtered = records.filter { $0.profileId != record.profileId }
    return ([record] + filtered).sorted { $0.lastAccessedAt > $1.lastAccessedAt }
}
