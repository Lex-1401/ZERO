import ZeroProtocol
import Observation
import SwiftUI

extension OnboardingView {
    func wizardPage() -> some View {
        self.onboardingPage {
            VStack(spacing: 16) {
                Text("Assistente de Configuração")
                    .font(.largeTitle.weight(.semibold))
                Text("Siga a configuração guiada do Gateway. Isso mantém o onboarding em sincronia com a CLI.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 520)

                self.onboardingCard(spacing: 14, padding: 16) {
                    OnboardingWizardCardContent(
                        wizard: self.onboardingWizard,
                        mode: self.state.connectionMode,
                        workspacePath: self.workspacePath)
                }
            }
            .task {
                await self.onboardingWizard.startIfNeeded(
                    mode: self.state.connectionMode,
                    workspace: self.workspacePath.isEmpty ? nil : self.workspacePath)
            }
        }
    }
}

private struct OnboardingWizardCardContent: View {
    @Bindable var wizard: OnboardingWizardModel
    let mode: AppState.ConnectionMode
    let workspacePath: String

    private enum CardState {
        case error(String)
        case starting
        case step(WizardStep)
        case complete
        case waiting
    }

    private var state: CardState {
        if let error = wizard.errorMessage { return .error(error) }
        if self.wizard.isStarting { return .starting }
        if let step = wizard.currentStep { return .step(step) }
        if self.wizard.isComplete { return .complete }
        return .waiting
    }

    var body: some View {
        switch self.state {
        case let .error(error):
            Text("Erro no Assistente")
                .font(.headline)
            Text(error)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Button("Tentar novamente") {
                self.wizard.reset()
                Task {
                    await self.wizard.startIfNeeded(
                        mode: self.mode,
                        workspace: self.workspacePath.isEmpty ? nil : self.workspacePath)
                }
            }
            .buttonStyle(.borderedProminent)
        case .starting:
            HStack(spacing: 8) {
                ProgressView()
                Text("Iniciando assistente…")
                    .foregroundStyle(.secondary)
            }
        case let .step(step):
            OnboardingWizardStepView(
                step: step,
                isSubmitting: self.wizard.isSubmitting)
            { value in
                Task { await self.wizard.submit(step: step, value: value) }
            }
            .id(step.id)
        case .complete:
            Text("Configuração concluída. Continue para o próximo passo.")
                .font(.headline)
        case .waiting:
            Text("Aguardando assistente…")
                .foregroundStyle(.secondary)
        }
    }
}
