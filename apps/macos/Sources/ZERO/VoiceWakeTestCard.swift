import SwiftUI

struct VoiceWakeTestCard: View {
    @Binding var testState: VoiceWakeTestState
    @Binding var isTesting: Bool
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Testar Ativação por Voz")
                    .font(.callout.weight(.semibold))
                Spacer()
                Button(action: self.onToggle) {
                    Label(
                        self.isTesting ? "Parar" : "Iniciar teste",
                        systemImage: self.isTesting ? "stop.circle.fill" : "play.circle")
                }
                .buttonStyle(.borderedProminent)
                .tint(self.isTesting ? .red : .accentColor)
            }

            HStack(spacing: 8) {
                self.statusIcon
                VStack(alignment: .leading, spacing: 4) {
                    Text(self.statusText)
                        .font(.subheadline)
                        .frame(maxHeight: 22, alignment: .center)
                    if case let .detected(text) = testState {
                        Text("Ouvido: \(text)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
                Spacer()
            }
            .padding(10)
            .background(.quaternary.opacity(0.2))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .frame(minHeight: 54)
        }
        .padding(.vertical, 2)
    }

    private var statusIcon: some View {
        switch self.testState {
        case .idle:
            AnyView(Image(systemName: "waveform").foregroundStyle(.secondary))

        case .requesting:
            AnyView(ProgressView().controlSize(.small))

        case .listening, .hearing:
            AnyView(
                Image(systemName: "ear.and.waveform")
                    .symbolEffect(.pulse)
                    .foregroundStyle(Color.accentColor))

        case .finalizing:
            AnyView(ProgressView().controlSize(.small))

        case .detected:
            AnyView(Image(systemName: "checkmark.circle.fill").foregroundStyle(.green))

        case .failed:
            AnyView(Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.yellow))
        }
    }

    private var statusText: String {
        switch self.testState {
        case .idle:
            "Pressione iniciar, diga uma palavra de ativação e aguarde a detecção."

        case .requesting:
            "Solicitando permissão de microfone e fala…"

        case .listening:
            "Ouvindo… diga sua palavra de ativação."

        case let .hearing(text):
            "Ouvido: \(text)"

        case .finalizing:
            "Finalizando…"

        case .detected:
            "Ativação por voz detectada!"

        case let .failed(reason):
            reason
        }
    }
}
