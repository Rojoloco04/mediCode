import SwiftUI

struct QRCodeCardView: View {
    struct SharePayload: Identifiable {
        let id = UUID()
        let items: [Any]
    }

    enum ExportMode {
        case genericCard
        case lockScreen
    }

    @Bindable var appModel: AppModel
    @State private var sharePayload: SharePayload?
    @State private var lastExportMode: ExportMode = .genericCard

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

                        VStack(alignment: .leading, spacing: 12) {
                            Text("Scan Without Unlocking")
                                .font(.headline)
                            Text("Use the lock-screen export below to create a high-contrast wallpaper image. After you save it, set it as your Lock Screen wallpaper so the QR stays scannable even while the iPhone is locked.")
                                .foregroundStyle(.secondary)

                            LockScreenQRRenderableView(
                                profile: profile,
                                publishedCard: appModel.publishedCard,
                                qrImage: appModel.publishedCard.map { appModel.dependencies.qrCardService.qrImage(for: $0.universalLink) }
                            )
                            .frame(height: 380)
                            .clipShape(RoundedRectangle(cornerRadius: 32))
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

                            Button("Share QR Card") {
                                export(mode: .genericCard)
                            }
                            .buttonStyle(.bordered)
                            .disabled(appModel.publishedCard == nil)
                        }

                        Button("Save Lock Screen QR") {
                            export(mode: .lockScreen)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                        .disabled(appModel.publishedCard == nil)

                        if appModel.publishedCard != nil {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("After exporting")
                                    .font(.headline)
                                Text("Open the share sheet, choose Save Image, then set the image as your Lock Screen wallpaper in Photos so responders can scan the code without unlocking your phone.")
                                    .foregroundStyle(.secondary)
                            }
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
            .sheet(item: $sharePayload) { payload in
                SharedActivityView(items: payload.items)
            }
        }
    }

    private var activityText: String {
        switch lastExportMode {
        case .genericCard:
            return String(localized: "MediCode emergency QR card")
        case .lockScreen:
            return String(localized: "MediCode lock-screen emergency QR. Save this image and set it as the Lock Screen wallpaper so it can be scanned while the iPhone stays locked.")
        }
    }

    private func export(mode: ExportMode) {
        guard let profile = appModel.profile else { return }

        lastExportMode = mode
        switch mode {
        case .genericCard:
            if let exportImage = appModel.dependencies.qrCardService.exportCardImage(
                profile: profile,
                publishedCard: appModel.publishedCard
            ) {
                sharePayload = SharePayload(items: [activityText, exportImage])
            }
        case .lockScreen:
            if let exportImage = appModel.dependencies.qrCardService.exportLockScreenImage(
                profile: profile,
                publishedCard: appModel.publishedCard
            ), let exportURL = writeExportImage(exportImage, named: "medicode-lock-screen-qr.png") {
                sharePayload = SharePayload(items: [exportURL])
            }
        }
    }

    private func writeExportImage(_ image: UIImage, named fileName: String) -> URL? {
        guard let imageData = image.pngData() else { return nil }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathComponent(fileName)

        do {
            try FileManager.default.createDirectory(
                at: url.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try imageData.write(to: url, options: [.atomic])
            return url
        } catch {
            return nil
        }
    }
}

struct SharedActivityView: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
