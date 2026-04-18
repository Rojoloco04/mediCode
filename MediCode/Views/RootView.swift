import SwiftUI

enum AppTab: Hashable {
    case profile
    case qrCard
}

@MainActor
@Observable
final class AppModel {
    let dependencies: AppDependencies
    var profile: PatientEmergencyProfile?
    var publishedCard: PublishedEmergencyCard?
    var selectedTab: AppTab = .profile
    var isLoaded = false
    var lastError: String?

    init(dependencies: AppDependencies) {
        self.dependencies = dependencies
    }

    var needsOnboarding: Bool {
        !(profile?.isConfigured ?? false)
    }

    func load() async {
        let state = await dependencies.profileStore.loadAppState()
        profile = state.profile
        publishedCard = state.publishedCard
        if let pendingRoute = await dependencies.profileStore.consumePendingRoute() {
            apply(route: pendingRoute)
        }
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
                    sourceLanguage: profile.sourceLanguage
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

    func apply(route: AppRoute) {
        switch route {
        case .profile:
            selectedTab = .profile
        case .qrCard:
            selectedTab = .qrCard
        }
    }

    func handle(url: URL) {
        if url.host == "qr-card" || url.path.contains("qr-card") {
            apply(route: .qrCard)
        } else if url.host == "profile" || url.path.contains("profile") {
            apply(route: .profile)
        }
    }

    private func persist() async {
        await dependencies.profileStore.saveAppState(PatientAppState(profile: profile, publishedCard: publishedCard))
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
                ProgressView("Loading MediCode…")
                    .task {
                        await appModel.load()
                    }
            } else if appModel.needsOnboarding {
                OnboardingFlowView(appModel: appModel)
            } else {
                TabView(selection: $appModel.selectedTab) {
                    NavigationStack {
                        if let profile = appModel.profile {
                            ProfileEditorView(profile: profile) { updatedProfile in
                                await appModel.saveProfile(updatedProfile)
                            }
                        }
                    }
                    .tabItem {
                        Label("Profile", systemImage: "person.text.rectangle")
                    }
                    .tag(AppTab.profile)

                    QRCodeCardView(appModel: appModel)
                        .tabItem {
                            Label("QR Card", systemImage: "qrcode.viewfinder")
                        }
                        .tag(AppTab.qrCard)
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

#Preview {
    RootView(appModel: AppModel(dependencies: .preview()))
}
