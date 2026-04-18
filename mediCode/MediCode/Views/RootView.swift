import Foundation
import SwiftUI
import Translation
import UIKit

enum AppTab: Hashable {
    case profile
    case qrCard
    case responder
}

@MainActor
@Observable
final class AppModel {
    let dependencies: AppDependencies
    var profile: PatientEmergencyProfile?
    var publishedCard: PublishedEmergencyCard?
    var responderState: ResponderPortalState = .empty
    var selectedTab: AppTab = .profile
    var isLoaded = false
    var lastError: String?

    init(dependencies: AppDependencies) {
        self.dependencies = dependencies
    }

    var needsOnboarding: Bool {
        !(profile?.isConfigured ?? false)
    }

    var selectedResponderRecord: ResponderPatientRecord? {
        guard let selectedRecordID = responderState.selectedRecordID else { return responderState.records.first }
        return responderState.records.first(where: { $0.id == selectedRecordID }) ?? responderState.records.first
    }

    var usesPreviewBackend: Bool {
        dependencies.usesPreviewBackend
    }

    func load() async {
        let state = await dependencies.profileStore.loadAppState()
        profile = state.profile
        publishedCard = state.publishedCard
        responderState = state.responderPortal?.sanitizedForPersistence ?? .empty
        if let pendingRoute = await dependencies.profileStore.consumePendingRoute() {
            apply(route: pendingRoute)
        }
        await persist()
        await syncResponderRecordsToSystemLanguage()
        await openPendingResponderTokenIfPossible()
        isLoaded = true
    }

    func completeOnboarding(with profile: PatientEmergencyProfile) async {
        self.profile = profile
        await persist()
    }

    func saveProfile(_ profile: PatientEmergencyProfile) async {
        self.profile = profile
        await persist()
    }

    func publishEmergencyCard() async {
        guard let profile else { return }

        do {
            let response = try await dependencies.backend.publishEmergencyCard(
                PublishEmergencyCardRequest(
                    profileId: profile.id,
                    profileVersion: max(profile.publishedShareTokenVersion + 1, 1),
                    sourceLanguage: profile.sourceLanguage,
                    summary: profile.emergencySummary
                )
            )

            publishedCard = PublishedEmergencyCard(
                shareToken: response.shareToken,
                tokenVersion: response.tokenVersion,
                universalLink: response.universalLink,
                publishedAt: response.publishedAt
            )

            var updatedProfile = profile
            updatedProfile.publishedShareTokenVersion = response.tokenVersion
            updatedProfile.updatedAt = .now
            self.profile = updatedProfile
            await persist()
            selectedTab = .qrCard
        } catch {
            lastError = error.localizedDescription
        }
    }

    func registerResponder(
        fullName: String,
        workEmail: String,
        role: ResponderRole,
        organizationName: String,
        credentialId: String,
        licenseRegion: String
    ) async {
        do {
            let response = try await dependencies.backend.registerResponder(
                RegisterResponderRequest(
                    fullName: fullName,
                    workEmail: workEmail,
                    role: role,
                    organizationName: organizationName,
                    credentialId: credentialId,
                    licenseRegion: licenseRegion
                )
            )
            responderState.account = response.responder
            await persist()
            await openPendingResponderTokenIfPossible()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func refreshResponderStatus(workEmail: String, credentialId: String) async {
        do {
            let response = try await dependencies.backend.fetchResponderStatus(
                FetchResponderStatusRequest(workEmail: workEmail, credentialId: credentialId)
            )
            responderState.account = response.responder
            await persist()
            await openPendingResponderTokenIfPossible()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func openResponderSummary(shareToken: String, languageCode: String) async {
        guard let account = responderState.account else { return }

        do {
            let response = try await dependencies.backend.openResponderAccess(
                OpenResponderAccessRequest(
                    shareToken: shareToken,
                    responderAccountId: account.id,
                    responderLanguageCode: normalizedOrNil(languageCode) ?? deviceLanguageCode()
                )
            )
            let record = ResponderPatientRecord(
                profileId: response.profileId,
                shareToken: shareToken,
                profileVersion: response.profileVersion,
                sourceSummary: response.sourceSummary,
                localizedSummary: response.summary,
                targetLanguageCode: normalizedOrNil(languageCode) ?? deviceLanguageCode(),
                lastAccessedAt: .now,
                sessionId: response.sessionId
            )
            responderState.account = response.responder
            responderState.records = upsertingResponderRecord(record, into: responderState.records)
            responderState.selectedRecordID = record.id
            responderState.pendingShareToken = nil
            await persist()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func openPendingResponderTokenIfPossible(languageCode: String = deviceLanguageCode()) async {
        guard responderState.account?.canAccessScannedData == true,
              let shareToken = normalizedOrNil(responderState.pendingShareToken ?? "") else {
            return
        }

        await openResponderSummary(shareToken: shareToken, languageCode: languageCode)
    }

    func selectResponderRecord(_ recordID: UUID) {
        responderState.selectedRecordID = recordID
        Task {
            await persist()
        }
    }

    func applyTranslatedResponderRecord(
        recordID: UUID,
        localizedSummary: EmergencySummary,
        targetLanguageCode: String
    ) {
        guard let index = responderState.records.firstIndex(where: { $0.id == recordID }) else { return }
        responderState.records[index].localizedSummary = localizedSummary
        responderState.records[index].targetLanguageCode = targetLanguageCode
    }

    func syncResponderRecordsToSystemLanguage(languageCode: String = deviceLanguageCode()) async {
        guard responderState.account != nil else { return }
        let desiredLanguageCode = normalizedOrNil(languageCode) ?? deviceLanguageCode()
        var updatedRecords: [ResponderPatientRecord] = []

        for record in responderState.records {
            guard record.targetLanguageCode != desiredLanguageCode else {
                updatedRecords.append(record)
                continue
            }

            do {
                let response = try await dependencies.backend.translateEmergencySummary(
                    TranslateEmergencySummaryRequest(
                        profileId: record.profileId,
                        profileVersion: record.profileVersion,
                        summary: record.sourceSummary,
                        targetLanguageCode: desiredLanguageCode
                    )
                )
                var translatedRecord = record
                translatedRecord.localizedSummary = response.translatedSummary
                translatedRecord.targetLanguageCode = response.targetLanguageCode
                updatedRecords.append(translatedRecord)
            } catch {
                updatedRecords.append(record)
                lastError = error.localizedDescription
            }
        }

        responderState.records = updatedRecords.sorted { $0.lastAccessedAt > $1.lastAccessedAt }
        if responderState.selectedRecordID == nil {
            responderState.selectedRecordID = responderState.records.first?.id
        }
        await persist()
    }

    func markResponderDownload() async {
        responderState.lastDownloadedAt = .now

        guard
            let account = responderState.account,
            let record = selectedResponderRecord
        else {
            await persist()
            return
        }

        do {
            try await dependencies.backend.logResponderAccess(
                LogResponderAccessRequest(
                    profileId: record.profileId,
                    responderAccountId: account.id,
                    action: "download_summary",
                    targetLanguageCode: record.targetLanguageCode
                )
            )
        } catch {
            lastError = error.localizedDescription
        }

        await persist()
    }

    func apply(route: AppRoute) {
        switch route {
        case .profile:
            selectedTab = .profile
        case .qrCard:
            selectedTab = .qrCard
        case .responder:
            selectedTab = .responder
        }
    }

    func handle(url: URL) {
        if let shareToken = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "token" })?
            .value {
            responderState.pendingShareToken = shareToken
            selectedTab = .responder
            Task {
                await persist()
                await openPendingResponderTokenIfPossible()
            }
        } else if url.host == "qr-card" || url.path.contains("qr-card") {
            apply(route: .qrCard)
        } else if url.host == "profile" || url.path.contains("profile") {
            apply(route: .profile)
        } else if url.host == "responder" || url.path.contains("responder") || url.path.contains("emergency") {
            apply(route: .responder)
        }
    }

    private func persist() async {
        await dependencies.profileStore.saveAppState(
            PatientAppState(
                profile: profile,
                publishedCard: publishedCard,
                responderPortal: responderState
            ).sanitizedForPersistence
        )
        let widgetState = WidgetSharedState(
            isConfigured: profile?.isConfigured ?? false,
            isPublished: publishedCard != nil,
            displayName: profile?.fullName ?? "",
            tokenVersion: publishedCard?.tokenVersion ?? 0,
            lastPublishedAt: publishedCard?.publishedAt
        )
        await dependencies.profileStore.saveWidgetState(widgetState)
    }
}

struct RootView: View {
    @Bindable var appModel: AppModel

    var body: some View {
        Group {
            if !appModel.isLoaded {
                ProgressView(String(localized: "Loading MediCode…"))
                    .task {
                        await appModel.load()
                    }
            } else {
                TabView(selection: $appModel.selectedTab) {
                    Group {
                        if appModel.needsOnboarding {
                            OnboardingFlowView(appModel: appModel)
                        } else {
                            NavigationStack {
                                if let profile = appModel.profile {
                                    ProfileEditorView(profile: profile) { updatedProfile in
                                        await appModel.saveProfile(updatedProfile)
                                    }
                                }
                            }
                        }
                    }
                    .tabItem {
                        Label("Profile", systemImage: "person.text.rectangle")
                    }
                    .tag(AppTab.profile)

                    Group {
                        if appModel.needsOnboarding {
                            NavigationStack {
                                ContentUnavailableView(
                                    "Finish patient setup first",
                                    systemImage: "qrcode.viewfinder",
                                    description: Text("Publish the emergency QR card after the patient profile has been configured.")
                                )
                            }
                        } else {
                            QRCodeCardView(appModel: appModel)
                        }
                    }
                    .tabItem {
                        Label("QR Card", systemImage: "qrcode.viewfinder")
                    }
                    .tag(AppTab.qrCard)

                    ResponderPortalView(appModel: appModel)
                        .tabItem {
                            Label("Responder", systemImage: "cross.case")
                        }
                        .tag(AppTab.responder)
                }
            }
        }
        .alert("MediCode", isPresented: .constant(appModel.lastError != nil), actions: {
            Button("OK") {
                appModel.lastError = nil
            }
        }, message: {
            Text(appModel.lastError ?? "")
        })
    }
}

struct ResponderPortalView: View {
    struct SharePayload: Identifiable {
        let id = UUID()
        let items: [Any]
    }

    struct PendingOnDeviceTranslation {
        let recordID: UUID
        let sourceSummary: EmergencySummary
        let targetLanguageCode: String
        let sourceLanguageCode: String?
    }

    @Bindable var appModel: AppModel
    @Environment(\.locale) private var locale
    @State private var fullName = ""
    @State private var workEmail = ""
    @State private var organizationName = ""
    @State private var licenseRegion = ""
    @State private var registrationCredentialId = ""
    @State private var shareToken = ""
    @State private var selectedRole: ResponderRole = .firstResponder
    @State private var sharePayload: SharePayload?
    @State private var scannerPresented = false
    @State private var presentedRecordID: UUID?
    @State private var pendingOnDeviceTranslation: PendingOnDeviceTranslation?
    @FocusState private var keyboardFocused: Bool

    var body: some View {
        NavigationStack {
            Form {
                if let account = appModel.responderState.account {
                    Section("Registration Status") {
                        LabeledContent("Name", value: account.fullName)
                        LabeledContent("Email", value: account.workEmail)
                        LabeledContent("Organization", value: account.organizationName)
                        LabeledContent("Role", value: roleLabel(account.role))
                        LabeledContent("License Region", value: account.licenseRegion)
                        LabeledContent("Status", value: statusLabel(account.status))
                        if let lastVerifiedAt = account.lastVerifiedAt {
                            LabeledContent("Verified", value: lastVerifiedAt.formatted(date: .abbreviated, time: .shortened))
                        }

                        Button("Refresh Approval Status") {
                            Task {
                                await appModel.refreshResponderStatus(workEmail: account.workEmail, credentialId: registrationCredentialId)
                                await appModel.openPendingResponderTokenIfPossible(languageCode: systemLanguageCode)
                            }
                        }
                    }

                    Section("Scanned Record Access") {
                        if account.canAccessScannedData {
                            TextField("Scanned share token", text: $shareToken, axis: .vertical)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .lineLimit(2...4)
                                .focused($keyboardFocused)
                            LabeledContent("System Language", value: systemLanguageLabel)

                            Button("Scan MediCode QR") {
                                scannerPresented = true
                            }
                            .buttonStyle(.bordered)

                            Button("Open Health Record") {
                                Task {
                                    await openHealthRecord(from: shareToken)
                                }
                            }
                            .disabled(shareToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        } else {
                            Text("Your account is not active yet. Once approved, this pipeline will let you open a scanned QR token, review the emergency summary, and download a copy for handoff.")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Section("Patient Records") {
                        if appModel.responderState.records.isEmpty {
                            Text("Scanned patient records will stay in the responder app here after you open them.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(appModel.responderState.records) { record in
                                Button {
                                    appModel.selectResponderRecord(record.id)
                                    scheduleOnDeviceTranslation(for: record)
                                } label: {
                                    HStack(alignment: .top, spacing: 12) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(record.localizedSummary.fullName)
                                                .foregroundStyle(.primary)
                                            Text(record.lastAccessedAt.formatted(date: .abbreviated, time: .shortened))
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                            Text(
                                                String(
                                                    format: String(localized: "Translated to %@"),
                                                    languageName(for: record.targetLanguageCode)
                                                )
                                            )
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        if appModel.selectedResponderRecord?.id == record.id {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundStyle(.red)
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if let record = appModel.selectedResponderRecord {
                        Section(String(localized: "Viewed Medical Data")) {
                            summaryRow(String(localized: "Patient"), record.localizedSummary.fullName)
                            summaryRow(String(localized: "Blood Type"), record.localizedSummary.bloodType ?? String(localized: "Unknown"))
                            summaryRow(String(localized: "Allergies"), joined(record.localizedSummary.allergies))
                            summaryRow(String(localized: "Conditions"), joined(record.localizedSummary.conditions))
                            summaryRow(String(localized: "Medications"), joined(record.localizedSummary.medications))
                            summaryRow(String(localized: "Emergency Contacts"), joined(record.localizedSummary.emergencyContacts.map { [$0.name, $0.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • ") }))
                            summaryRow(String(localized: "Record Language"), languageName(for: record.targetLanguageCode))
                            if let manualNotes = record.localizedSummary.manualNotes {
                                summaryRow(String(localized: "Manual Notes"), manualNotes)
                            }

                            Button("Download Medical Data PDF") {
                                if let exportURL = responderExportURL(record: record, account: account) {
                                    sharePayload = SharePayload(items: [exportURL])
                                    Task {
                                        await appModel.markResponderDownload()
                                    }
                                }
                            }

                            if let lastDownloadedAt = appModel.responderState.lastDownloadedAt {
                                Text(
                                    String(
                                        format: String(localized: "Last downloaded %@"),
                                        lastDownloadedAt.formatted(date: .abbreviated, time: .shortened)
                                    )
                                )
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } else {
                    Section("Responder Registration") {
                        TextField("Full name", text: $fullName)
                            .focused($keyboardFocused)
                        TextField("Work email", text: $workEmail)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.emailAddress)
                            .focused($keyboardFocused)
                        Picker("Role", selection: $selectedRole) {
                            Text("First Responder").tag(ResponderRole.firstResponder)
                            Text("Triage Nurse").tag(ResponderRole.triageNurse)
                        }
                        TextField("Organization", text: $organizationName)
                            .focused($keyboardFocused)
                        TextField("Credential / badge ID", text: $registrationCredentialId)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($keyboardFocused)
                        TextField("License Region", text: $licenseRegion)
                            .textInputAutocapitalization(.characters)
                            .focused($keyboardFocused)

                        Button("Register for Responder Access") {
                            Task {
                                await appModel.registerResponder(
                                    fullName: fullName,
                                    workEmail: workEmail,
                                    role: selectedRole,
                                    organizationName: organizationName,
                                    credentialId: registrationCredentialId,
                                    licenseRegion: licenseRegion
                                )
                            }
                        }
                        .disabled(!registrationFormIsValid)
                    }

                    Section {
                        Text("This responder pipeline is separate from the patient setup flow. Register here first, then use your approved account to open scanned MediCode records and download the emergency summary for handoff.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Responder")
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        keyboardFocused = false
                    }
                }
            }
            .task(id: appModel.responderState.account?.id) {
                hydrateResponderFields()
                await appModel.openPendingResponderTokenIfPossible(languageCode: systemLanguageCode)
                scheduleOnDeviceTranslationIfNeeded()
            }
            .task(id: locale.identifier) {
                await appModel.syncResponderRecordsToSystemLanguage(languageCode: systemLanguageCode)
                await appModel.openPendingResponderTokenIfPossible(languageCode: systemLanguageCode)
                hydrateResponderFields()
                scheduleOnDeviceTranslationIfNeeded()
            }
            .background(onDeviceTranslationHost)
            .sheet(item: $sharePayload) { payload in
                SharedActivityView(items: payload.items)
            }
            .sheet(isPresented: $scannerPresented) {
                ResponderQRScannerView { scannedValue in
                    handleScannedCode(scannedValue)
                }
            }
            .sheet(item: presentedRecordBinding) { record in
                NavigationStack {
                    ResponderRecordDetailView(record: record, languageName: languageName(for: record.targetLanguageCode))
                }
            }
        }
    }

    private var registrationFormIsValid: Bool {
        !fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !workEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !organizationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !registrationCredentialId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !licenseRegion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func hydrateResponderFields() {
        guard let account = appModel.responderState.account else { return }
        fullName = account.fullName
        workEmail = account.workEmail
        organizationName = account.organizationName
        licenseRegion = account.licenseRegion
        shareToken = appModel.responderState.pendingShareToken ?? appModel.selectedResponderRecord?.shareToken ?? shareToken
    }

    private var systemLanguageCode: String {
        deviceLanguageCode(for: locale)
    }

    private var systemLanguageLabel: String {
        languageName(for: systemLanguageCode)
    }

    @ViewBuilder
    private var onDeviceTranslationHost: some View {
        if #available(iOS 18.0, *), let pendingOnDeviceTranslation {
            OnDeviceTranslationHost(
                job: pendingOnDeviceTranslation,
                onTranslated: { translatedSummary in
                    appModel.applyTranslatedResponderRecord(
                        recordID: pendingOnDeviceTranslation.recordID,
                        localizedSummary: translatedSummary,
                        targetLanguageCode: pendingOnDeviceTranslation.targetLanguageCode
                    )
                    clearPendingOnDeviceTranslation()
                },
                onError: { error in
                    if appModel.lastError == nil {
                        appModel.lastError = error.localizedDescription
                    }
                    clearPendingOnDeviceTranslation()
                }
            )
        } else {
            EmptyView()
        }
    }

    private func roleLabel(_ role: ResponderRole) -> String {
        switch role {
        case .firstResponder:
            return String(localized: "First Responder")
        case .triageNurse:
            return String(localized: "Triage Nurse")
        }
    }

    private func statusLabel(_ status: ResponderStatus) -> String {
        switch status {
        case .pending:
            return String(localized: "Pending Approval")
        case .active:
            return String(localized: "Active")
        case .suspended:
            return String(localized: "Suspended")
        }
    }

    @ViewBuilder
    private func summaryRow(_ label: String, _ value: String) -> some View {
        if !value.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(value)
            }
            .padding(.vertical, 2)
        }
    }

    private func joined(_ values: [String]) -> String {
        values.cleanedList().joined(separator: ", ")
    }

    private func languageName(for code: String) -> String {
        locale.localizedString(forLanguageCode: code) ?? code.uppercased()
    }

    private func handleScannedCode(_ scannedValue: String) {
        if let token = parsedShareToken(from: scannedValue) {
            shareToken = token
            appModel.responderState.pendingShareToken = token
            if appModel.responderState.account?.canAccessScannedData == true {
                Task {
                    await openHealthRecord(from: token)
                }
            }
        } else {
            appModel.lastError = String(localized: "The scanned QR code did not contain a MediCode share token.")
        }
    }

    private func openHealthRecord(from rawValue: String) async {
        guard let token = parsedShareToken(from: rawValue) else {
            appModel.lastError = String(localized: "The scanned QR code did not contain a MediCode share token.")
            return
        }

        shareToken = token
        await appModel.openResponderSummary(shareToken: token, languageCode: systemLanguageCode)
        hydrateResponderFields()
        if let selectedRecord = appModel.selectedResponderRecord {
            scheduleOnDeviceTranslation(for: selectedRecord)
            presentedRecordID = selectedRecord.id
        }
    }

    private func scheduleOnDeviceTranslationIfNeeded() {
        guard let record = appModel.selectedResponderRecord else {
            clearPendingOnDeviceTranslation()
            return
        }
        scheduleOnDeviceTranslation(for: record)
    }

    private func scheduleOnDeviceTranslation(for record: ResponderPatientRecord) {
        guard appModel.usesPreviewBackend else { return }
        guard #available(iOS 18.0, *) else { return }

        let targetLanguageCode = systemLanguageCode
        let sourceLanguageCode = normalizedOrNil(record.sourceSummary.sourceLanguage)

        guard targetLanguageCode != record.targetLanguageCode || record.localizedSummary == record.sourceSummary else {
            return
        }

        pendingOnDeviceTranslation = PendingOnDeviceTranslation(
            recordID: record.id,
            sourceSummary: record.sourceSummary,
            targetLanguageCode: targetLanguageCode,
            sourceLanguageCode: sourceLanguageCode
        )
    }

    private func clearPendingOnDeviceTranslation() {
        pendingOnDeviceTranslation = nil
    }

    private func parsedShareToken(from scannedValue: String) -> String? {
        if let url = URL(string: scannedValue),
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let token = components.queryItems?.first(where: { $0.name == "token" })?.value {
            return normalizedOrNil(token)
        }

        return normalizedOrNil(scannedValue)
    }

    private func responderExportURL(record: ResponderPatientRecord, account: ResponderAccount) -> URL? {
        let safeName = account.fullName
            .lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .replacingOccurrences(of: "/", with: "-")
        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("medicode-summary-\(safeName)-\(Int(Date().timeIntervalSince1970)).pdf")

        do {
            let data = responderPDFData(record: record, account: account)
            try data.write(to: fileURL, options: [.atomic])
            return fileURL
        } catch {
            return nil
        }
    }

    private func responderPDFData(record: ResponderPatientRecord, account: ResponderAccount) -> Data {
        let pageBounds = CGRect(x: 0, y: 0, width: 612, height: 792)
        let renderer = UIGraphicsPDFRenderer(bounds: pageBounds)

        return renderer.pdfData { context in
            context.beginPage()

            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 24, weight: .bold)
            ]
            let headingAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14, weight: .semibold)
            ]
            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .regular)
            ]

            var y: CGFloat = 36
            let left: CGFloat = 36
            let width: CGFloat = pageBounds.width - 72

            func draw(_ text: String, attributes: [NSAttributedString.Key: Any], spacing: CGFloat = 10) {
                let attributedText = NSAttributedString(string: text, attributes: attributes)
                let measured = attributedText.boundingRect(
                    with: CGSize(width: width, height: .greatestFiniteMagnitude),
                    options: [.usesLineFragmentOrigin, .usesFontLeading],
                    context: nil
                )
                attributedText.draw(with: CGRect(x: left, y: y, width: width, height: ceil(measured.height)),
                                    options: [.usesLineFragmentOrigin, .usesFontLeading],
                                    context: nil)
                y += ceil(measured.height) + spacing
            }

            let summary = record.localizedSummary
            draw(String(localized: "MediCode Emergency Summary"), attributes: titleAttributes, spacing: 20)
            draw(String(localized: "Patient"), attributes: headingAttributes, spacing: 4)
            draw(summary.fullName, attributes: bodyAttributes)
            draw(
                String(
                    format: String(localized: "Downloaded by %@ (%@)"),
                    account.fullName,
                    account.organizationName
                ),
                attributes: bodyAttributes
            )
            draw(
                String(
                    format: String(localized: "Generated %@"),
                    Date.now.formatted(date: .abbreviated, time: .shortened)
                ),
                attributes: bodyAttributes,
                spacing: 18
            )

            draw(String(localized: "Medical Data"), attributes: headingAttributes, spacing: 6)
            draw(
                String(
                    format: String(localized: "Blood Type: %@"),
                    summary.bloodType ?? String(localized: "Unknown")
                ),
                attributes: bodyAttributes
            )
            draw(
                String(
                    format: String(localized: "Allergies: %@"),
                    joined(summary.allergies).ifEmpty(String(localized: "None reported"))
                ),
                attributes: bodyAttributes
            )
            draw(
                String(
                    format: String(localized: "Conditions: %@"),
                    joined(summary.conditions).ifEmpty(String(localized: "None reported"))
                ),
                attributes: bodyAttributes
            )
            draw(
                String(
                    format: String(localized: "Medications: %@"),
                    joined(summary.medications).ifEmpty(String(localized: "None reported"))
                ),
                attributes: bodyAttributes
            )
            draw(
                String(
                    format: String(localized: "Emergency Contacts: %@"),
                    joined(summary.emergencyContacts.map { [$0.name, $0.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • ") })
                        .ifEmpty(String(localized: "None reported"))
                ),
                attributes: bodyAttributes
            )

            if let manualNotes = normalizedOrNil(summary.manualNotes ?? "") {
                draw(String(localized: "Manual Notes"), attributes: headingAttributes, spacing: 4)
                draw(manualNotes, attributes: bodyAttributes)
            }

            draw(
                String(
                    format: String(localized: "Responder App Language: %@"),
                    languageName(for: record.targetLanguageCode)
                ),
                attributes: bodyAttributes
            )
            draw(
                String(
                    format: String(localized: "Session ID: %@"),
                    record.sessionId.uuidString
                ),
                attributes: bodyAttributes
            )
        }
    }

    private var presentedRecordBinding: Binding<ResponderPatientRecord?> {
        Binding<ResponderPatientRecord?>(
            get: {
                guard let presentedRecordID else { return nil }
                return appModel.responderState.records.first(where: { $0.id == presentedRecordID })
            },
            set: { newValue in
                presentedRecordID = newValue?.id
            }
        )
    }
}

#Preview {
    RootView(appModel: AppModel(dependencies: .preview()))
}

private extension String {
    func ifEmpty(_ fallback: String) -> String {
        isEmpty ? fallback : self
    }
}

private struct ResponderRecordDetailView: View {
    let record: ResponderPatientRecord
    let languageName: String

    var body: some View {
        List {
            Section("Patient") {
                detailRow("Name", record.localizedSummary.fullName)
                detailRow("Blood Type", record.localizedSummary.bloodType ?? "Unknown")
                detailRow("Record Language", languageName)
            }

            Section("Medical Data") {
                detailRow("Allergies", record.localizedSummary.allergies.cleanedList().joined(separator: ", ").ifEmpty(String(localized: "None reported")))
                detailRow("Conditions", record.localizedSummary.conditions.cleanedList().joined(separator: ", ").ifEmpty(String(localized: "None reported")))
                detailRow("Medications", record.localizedSummary.medications.cleanedList().joined(separator: ", ").ifEmpty(String(localized: "None reported")))
                detailRow(
                    "Emergency Contacts",
                    record.localizedSummary.emergencyContacts
                        .map { [$0.name, $0.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • ") }
                        .joined(separator: ", ")
                        .ifEmpty(String(localized: "None reported"))
                )
                if let manualNotes = normalizedOrNil(record.localizedSummary.manualNotes ?? "") {
                    detailRow("Manual Notes", manualNotes)
                }
            }
        }
        .navigationTitle("Health Record")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func detailRow(_ label: String, _ value: String) -> some View {
        if !value.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(value)
            }
            .padding(.vertical, 2)
        }
    }
}

@available(iOS 18.0, *)
private struct OnDeviceTranslationHost: View {
    let job: ResponderPortalView.PendingOnDeviceTranslation
    let onTranslated: (EmergencySummary) -> Void
    let onError: (Error) -> Void

    var body: some View {
        Color.clear
            .translationTask(job.translationConfiguration) { session in
                do {
                    let translatedSummary = try await translatedSummary(from: job.sourceSummary, using: session)
                    await MainActor.run {
                        onTranslated(translatedSummary)
                    }
                } catch {
                    await MainActor.run {
                        onError(error)
                    }
                }
            }
    }

    private func translatedSummary(
        from summary: EmergencySummary,
        using session: TranslationSession
    ) async throws -> EmergencySummary {
        let requests = translationRequests(for: summary)
        guard !requests.isEmpty else { return summary }

        let responses = try await session.translations(from: requests)
        let translatedValues = Dictionary(
            uniqueKeysWithValues: responses.compactMap { response in
                response.clientIdentifier.map { ($0, response.targetText) }
            }
        )

        return EmergencySummary(
            fullName: summary.fullName,
            bloodType: summary.bloodType,
            allergies: summary.allergies.enumerated().map { translatedValues["allergy-\($0.offset)"] ?? $0.element },
            conditions: summary.conditions.enumerated().map { translatedValues["condition-\($0.offset)"] ?? $0.element },
            medications: summary.medications.enumerated().map { translatedValues["medication-\($0.offset)"] ?? $0.element },
            emergencyContacts: summary.emergencyContacts.enumerated().map { index, contact in
                var translatedContact = contact
                translatedContact.relationship = translatedValues["contact-relationship-\(index)"] ?? contact.relationship
                return translatedContact
            },
            manualNotes: summary.manualNotes.map { translatedValues["manual-notes"] ?? $0 },
            sourceLanguage: summary.sourceLanguage
        )
    }

    private func translationRequests(for summary: EmergencySummary) -> [TranslationSession.Request] {
        var requests: [TranslationSession.Request] = []

        for (index, item) in summary.allergies.enumerated() {
            if let text = normalizedOrNil(item) {
                requests.append(.init(sourceText: text, clientIdentifier: "allergy-\(index)"))
            }
        }

        for (index, item) in summary.conditions.enumerated() {
            if let text = normalizedOrNil(item) {
                requests.append(.init(sourceText: text, clientIdentifier: "condition-\(index)"))
            }
        }

        for (index, item) in summary.medications.enumerated() {
            if let text = normalizedOrNil(item) {
                requests.append(.init(sourceText: text, clientIdentifier: "medication-\(index)"))
            }
        }

        for (index, contact) in summary.emergencyContacts.enumerated() {
            if let relationship = normalizedOrNil(contact.relationship) {
                requests.append(.init(sourceText: relationship, clientIdentifier: "contact-relationship-\(index)"))
            }
        }

        if let manualNotes = normalizedOrNil(summary.manualNotes ?? "") {
            requests.append(.init(sourceText: manualNotes, clientIdentifier: "manual-notes"))
        }

        return requests
    }
}

@available(iOS 18.0, *)
private extension ResponderPortalView.PendingOnDeviceTranslation {
    var translationConfiguration: TranslationSession.Configuration {
        TranslationSession.Configuration(
            source: sourceLanguageCode.map(Locale.Language.init(identifier:)),
            target: Locale.Language(identifier: targetLanguageCode)
        )
    }
}
