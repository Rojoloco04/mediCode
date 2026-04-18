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
            case .language: String(localized: "Language")
            case .consent: String(localized: "Consent")
            case .health: String(localized: "Health Import")
            case .review: String(localized: "Review")
            case .finalize: String(localized: "Finalize")
            }
        }

        var headline: String {
            switch self {
            case .language:
                return String(localized: "Choose the patient language")
            case .consent:
                return String(localized: "Confirm consent")
            case .health:
                return String(localized: "Import from Apple Health")
            case .review:
                return String(localized: "Review the imported summary")
            case .finalize:
                return String(localized: "Finish the emergency profile")
            }
        }

        var detail: String {
            switch self {
            case .language:
                return String(localized: "Pick the language the patient profile should be written in before anything is translated.")
            case .consent:
                return String(localized: "Confirm the patient understands Health access, translation, and responder audit logging.")
            case .health:
                return String(localized: "Pull in whatever Apple Health can provide, then verify it before publishing.")
            case .review:
                return String(localized: "Check the imported emergency details now so the final edit step is faster.")
            case .finalize:
                return String(localized: "Complete any missing details, save the profile, then publish the QR card from the next tab.")
            }
        }
    }

    @Bindable var appModel: AppModel
    @Environment(\.locale) private var locale
    @State private var draft = PatientEmergencyProfile.empty()
    @State private var importedSnapshot: HealthImportSnapshot?
    @State private var step: Step = .language
    @State private var consentConfirmed = false
    @State private var isImporting = false
    @FocusState private var keyboardFocused: Bool

    private let quickLanguageChoices = ["en", "es", "fr", "ar"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        progressHeader
                        content
                    }
                    .padding(24)
                }

                actionRow
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                    .padding(.bottom, 20)
                    .background(.thinMaterial)
            }
            .navigationTitle("mediCode Setup")
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button(String(localized: "Done")) {
                        keyboardFocused = false
                    }
                }
            }
            .task {
                if let profile = appModel.profile {
                    draft = profile
                }
            }
            .alert(String(localized: "Unable to continue"), isPresented: .constant(appModel.lastError != nil), actions: {
                Button(String(localized: "OK")) {
                    appModel.lastError = nil
                }
            }, message: {
                Text(appModel.lastError ?? "")
            })
        }
    }

    private var progressHeader: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Emergency Profile Setup")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            Text("Build a secure emergency profile first, then publish a QR card that first responders can open in their language.")
                .font(.title3.weight(.semibold))

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(String(format: String(localized: "Step %d of %d"), step.rawValue + 1, Step.allCases.count))
                        .font(.subheadline.weight(.semibold))
                    Text(step.title)
                        .font(.headline)
                }

                Spacer()

                Text(step.headline)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }

            HStack(spacing: 8) {
                ForEach(Step.allCases, id: \.self) { current in
                    RoundedRectangle(cornerRadius: 999)
                        .fill(current.rawValue <= step.rawValue ? Color.red : Color.gray.opacity(0.2))
                        .frame(height: 8)
                }
            }

            Text(step.detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.red.opacity(0.10), Color.blue.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 28, style: .continuous)
        )
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case .language:
            onboardingCard {
                VStack(alignment: .leading, spacing: 18) {
                    sectionIntro(step.headline, step.detail)

                    VStack(alignment: .leading, spacing: 10) {
                        Text(String(localized: "Quick choices"))
                            .font(.subheadline.weight(.semibold))

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(quickLanguageChoices, id: \.self) { code in
                                languageChoice(code: code)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text(String(localized: "Or enter a language code"))
                            .font(.subheadline.weight(.semibold))

                        TextField("Source language code", text: $draft.sourceLanguage)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($keyboardFocused)
                            .padding()
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
                    }

                    tipRow(String(localized: "mediCode keeps the original wording and translates only the responder-facing emergency summary."))
                }
            }

        case .consent:
            onboardingCard {
                VStack(alignment: .leading, spacing: 18) {
                    sectionIntro(step.headline, step.detail)
                    checklistRow(String(localized: "Health data will be read from Apple Health."))
                    checklistRow(String(localized: "Only the minimum emergency summary is translated for responders."))
                    checklistRow(String(localized: "Responder access is logged for safety and auditing."))

                    Toggle(String(localized: "I confirm the patient consents to Health access and secure emergency translation."), isOn: $consentConfirmed)
                        .toggleStyle(.switch)
                        .padding(16)
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
                }
            }

        case .health:
            onboardingCard {
                VStack(alignment: .leading, spacing: 18) {
                    sectionIntro(step.headline, step.detail)

                    tipRow(String(localized: "mediCode imports blood type and any available Medical ID details from Apple Health. You can review and edit everything before publishing."))

                    HStack(spacing: 12) {
                        Button {
                            Task {
                                await importHealthData()
                            }
                        } label: {
                            HStack {
                                if isImporting {
                                    ProgressView()
                                }
                                Text(importedSnapshot == nil ? String(localized: "Import from Health") : String(localized: "Refresh Health Import"))
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)

                        if let importedSnapshot {
                            statusBadge(for: importedSnapshot.status)
                        }
                    }

                    if let importedSnapshot {
                        summaryList(title: "Imported Allergies", values: importedSnapshot.allergies)
                        summaryList(title: "Imported Conditions", values: importedSnapshot.conditions)
                        summaryList(title: "Imported Medications", values: importedSnapshot.medications)
                        summaryList(title: "Imported Medical ID", values: importedSnapshot.medicalIDNotes)
                    } else {
                        emptyStateCard(
                            title: String(localized: "No Health data imported yet"),
                            detail: String(localized: "Import once here, then confirm the patient details on the next screens.")
                        )
                    }
                }
            }

        case .review:
            onboardingCard {
                VStack(alignment: .leading, spacing: 18) {
                    sectionIntro(step.headline, step.detail)
                    tipRow(String(localized: "Manual edits always win over imported values. Use the final step to correct or complete anything missing."))
                    summaryList(title: "Allergies", values: draft.allergies)
                    summaryList(title: "Conditions", values: draft.conditions)
                    summaryList(title: "Medications", values: draft.medications)
                    summaryList(title: "Emergency Contacts", values: draft.emergencyContacts.map { [$0.name, $0.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • ") })
                }
            }

        case .finalize:
            onboardingCard {
                VStack(alignment: .leading, spacing: 18) {
                    sectionIntro(step.headline, step.detail)
                    tipRow(String(localized: "Save the profile here, then use the QR Card tab to publish the emergency QR."))

                    ProfileEditorView(profile: draft, layoutStyle: .embedded) { profile in
                        draft = profile
                        await appModel.completeOnboarding(with: profile)
                    }
                }
            }
        }
    }

    private var actionRow: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(step.detail)
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack {
                if step != .language {
                    Button(String(localized: "Back")) {
                        withAnimation {
                            step = Step(rawValue: step.rawValue - 1) ?? .language
                        }
                    }
                }

                Spacer()

                Button(step == .finalize ? String(localized: "Finish Setup") : String(localized: "Continue")) {
                    Task {
                        await advance()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canAdvance)
            }
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
                Text(String(localized: "No data yet"))
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

    @ViewBuilder
    private func onboardingCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(20)
            .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(Color.black.opacity(0.04), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 20, y: 8)
    }

    @ViewBuilder
    private func sectionIntro(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.title3.weight(.semibold))
            Text(detail)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func checklistRow(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text(text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func tipRow(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(.blue)
            Text(text)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(Color.blue.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
    }

    @ViewBuilder
    private func languageChoice(code: String) -> some View {
        let title = locale.localizedString(forLanguageCode: code) ?? code.uppercased()
        Button {
            draft.sourceLanguage = code
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(code.uppercased())
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(
                (draft.sourceLanguage == code ? Color.red.opacity(0.12) : Color(.secondarySystemBackground)),
                in: RoundedRectangle(cornerRadius: 18)
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func statusBadge(for status: HealthImportStatus) -> some View {
        Text(statusLabel(for: status))
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(statusColor(for: status).opacity(0.12), in: Capsule())
            .foregroundStyle(statusColor(for: status))
    }

    private func statusLabel(for status: HealthImportStatus) -> String {
        switch status {
        case .ready:
            return String(localized: "Imported")
        case .partial:
            return String(localized: "Partial")
        case .pendingReview:
            return String(localized: "Needs Review")
        case .denied:
            return String(localized: "Denied")
        case .unavailable:
            return String(localized: "Unavailable")
        case .notStarted:
            return String(localized: "Not Started")
        }
    }

    private func statusColor(for status: HealthImportStatus) -> Color {
        switch status {
        case .ready:
            return .green
        case .partial, .pendingReview:
            return .orange
        case .denied, .unavailable:
            return .red
        case .notStarted:
            return .gray
        }
    }

    @ViewBuilder
    private func emptyStateCard(title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            Text(detail)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20))
    }
}
