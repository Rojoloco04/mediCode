import Foundation
import Testing
@testable import MediCode

struct MediCodeTests {
    @Test func healthImportPrefersManualOverrides() {
        let base = PatientEmergencyProfile(
            id: UUID(),
            ownerUserId: UUID(),
            sourceLanguage: "en",
            fullName: "Alex Rivera",
            bloodType: "A+",
            allergies: ["Latex"],
            conditions: ["Asthma"],
            medications: [],
            emergencyContacts: [EmergencyContact(name: "Jordan", relationship: "Sibling", phoneNumber: "555-0100")],
            manualNotes: "",
            healthImportStatus: .notStarted,
            lastHealthSyncAt: nil,
            publishedShareTokenVersion: 0,
            updatedAt: .distantPast
        )

        let snapshot = HealthImportSnapshot(
            bloodType: "O+",
            allergies: ["Penicillin"],
            conditions: ["Diabetes"],
            medications: ["Insulin"],
            importedAt: .now,
            status: .ready
        )

        let merged = HealthProfileNormalizer.merge(base: base, snapshot: snapshot, now: .now)
        #expect(merged.bloodType == "A+")
        #expect(merged.allergies == ["Latex"])
        #expect(merged.conditions == ["Asthma"])
        #expect(merged.medications == ["Insulin"])
    }

    @Test func shareTokenVersionUsesNewestPublishedVersion() async throws {
        let response = try await PreviewBackendClient().publishEmergencyCard(
            PublishEmergencyCardRequest(profileId: UUID(uuidString: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")!, profileVersion: 4, sourceLanguage: "en")
        )
        #expect(response.tokenVersion == 4)
        #expect(response.universalLink.absoluteString.contains("token=preview-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-4"))
    }

    @Test func locationLanguageMapperUsesCountryDefaults() {
        #expect(LocationLanguageMapper.languageCode(forRegionCode: "MX") == "es")
        #expect(LocationLanguageMapper.languageCode(forRegionCode: "JP") == "ja")
        #expect(LocationLanguageMapper.languageCode(forRegionCode: "US") == "en")
    }

    @Test func translationCacheKeyUsesProfileVersionAndLanguage() {
        let first = TranslationCacheKey(profileVersion: 3, targetLanguageCode: "es")
        let second = TranslationCacheKey(profileVersion: 3, targetLanguageCode: "es")
        let third = TranslationCacheKey(profileVersion: 4, targetLanguageCode: "es")
        #expect(first == second)
        #expect(first != third)
    }

    @Test func redactionRulesHideLockedWidgetContent() {
        #expect(RedactionRule.allowsSensitiveDetails(in: .widgetLocked) == false)
        #expect(RedactionRule.allowsSensitiveDetails(in: .responderSummary) == true)
    }

    @Test func stringCleaningDeduplicatesAndRemovesBlanks() {
        let values = [" Penicillin ", "", "penicillin", "Peanuts"]
        #expect(values.cleanedList() == ["Penicillin", "Peanuts"])
    }
}

private struct TranslationCacheKey: Equatable {
    var profileVersion: Int
    var targetLanguageCode: String
}
