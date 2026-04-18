import SwiftUI

@main
struct MediCodeApp: App {
    @State private var appModel = AppModel(dependencies: .live())

    var body: some Scene {
        WindowGroup {
            RootView(appModel: appModel)
                .onOpenURL { url in
                    appModel.handle(url: url)
                }
                .task {
                    if let route = await appModel.dependencies.profileStore.consumePendingRoute() {
                        appModel.apply(route: route)
                    }
                }
        }
    }
}
