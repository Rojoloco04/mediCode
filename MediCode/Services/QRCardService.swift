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
                    Text("MediCode")
                        .font(.caption)
                        .fontWeight(.bold)
                        .textCase(.uppercase)
                        .tracking(1.4)
                        .foregroundStyle(.white.opacity(0.75))

                    Text(profile.fullName.isEmpty ? "Medical Emergency Profile" : profile.fullName)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)

                    if let bloodType = normalizedOrNil(profile.bloodType) {
                        pill(text: "Blood Type \(bloodType)", color: Color.red.opacity(0.18))
                    }
                }

                summarySection(title: "Allergies", values: profile.allergies)
                summarySection(title: "Conditions", values: profile.conditions)
                summarySection(title: "Medications", values: profile.medications)

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
                            Text("Token v\(publishedCard.tokenVersion)")
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
