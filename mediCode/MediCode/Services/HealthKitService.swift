import Foundation
import HealthKit

enum HealthKitError: LocalizedError {
    case unavailable
    case authorizationDenied

    var errorDescription: String? {
        switch self {
        case .unavailable:
            return String(localized: "Health data is not available on this device.")
        case .authorizationDenied:
            return String(localized: "MediCode needs Health permissions to import the emergency summary.")
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
        let medicalIDNotes = [formattedDateOfBirth(), formattedBiologicalSex(), formattedWheelchairUse()].compactMap { $0 }
        let allergies: [String] = []
        let conditions: [String] = []
        let medications: [String] = []
        let status: HealthImportStatus = (bloodType == nil && medicalIDNotes.isEmpty) ? .partial : .ready

        return HealthImportSnapshot(
            bloodType: bloodType,
            allergies: allergies,
            conditions: conditions,
            medications: medications,
            medicalIDNotes: medicalIDNotes,
            importedAt: .now,
            status: status
        )
    }

    private func requestedReadTypes() -> Set<HKObjectType> {
        [
            HKObjectType.characteristicType(forIdentifier: .bloodType)!
        ]
    }

    private func formattedDateOfBirth() -> String? {
        guard let components = try? store.dateOfBirthComponents(),
              let date = Calendar(identifier: .gregorian).date(from: components) else {
            return nil
        }
        return "Date of Birth: \(date.formatted(date: .abbreviated, time: .omitted))"
    }

    private func formattedBiologicalSex() -> String? {
        guard let value = try? store.biologicalSex().biologicalSex.displayValue else { return nil }
        return "Biological Sex: \(value)"
    }

    private func formattedWheelchairUse() -> String? {
        guard let value = try? store.wheelchairUse().wheelchairUse.displayValue else { return nil }
        return "Wheelchair Use: \(value)"
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

extension HKBiologicalSex {
    var displayValue: String? {
        switch self {
        case .notSet: return nil
        case .female: return "Female"
        case .male: return "Male"
        case .other: return "Other"
        @unknown default: return nil
        }
    }
}

extension HKWheelchairUse {
    var displayValue: String? {
        switch self {
        case .notSet: return nil
        case .yes: return "Yes"
        case .no: return "No"
        @unknown default: return nil
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
            medicalIDNotes: [
                "Date of Birth: Jan 1, 1990",
                "Biological Sex: Female",
                "Wheelchair Use: No"
            ],
            importedAt: .now,
            status: .ready
        )
    }
}
