import SwiftUI

struct ProfileEditorView: View {
    enum LayoutStyle {
        case form
        case embedded
    }

    let profile: PatientEmergencyProfile
    let layoutStyle: LayoutStyle
    @State private var draft: PatientEmergencyProfile
    @State private var isSaving = false
    @FocusState private var keyboardFocused: Bool
    let onSave: (PatientEmergencyProfile) async -> Void

    init(
        profile: PatientEmergencyProfile,
        layoutStyle: LayoutStyle = .form,
        onSave: @escaping (PatientEmergencyProfile) async -> Void
    ) {
        self.profile = profile
        self.layoutStyle = layoutStyle
        _draft = State(initialValue: profile)
        self.onSave = onSave
    }

    var body: some View {
        Group {
            switch layoutStyle {
            case .form:
                Form {
                    editorContent
                }
            case .embedded:
                VStack(alignment: .leading, spacing: 16) {
                    editorContent
                }
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    keyboardFocused = false
                }
            }
        }
        .onChange(of: profile) { _, newProfile in
            draft = newProfile
        }
    }

    @ViewBuilder
    private var editorContent: some View {
        identitySection
        emergencySummarySection
        emergencyContactSection
        saveSection
    }

    @ViewBuilder
    private var identitySection: some View {
        sectionContainer("Identity") {
            TextField("Full name", text: $draft.fullName)
                .focused($keyboardFocused)
            TextField("Source language", text: $draft.sourceLanguage)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($keyboardFocused)
            TextField("Blood Type", text: $draft.bloodType)
                .focused($keyboardFocused)
        }
    }

    @ViewBuilder
    private var emergencySummarySection: some View {
        sectionContainer("Emergency Summary") {
            listEditor(title: "Allergies", list: binding(for: \.allergies), prompt: "Peanuts, Penicillin")
            listEditor(title: "Conditions", list: binding(for: \.conditions), prompt: "Asthma, Diabetes")
            listEditor(title: "Medications", list: binding(for: \.medications), prompt: "Insulin, Albuterol")
            TextField("Manual Notes", text: $draft.manualNotes, axis: .vertical)
                .lineLimit(3...6)
                .focused($keyboardFocused)
        }
    }

    @ViewBuilder
    private var emergencyContactSection: some View {
        let contact = Binding(
            get: { draft.emergencyContacts.first ?? EmergencyContact() },
            set: { newContact in
                if draft.emergencyContacts.isEmpty {
                    draft.emergencyContacts = [newContact]
                } else {
                    draft.emergencyContacts[0] = newContact
                }
            }
        )

        sectionContainer("Emergency Contact") {
            TextField("Contact name", text: contact.name)
                .focused($keyboardFocused)
            TextField("Relationship", text: contact.relationship)
                .focused($keyboardFocused)
            TextField("Phone number", text: contact.phoneNumber)
                .keyboardType(.phonePad)
                .focused($keyboardFocused)
        }
    }

    @ViewBuilder
    private var saveSection: some View {
        sectionContainer(nil) {
            Button("Save Profile") {
                Task {
                    isSaving = true
                    draft.updatedAt = .now
                    await onSave(draft)
                    try? await Task.sleep(for: .milliseconds(500))
                    isSaving = false
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(isSaving ? .green : .red)
        }
    }

    @ViewBuilder
    private func sectionContainer<Content: View>(_ title: String?, @ViewBuilder content: () -> Content) -> some View {
        switch layoutStyle {
        case .form:
            if let title {
                Section(title) {
                    content()
                }
            } else {
                Section {
                    content()
                }
            }
        case .embedded:
            VStack(alignment: .leading, spacing: 12) {
                if let title {
                    Text(title)
                        .font(.headline)
                }
                VStack(alignment: .leading, spacing: 12) {
                    content()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20))
        }
    }

    private func binding(for keyPath: WritableKeyPath<PatientEmergencyProfile, [String]>) -> Binding<String> {
        Binding(
            get: { draft[keyPath: keyPath].joined(separator: ", ") },
            set: { draft[keyPath: keyPath] = $0.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }.cleanedList() }
        )
    }

    @ViewBuilder
    private func listEditor(title: LocalizedStringKey, list: Binding<String>, prompt: LocalizedStringKey) -> some View {
        TextField(title, text: list, axis: .vertical)
            .lineLimit(2...4)
            .focused($keyboardFocused)
            .overlay(alignment: .topLeading) {
                if list.wrappedValue.isEmpty {
                    Text(prompt)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                        .padding(.leading, 4)
                        .allowsHitTesting(false)
                }
            }
    }
}

#Preview {
    NavigationStack {
        ProfileEditorView(profile: .empty()) { _ in }
    }
}
