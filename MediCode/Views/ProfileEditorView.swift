import SwiftUI

struct ProfileEditorView: View {
    @State private var draft: PatientEmergencyProfile
    let onSave: (PatientEmergencyProfile) async -> Void

    init(profile: PatientEmergencyProfile, onSave: @escaping (PatientEmergencyProfile) async -> Void) {
        _draft = State(initialValue: profile)
        self.onSave = onSave
    }

    var body: some View {
        Form {
            Section("Identity") {
                TextField("Full name", text: $draft.fullName)
                TextField("Source language", text: $draft.sourceLanguage)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Blood type", text: $draft.bloodType)
            }

            Section("Emergency Summary") {
                listEditor(title: "Allergies", list: binding(for: \.allergies), prompt: "Peanuts, Penicillin")
                listEditor(title: "Conditions", list: binding(for: \.conditions), prompt: "Asthma, Diabetes")
                listEditor(title: "Medications", list: binding(for: \.medications), prompt: "Insulin, Albuterol")
                TextField("Manual notes", text: $draft.manualNotes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section("Emergency Contact") {
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

                TextField("Contact name", text: contact.name)
                TextField("Relationship", text: contact.relationship)
                TextField("Phone number", text: contact.phoneNumber)
                    .keyboardType(.phonePad)
            }

            Section {
                Button("Save Profile") {
                    Task {
                        draft.updatedAt = .now
                        await onSave(draft)
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func binding(for keyPath: WritableKeyPath<PatientEmergencyProfile, [String]>) -> Binding<String> {
        Binding(
            get: { draft[keyPath: keyPath].joined(separator: ", ") },
            set: { draft[keyPath: keyPath] = $0.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }.cleanedList() }
        )
    }

    @ViewBuilder
    private func listEditor(title: String, list: Binding<String>, prompt: String) -> some View {
        TextField(title, text: list, axis: .vertical)
            .lineLimit(2...4)
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
