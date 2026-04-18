import AppIntents

enum MediCodeQuickAction: String, CaseIterable, AppEnum {
    case showQRCode
    case editProfile

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Quick Action"
    static var caseDisplayRepresentations: [MediCodeQuickAction: DisplayRepresentation] = [
        .showQRCode: "Open QR Card",
        .editProfile: "Edit Profile"
    ]

    var route: AppRoute {
        switch self {
        case .showQRCode: .qrCard
        case .editProfile: .profile
        }
    }
}
