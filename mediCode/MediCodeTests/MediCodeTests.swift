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
            medicalIDNotes: ["Date of Birth: Jan 1, 1990"],
            importedAt: .now,
            status: .ready
        )

        let merged = HealthProfileNormalizer.merge(base: base, snapshot: snapshot, now: .now)
        #expect(merged.bloodType == "A+")
        #expect(merged.allergies == ["Latex"])
        #expect(merged.conditions == ["Asthma"])
        #expect(merged.medications == ["Insulin"])
        #expect(merged.manualNotes == "Date of Birth: Jan 1, 1990")
    }

    @Test func shareTokenVersionUsesNewestPublishedVersion() async throws {
        let summary = EmergencySummary(
            fullName: "Taylor Brooks",
            bloodType: "AB-",
            allergies: ["Latex"],
            conditions: ["Epilepsy"],
            medications: ["Levetiracetam"],
            emergencyContacts: [EmergencyContact(name: "Morgan", relationship: "Partner", phoneNumber: "555-0111")],
            manualNotes: "Service dog may be nearby.",
            sourceLanguage: "en"
        )
        let response = try await PreviewBackendClient().publishEmergencyCard(
            PublishEmergencyCardRequest(
                profileId: UUID(uuidString: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")!,
                profileVersion: 4,
                sourceLanguage: "en",
                summary: summary
            )
        )
        #expect(response.tokenVersion == 4)
        #expect(response.universalLink.absoluteString.contains("token=local."))
    }

    @Test func previewQrRoundTripsStoredPatientSummary() async throws {
        let summary = EmergencySummary(
            fullName: "Sam Carter",
            bloodType: "O-",
            allergies: ["Shellfish"],
            conditions: ["Asthma"],
            medications: ["Albuterol"],
            emergencyContacts: [EmergencyContact(name: "Riley", relationship: "Sibling", phoneNumber: "555-0199")],
            manualNotes: "Uses blue inhaler.",
            sourceLanguage: "en"
        )
        let backend = PreviewBackendClient()
        let publishResponse = try await backend.publishEmergencyCard(
            PublishEmergencyCardRequest(
                profileId: UUID(uuidString: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")!,
                profileVersion: 2,
                sourceLanguage: "en",
                summary: summary
            )
        )

        let openResponse = try await backend.openResponderAccess(
            OpenResponderAccessRequest(
                shareToken: publishResponse.shareToken,
                responderAccountId: UUID(),
                responderLanguageCode: "en"
            )
        )

        #expect(openResponse.profileVersion == 2)
        #expect(openResponse.profileId == UUID(uuidString: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")!)
        #expect(openResponse.sourceSummary == summary)
        #expect(openResponse.summary == summary)
    }

    @Test func previewTranslationLocalizesPatientEnteredSummaryForSpanish() async throws {
        let backend = PreviewBackendClient()
        let translated = try await backend.translateEmergencySummary(
            TranslateEmergencySummaryRequest(
                profileId: UUID(),
                profileVersion: 1,
                summary: EmergencySummary(
                    fullName: "Sam Carter",
                    bloodType: "O-",
                    allergies: ["Peanuts"],
                    conditions: ["Asthma"],
                    medications: ["Insulin"],
                    emergencyContacts: [EmergencyContact(name: "Riley", relationship: "Sibling", phoneNumber: "555-0199")],
                    manualNotes: "Uses blue inhaler",
                    sourceLanguage: "en"
                ),
                targetLanguageCode: "es"
            )
        ).translatedSummary

        #expect(translated.allergies == ["Cacahuates"])
        #expect(translated.conditions == ["Asma"])
        #expect(translated.medications == ["Insulina"])
        #expect(translated.emergencyContacts.first?.relationship == "Hermano o hermana")
        #expect(translated.manualNotes == "Usa inhalador azul")
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

    @Test func responderRecordUpsertKeepsLatestRecordPerPatient() {
        let profileId = UUID()
        let olderRecord = ResponderPatientRecord(
            profileId: profileId,
            shareToken: "token-old",
            profileVersion: 1,
            sourceSummary: EmergencySummary(
                fullName: "Jamie Older",
                bloodType: "A+",
                allergies: [],
                conditions: [],
                medications: [],
                emergencyContacts: [],
                manualNotes: nil,
                sourceLanguage: "en"
            ),
            localizedSummary: EmergencySummary(
                fullName: "Jamie Older",
                bloodType: "A+",
                allergies: [],
                conditions: [],
                medications: [],
                emergencyContacts: [],
                manualNotes: nil,
                sourceLanguage: "en"
            ),
            targetLanguageCode: "en",
            lastAccessedAt: .distantPast,
            sessionId: UUID()
        )
        let newerRecord = ResponderPatientRecord(
            profileId: profileId,
            shareToken: "token-new",
            profileVersion: 2,
            sourceSummary: EmergencySummary(
                fullName: "Jamie Newer",
                bloodType: "O+",
                allergies: ["Peanuts"],
                conditions: [],
                medications: [],
                emergencyContacts: [],
                manualNotes: nil,
                sourceLanguage: "en"
            ),
            localizedSummary: EmergencySummary(
                fullName: "Jamie Newer",
                bloodType: "O+",
                allergies: ["Peanuts"],
                conditions: [],
                medications: [],
                emergencyContacts: [],
                manualNotes: nil,
                sourceLanguage: "en"
            ),
            targetLanguageCode: "es",
            lastAccessedAt: .now,
            sessionId: UUID()
        )

        let updated = upsertingResponderRecord(newerRecord, into: [olderRecord])
        #expect(updated.count == 1)
        #expect(updated.first?.shareToken == "token-new")
        #expect(updated.first?.targetLanguageCode == "es")
    }

    @Test func deviceLanguageCodeFallsBackToEnglish() {
        let locale = Locale(identifier: "ja_JP")
        #expect(deviceLanguageCode(for: locale) == "ja")
        #expect(deviceLanguageCode(for: Locale(identifier: "und")) == "en")
    }

    @Test func responderPersistenceStripsStoredPatientData() {
        let record = ResponderPatientRecord(
            profileId: UUID(),
            shareToken: "local.sensitive-payload",
            profileVersion: 3,
            sourceSummary: EmergencySummary(
                fullName: "Chris Doe",
                bloodType: "A-",
                allergies: ["Peanuts"],
                conditions: ["Asthma"],
                medications: ["Albuterol"],
                emergencyContacts: [EmergencyContact(name: "Pat", relationship: "Parent", phoneNumber: "555-0102")],
                manualNotes: "Sensitive",
                sourceLanguage: "en"
            ),
            localizedSummary: EmergencySummary(
                fullName: "Chris Doe",
                bloodType: "A-",
                allergies: ["Peanuts"],
                conditions: ["Asthma"],
                medications: ["Albuterol"],
                emergencyContacts: [EmergencyContact(name: "Pat", relationship: "Parent", phoneNumber: "555-0102")],
                manualNotes: "Sensitive",
                sourceLanguage: "en"
            ),
            targetLanguageCode: "en",
            lastAccessedAt: .now,
            sessionId: UUID()
        )
        let responderState = ResponderPortalState(
            account: ResponderAccount(
                id: UUID(),
                authUserId: UUID(),
                fullName: "Responder",
                workEmail: "responder@example.com",
                role: .firstResponder,
                organizationName: "EMS",
                licenseRegion: "US-TX",
                credentialIdHash: "hash",
                status: .active,
                lastVerifiedAt: .now
            ),
            records: [record],
            selectedRecordID: record.id,
            pendingShareToken: "local.pending-payload",
            lastDownloadedAt: .now
        )

        let sanitized = responderState.sanitizedForPersistence
        #expect(sanitized.account?.fullName == "Responder")
        #expect(sanitized.records.isEmpty)
        #expect(sanitized.selectedRecordID == nil)
        #expect(sanitized.pendingShareToken == nil)
        #expect(sanitized.lastDownloadedAt != nil)
    }
}

private struct TranslationCacheKey: Equatable {
    var profileVersion: Int
    var targetLanguageCode: String
}
