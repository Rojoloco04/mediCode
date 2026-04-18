import SwiftUI

struct QRCodeCardView: View {
    @Bindable var appModel: AppModel
    @State private var exportImage: UIImage?
    @State private var shareSheetPresented = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let profile = appModel.profile {
                        ShareCardRenderableView(
                            profile: profile,
                            publishedCard: appModel.publishedCard,
                            qrImage: appModel.publishedCard.map { appModel.dependencies.qrCardService.qrImage(for: $0.universalLink) }
                        )
                        .frame(height: 520)
                        .clipShape(RoundedRectangle(cornerRadius: 32))

                        VStack(alignment: .leading, spacing: 12) {
                            Text("Security")
                                .font(.headline)
                            Text("The QR uses a signed share token instead of embedding raw health data. Responders still need a verified MediCode account and their credential ID to unlock the summary.")
                                .foregroundStyle(.secondary)
                        }

                        if let publishedCard = appModel.publishedCard {
                            LabeledContent("Universal link", value: publishedCard.universalLink.absoluteString)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            LabeledContent("Published", value: publishedCard.publishedAt.formatted(date: .abbreviated, time: .shortened))
                        }

                        HStack(spacing: 12) {
                            Button("Publish QR Card") {
                                Task {
                                    await appModel.publishEmergencyCard()
                                }
                            }
                            .buttonStyle(.borderedProminent)

                            Button("Export / Share") {
                                if let profile = appModel.profile {
                                    exportImage = appModel.dependencies.qrCardService.exportCardImage(
                                        profile: profile,
                                        publishedCard: appModel.publishedCard
                                    )
                                    shareSheetPresented = exportImage != nil
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(appModel.publishedCard == nil)
                        }
                    } else {
                        ContentUnavailableView(
                            "Finish onboarding first",
                            systemImage: "heart.text.square",
                            description: Text("MediCode needs a saved patient profile before it can publish a QR card.")
                        )
                    }
                }
                .padding(20)
            }
            .navigationTitle("QR Card")
            .sheet(isPresented: $shareSheetPresented) {
                if let exportImage {
                    ActivityViewController(items: [exportImage])
                }
            }
        }
    }
}

private struct ActivityViewController: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
