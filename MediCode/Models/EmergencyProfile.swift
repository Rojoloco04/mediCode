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

    static let empty = PatientAppState(profile: nil, publishedCard: nil)
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
