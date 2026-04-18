import SwiftUI

struct OnboardingFlowView: View {
    enum Step: Int, CaseIterable {
        case language
        case consent
        case health
        case review
        case finalize

        var title: String {
            switch self {
            case .language: "Language"
            case .consent: "Consent"
            case .health: "Health Import"
            case .review: "Review"
            case .finalize: "Finalize"
            }
        }
    }

    @Bindable var appModel: AppModel
    @State private var draft = PatientEmergencyProfile.empty()
    @State private var importedSnapshot: HealthImportSnapshot?
    @State private var step: Step = .language
    @State private var consentConfirmed = false
    @State private var isImporting = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 24) {
                progressHeader
                content
                Spacer(minLength: 0)
                actionRow
            }
            .padding(24)
            .navigationTitle("MediCode Setup")
            .task {
                if let profile = appModel.profile {
                    draft = profile
                }
            }
            .alert("Unable to continue", isPresented: .constant(appModel.lastError != nil), actions: {
                Button("OK") {
                    appModel.lastError = nil
                }
            }, message: {
                Text(appModel.lastError ?? "")
            })
        }
    }

    private var progressHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Build a secure emergency profile first, then publish a QR card that first responders can open in their language.")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(Step.allCases, id: \.self) { current in
                    RoundedRectangle(cornerRadius: 999)
                        .fill(current.rawValue <= step.rawValue ? Color.red : Color.gray.opacity(0.2))
                        .frame(height: 8)
                }
            }

            Text(step.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case .language:
            VStack(alignment: .leading, spacing: 16) {
                Text("Choose the language the patient profile is written in.")
                    .font(.title3.weight(.semibold))
                TextField("Source language code", text: $draft.sourceLanguage)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding()
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
                Text("MediCode will keep the original wording and only translate the minimum triage summary for responders.")
                    .foregroundStyle(.secondary)
            }

        case .consent:
            VStack(alignment: .leading, spacing: 16) {
                Text("Consent and privacy")
                    .font(.title3.weight(.semibold))
                Text("Before pulling data from Apple Health, confirm that the patient understands HealthKit access, cloud-assisted translation, and responder audit logging.")
                    .foregroundStyle(.secondary)
                Toggle("I confirm the patient consents to Health access and secure emergency translation.", isOn: $consentConfirmed)
                    .toggleStyle(.switch)
            }

        case .health:
            VStack(alignment: .leading, spacing: 16) {
                Text("Import the emergency summary from Apple Health.")
                    .font(.title3.weight(.semibold))
                Text("MediCode reads blood type directly and pulls clinical record summaries for allergies, conditions, and medications when those records are available.")
                    .foregroundStyle(.secondary)

                Button {
                    Task {
                        await importHealthData()
                    }
                } label: {
                    HStack {
                        if isImporting {
                            ProgressView()
                        }
                        Text(importedSnapshot == nil ? "Import from Health" : "Refresh Health Import")
                    }
                }
                .buttonStyle(.borderedProminent)

                if let importedSnapshot {
                    summaryList(title: "Imported Allergies", values: importedSnapshot.allergies)
                    summaryList(title: "Imported Conditions", values: importedSnapshot.conditions)
                    summaryList(title: "Imported Medications", values: importedSnapshot.medications)
                }
            }

        case .review:
            VStack(alignment: .leading, spacing: 16) {
                Text("Review imported data")
                    .font(.title3.weight(.semibold))
                Text("Manual edits always win over imported values. Anything missing from Health should be confirmed here before you publish.")
                    .foregroundStyle(.secondary)

                summaryList(title: "Allergies", values: draft.allergies)
                summaryList(title: "Conditions", values: draft.conditions)
                summaryList(title: "Medications", values: draft.medications)
                summaryList(title: "Emergency Contacts", values: draft.emergencyContacts.map { [$0.name, $0.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • ") })
            }

        case .finalize:
            VStack(alignment: .leading, spacing: 16) {
                Text("Finalize the patient profile")
                    .font(.title3.weight(.semibold))
                Text("Confirm key details, then save the profile. The QR card can be published from the next tab.")
                    .foregroundStyle(.secondary)

                ProfileEditorView(profile: draft) { profile in
                    draft = profile
                }
            }
        }
    }

    private var actionRow: some View {
        HStack {
            if step != .language {
                Button("Back") {
                    withAnimation {
                        step = Step(rawValue: step.rawValue - 1) ?? .language
                    }
                }
            }

            Spacer()

            Button(step == .finalize ? "Finish Setup" : "Continue") {
                Task {
                    await advance()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canAdvance)
        }
    }

    private var canAdvance: Bool {
        switch step {
        case .language:
            return normalizedOrNil(draft.sourceLanguage) != nil
        case .consent:
            return consentConfirmed
        case .health:
            return importedSnapshot != nil
        case .review:
            return true
        case .finalize:
            return draft.isConfigured
        }
    }

    private func importHealthData() async {
        isImporting = true
        defer { isImporting = false }

        do {
            let snapshot = try await appModel.dependencies.healthKit.importEmergencySnapshot()
            importedSnapshot = snapshot
            draft = HealthProfileNormalizer.merge(base: draft, snapshot: snapshot)
            draft.healthImportStatus = snapshot.status
            draft.lastHealthSyncAt = snapshot.importedAt
        } catch {
            appModel.lastError = error.localizedDescription
        }
    }

    private func advance() async {
        guard canAdvance else { return }

        if step == .finalize {
            await appModel.completeOnboarding(with: draft)
            return
        }

        withAnimation {
            step = Step(rawValue: step.rawValue + 1) ?? .finalize
        }
    }

    @ViewBuilder
    private func summaryList(title: String, values: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)

            if values.cleanedList().isEmpty {
                Text("No data yet")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(values.cleanedList(), id: \.self) { value in
                    Text("• \(value)")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20))
    }
}
