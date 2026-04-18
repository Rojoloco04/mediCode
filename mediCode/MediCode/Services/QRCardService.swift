import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

struct QRCardService {
    private let context = CIContext()
    private let filter = CIFilter.qrCodeGenerator()

    func qrImage(for url: URL) -> UIImage {
        filter.setValue(Data(url.absoluteString.utf8), forKey: "inputMessage")
        filter.correctionLevel = "Q"

        guard let outputImage = filter.outputImage else {
            return UIImage()
        }

        let transformed = outputImage.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        guard let cgImage = context.createCGImage(transformed, from: transformed.extent) else {
            return UIImage()
        }
        return UIImage(cgImage: cgImage)
    }

    @MainActor
    func exportCardImage(
        profile: PatientEmergencyProfile,
        publishedCard: PublishedEmergencyCard?
    ) -> UIImage? {
        let view = ShareCardRenderableView(
            profile: profile,
            publishedCard: publishedCard,
            qrImage: publishedCard.map { qrImage(for: $0.universalLink) }
        )
        .frame(width: 390, height: 844)

        let renderer = ImageRenderer(content: view)
        renderer.scale = 3
        return renderer.uiImage
    }

    @MainActor
    func exportLockScreenImage(
        profile: PatientEmergencyProfile,
        publishedCard: PublishedEmergencyCard?
    ) -> UIImage? {
        let view = LockScreenQRRenderableView(
            profile: profile,
            publishedCard: publishedCard,
            qrImage: publishedCard.map { qrImage(for: $0.universalLink) }
        )
        .frame(width: 390, height: 844)

        let renderer = ImageRenderer(content: view)
        renderer.scale = 3
        return renderer.uiImage
    }
}

struct ShareCardRenderableView: View {
    let profile: PatientEmergencyProfile
    let publishedCard: PublishedEmergencyCard?
    let qrImage: UIImage?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.06, green: 0.09, blue: 0.17), Color(red: 0.19, green: 0.04, blue: 0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("mediCode")
                        .font(.caption)
                        .fontWeight(.bold)
                        .textCase(.uppercase)
                        .tracking(1.4)
                        .foregroundStyle(.white.opacity(0.75))

                    Text(profile.fullName.isEmpty ? String(localized: "Medical Emergency Profile") : profile.fullName)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)

                    if let bloodType = normalizedOrNil(profile.bloodType) {
                        pill(
                            text: String(format: String(localized: "Blood Type Value %@"), bloodType),
                            color: Color.red.opacity(0.18)
                        )
                    }
                }

                summarySection(title: String(localized: "Allergies"), values: profile.allergies)
                summarySection(title: String(localized: "Conditions"), values: profile.conditions)
                summarySection(title: String(localized: "Medications"), values: profile.medications)

                Spacer()

                HStack(alignment: .bottom) {
                    if let qrImage {
                        VStack(alignment: .leading, spacing: 8) {
                            Image(uiImage: qrImage)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 130, height: 130)
                                .padding(12)
                                .background(.white, in: RoundedRectangle(cornerRadius: 20))

                            Text("Scan for secure emergency access")
                                .font(.footnote)
                                .foregroundStyle(.white.opacity(0.72))
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 8) {
                        ForEach(profile.emergencyContacts.prefix(2)) { contact in
                            if !contact.name.isEmpty || !contact.phoneNumber.isEmpty {
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(contact.name)
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                    Text([contact.relationship, contact.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • "))
                                        .font(.footnote)
                                        .foregroundStyle(.white.opacity(0.72))
                                }
                            }
                        }

                        if let publishedCard {
                            Text(String(format: String(localized: "Token v%d"), publishedCard.tokenVersion))
                                .font(.caption2)
                                .foregroundStyle(.white.opacity(0.6))
                        }
                    }
                }
            }
            .padding(28)
        }
    }

    @ViewBuilder
    private func summarySection(title: String, values: [String]) -> some View {
        let cleaned = values.cleanedList()
        if !cleaned.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.8))

                Text(cleaned.joined(separator: "\n"))
                    .font(.body)
                    .foregroundStyle(.white)
            }
        }
    }

    private func pill(text: String, color: Color) -> some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(color, in: Capsule())
    }
}

struct LockScreenQRRenderableView: View {
    let profile: PatientEmergencyProfile
    let publishedCard: PublishedEmergencyCard?
    let qrImage: UIImage?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.03, green: 0.03, blue: 0.06),
                    Color(red: 0.08, green: 0.11, blue: 0.18)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack(spacing: 28) {
                Spacer(minLength: 48)

                VStack(spacing: 10) {
                    Text("mediCode Emergency Access")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.92))
                        .multilineTextAlignment(.center)

                    Text("Scan Without Unlocking")
                        .font(.system(size: 32, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)

                    Text(profile.fullName.isEmpty ? String(localized: "Medical profile available") : profile.fullName)
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.85))
                }
                .padding(.horizontal, 28)

                if let qrImage {
                    VStack(spacing: 14) {
                        Image(uiImage: qrImage)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 220, height: 220)
                            .padding(20)
                            .background(.white, in: RoundedRectangle(cornerRadius: 32, style: .continuous))
                            .shadow(color: .black.opacity(0.22), radius: 18, y: 10)

                        Text("First responders: scan for translated triage details")
                            .font(.system(size: 16, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.82))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }
                }

                VStack(spacing: 12) {
                    if let bloodType = normalizedOrNil(profile.bloodType) {
                        infoPill(String(format: String(localized: "Blood Type Value %@"), bloodType))
                    }

                    let allergies = profile.allergies.cleanedList()
                    if let firstAllergy = allergies.first {
                        infoPill(String(format: String(localized: "Allergy: %@"), firstAllergy))
                    }

                    if let contact = profile.emergencyContacts.first(where: { !$0.name.isEmpty || !$0.phoneNumber.isEmpty }) {
                        let contactText = [contact.name, contact.phoneNumber].filter { !$0.isEmpty }.joined(separator: " • ")
                        if !contactText.isEmpty {
                            infoPill(String(format: String(localized: "Emergency Contact Details %@"), contactText))
                        }
                    }
                }
                .padding(.horizontal, 24)

                Spacer()

                VStack(spacing: 8) {
                    Text("Set this image as your Lock Screen wallpaper.")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)

                    Text("Keep the QR uncovered so it can be scanned while the phone stays locked.")
                        .font(.system(size: 14, weight: .regular, design: .rounded))
                        .foregroundStyle(.white.opacity(0.72))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 36)

                    if let publishedCard {
                        Text(String(format: String(localized: "Token v%d"), publishedCard.tokenVersion))
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.55))
                    }
                }
                .padding(.bottom, 42)
            }
        }
    }

    private func infoPill(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
