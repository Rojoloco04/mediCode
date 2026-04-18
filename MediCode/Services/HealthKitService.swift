import Foundation
import HealthKit

enum HealthKitError: LocalizedError {
    case unavailable
    case authorizationDenied

    var errorDescription: String? {
        switch self {
        case .unavailable:
            return "Health data is not available on this device."
        case .authorizationDenied:
            return "MediCode needs Health permissions to import the emergency summary."
        }
    }
}

protocol HealthKitProviding {
    func requestAuthorizationIfNeeded() async throws
    func importEmergencySnapshot() async throws -> HealthImportSnapshot
}

struct LiveHealthKitService: HealthKitProviding {
    private let store = HKHealthStore()

    func requestAuthorizationIfNeeded() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.unavailable
        }

        let readTypes = requestedReadTypes()

        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    func importEmergencySnapshot() async throws -> HealthImportSnapshot {
        try await requestAuthorizationIfNeeded()

        let bloodType = try? store.bloodType().bloodType.stringValue
        let supportsClinicalRecords = store.supportsHealthRecords()
        let allergies = supportsClinicalRecords ? (try await queryClinicalRecordNames(for: .allergyRecord)) : []
        let conditions = supportsClinicalRecords ? (try await queryClinicalRecordNames(for: .conditionRecord)) : []
        let medications = supportsClinicalRecords ? (try await queryClinicalRecordNames(for: .medicationRecord)) : []

        let status: HealthImportStatus
        if bloodType == nil && allergies.isEmpty && conditions.isEmpty && medications.isEmpty {
            status = supportsClinicalRecords ? .partial : .partial
        } else if supportsClinicalRecords {
            status = .ready
        } else {
            status = .partial
        }

        return HealthImportSnapshot(
            bloodType: bloodType,
            allergies: allergies,
            conditions: conditions,
            medications: medications,
            importedAt: .now,
            status: status
        )
    }

    private func requestedReadTypes() -> Set<HKObjectType> {
        var readTypes: Set<HKObjectType> = [
            HKObjectType.characteristicType(forIdentifier: .bloodType)!
        ]

        guard store.supportsHealthRecords() else {
            return readTypes
        }

        if let allergyType = HKObjectType.clinicalType(forIdentifier: .allergyRecord) {
            readTypes.insert(allergyType)
        }
        if let conditionType = HKObjectType.clinicalType(forIdentifier: .conditionRecord) {
            readTypes.insert(conditionType)
        }
        if let medicationType = HKObjectType.clinicalType(forIdentifier: .medicationRecord) {
            readTypes.insert(medicationType)
        }

        return readTypes
    }

    private func queryClinicalRecordNames(for identifier: HKClinicalTypeIdentifier) async throws -> [String] {
        guard let clinicalType = HKObjectType.clinicalType(forIdentifier: identifier) else {
            return []
        }

        let samples = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HKClinicalRecord], Error>) in
            let query = HKSampleQuery(
                sampleType: clinicalType,
                predicate: nil,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                continuation.resume(returning: (samples as? [HKClinicalRecord]) ?? [])
            }
            store.execute(query)
        }

        return samples.map(\.displayName).cleanedList()
    }
}

extension HKBloodType {
    var stringValue: String {
        switch self {
        case .notSet: return ""
        case .aPositive: return "A+"
        case .aNegative: return "A-"
        case .bPositive: return "B+"
        case .bNegative: return "B-"
        case .abPositive: return "AB+"
        case .abNegative: return "AB-"
        case .oPositive: return "O+"
        case .oNegative: return "O-"
        @unknown default: return ""
        }
    }
}

struct PreviewHealthKitService: HealthKitProviding {
    func requestAuthorizationIfNeeded() async throws {}

    func importEmergencySnapshot() async throws -> HealthImportSnapshot {
        HealthImportSnapshot(
            bloodType: "O+",
            allergies: ["Penicillin", "Peanuts"],
            conditions: ["Type 1 Diabetes"],
            medications: ["Insulin"],
            importedAt: .now,
            status: .ready
        )
    }
}
