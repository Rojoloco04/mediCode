import AVFoundation
import SwiftUI

private struct QRScannerFailure: LocalizedError {
    let errorDescription: String?
}

struct ResponderQRScannerView: View {
    let onCodeScanned: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var scanError: String?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                QRScannerRepresentable { result in
                    switch result {
                    case .success(let code):
                        onCodeScanned(code)
                        dismiss()
                    case .failure(let error):
                        scanError = error.localizedDescription
                    }
                }
                .ignoresSafeArea()

                VStack(alignment: .leading, spacing: 8) {
                    Text("Scan mediCode QR")
                        .font(.headline)
                    Text("Point the camera at a MediCode QR code to open the patient record in the responder app.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .padding()
            }
            .navigationTitle("Scan QR")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .alert("Scanner Unavailable", isPresented: Binding(get: {
                scanError != nil
            }, set: { newValue in
                if !newValue {
                    scanError = nil
                }
            })) {
                Button("OK") {
                    scanError = nil
                }
            } message: {
                Text(scanError ?? "")
            }
        }
    }
}

private struct QRScannerRepresentable: UIViewControllerRepresentable {
    let onResult: (Result<String, QRScannerFailure>) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onResult: onResult)
    }

    func makeUIViewController(context: Context) -> ScannerViewController {
        let controller = ScannerViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}

    final class Coordinator: NSObject, ScannerViewControllerDelegate {
        private let onResult: (Result<String, QRScannerFailure>) -> Void

        init(onResult: @escaping (Result<String, QRScannerFailure>) -> Void) {
            self.onResult = onResult
        }

        func scannerViewController(_ controller: ScannerViewController, didScan code: String) {
            onResult(.success(code))
        }

        func scannerViewController(_ controller: ScannerViewController, didFail message: String) {
            onResult(.failure(QRScannerFailure(errorDescription: message)))
        }
    }
}

private protocol ScannerViewControllerDelegate: AnyObject {
    func scannerViewController(_ controller: ScannerViewController, didScan code: String)
    func scannerViewController(_ controller: ScannerViewController, didFail message: String)
}

private final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    weak var delegate: ScannerViewControllerDelegate?
    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var hasScanned = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureScanner()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if !session.isRunning {
            session.startRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning {
            session.stopRunning()
        }
    }

    private func configureScanner() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    guard let self else { return }
                    granted ? self.setupSession() : self.delegate?.scannerViewController(self, didFail: String(localized: "Camera access is required to scan MediCode QR codes."))
                }
            }
        default:
            delegate?.scannerViewController(self, didFail: String(localized: "Camera access is turned off for MediCode. Enable it in Settings to scan QR codes."))
        }
    }

    private func setupSession() {
        guard previewLayer == nil else { return }
        guard let captureDevice = AVCaptureDevice.default(for: .video) else {
            delegate?.scannerViewController(self, didFail: String(localized: "This device does not have a camera available for QR scanning."))
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: captureDevice)
            if session.canAddInput(input) {
                session.addInput(input)
            }

            let output = AVCaptureMetadataOutput()
            if session.canAddOutput(output) {
                session.addOutput(output)
                output.setMetadataObjectsDelegate(self, queue: .main)
                output.metadataObjectTypes = [.qr]
            }

            let previewLayer = AVCaptureVideoPreviewLayer(session: session)
            previewLayer.videoGravity = .resizeAspectFill
            previewLayer.frame = view.bounds
            view.layer.insertSublayer(previewLayer, at: 0)
            self.previewLayer = previewLayer
            session.startRunning()
        } catch {
            delegate?.scannerViewController(self, didFail: String(localized: "Unable to start the camera scanner."))
        }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !hasScanned,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = object.stringValue else {
            return
        }

        hasScanned = true
        session.stopRunning()
        delegate?.scannerViewController(self, didScan: value)
    }
}
