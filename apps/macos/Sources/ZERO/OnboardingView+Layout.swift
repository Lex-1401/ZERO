import AppKit
import SwiftUI

extension OnboardingView {
    var body: some View {
        ZStack {
            OnboardingBackground()
            
            VStack(spacing: 0) {
                GlowingZeroIcon(size: 130, glowIntensity: 0.45)
                    .offset(y: 10)
                    .frame(height: 165)

                GeometryReader { _ in
                    HStack(spacing: 0) {
                        ForEach(self.pageOrder, id: \.self) { pageIndex in
                            self.pageView(for: pageIndex)
                                .frame(width: self.pageWidth)
                        }
                    }
                    .offset(x: CGFloat(-self.currentPage) * self.pageWidth)
                    .animation(
                        .interactiveSpring(response: 0.5, dampingFraction: 0.86, blendDuration: 0.25),
                        value: self.currentPage)
                    .frame(height: self.contentHeight, alignment: .top)
                    .clipped()
                }
                Spacer(minLength: 0)
                self.navigationBar
                    .padding(.top, 8)
                    .background(
                        LinearGradient(colors: [.clear, .black.opacity(0.08)], startPoint: .top, endPoint: .bottom)
                            .background(.ultraThinMaterial.opacity(0.5))
                    )
            }
        }
        .frame(width: self.pageWidth, height: Self.windowHeight)
        .onAppear {
            self.currentPage = 0
            self.updateMonitoring(for: 0)
        }
        .onChange(of: self.currentPage) { _, newValue in
            self.updateMonitoring(for: self.activePageIndex(for: newValue))
        }
        .onChange(of: self.state.connectionMode) { _, _ in
            let oldActive = self.activePageIndex
            self.reconcilePageForModeChange(previousActivePageIndex: oldActive)
            self.updateDiscoveryMonitoring(for: self.activePageIndex)
        }
        .onChange(of: self.needsBootstrap) { _, _ in
            if self.currentPage >= self.pageOrder.count {
                self.currentPage = max(0, self.pageOrder.count - 1)
            }
        }
        .onChange(of: self.onboardingWizard.isComplete) { _, newValue in
            guard newValue, self.activePageIndex == self.wizardPageIndex else { return }
            self.handleNext()
        }
        .onDisappear {
            self.stopPermissionMonitoring()
            self.stopDiscovery()
            self.stopAuthMonitoring()
            Task { await self.onboardingWizard.cancelIfRunning() }
        }
        .task {
            await self.refreshPerms()
            self.refreshCLIStatus()
            await self.loadWorkspaceDefaults()
            await self.ensureDefaultWorkspace()
            self.refreshAnthropicOAuthStatus()
            self.refreshBootstrapStatus()
            self.preferredGatewayID = GatewayDiscoveryPreferences.preferredStableID()
        }
    }

    func activePageIndex(for pageCursor: Int) -> Int {
        guard !self.pageOrder.isEmpty else { return 0 }
        let clamped = min(max(0, pageCursor), self.pageOrder.count - 1)
        return self.pageOrder[clamped]
    }

    func reconcilePageForModeChange(previousActivePageIndex: Int) {
        if let exact = self.pageOrder.firstIndex(of: previousActivePageIndex) {
            withAnimation { self.currentPage = exact }
            return
        }
        if let next = self.pageOrder.firstIndex(where: { $0 > previousActivePageIndex }) {
            withAnimation { self.currentPage = next }
            return
        }
        withAnimation { self.currentPage = max(0, self.pageOrder.count - 1) }
    }

    var navigationBar: some View {
        let wizardLockIndex = self.wizardPageOrderIndex
        return HStack(spacing: 20) {
            ZStack(alignment: .leading) {
                Button(action: {}, label: {
                    Label("Back", systemImage: "chevron.left").labelStyle(.iconOnly)
                })
                .buttonStyle(.plain)
                .opacity(0)
                .disabled(true)

                if self.currentPage > 0 {
                    Button(action: self.handleBack, label: {
                        Label("Back", systemImage: "chevron.left")
                            .labelStyle(.iconOnly)
                    })
                    .buttonStyle(.plain)
                    .foregroundColor(.secondary)
                    .opacity(0.8)
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                }
            }
            .frame(minWidth: 80, alignment: .leading)

            Spacer()

            HStack(spacing: 8) {
                ForEach(0..<self.pageCount, id: \.self) { index in
                    let isLocked = wizardLockIndex != nil && !self.onboardingWizard
                        .isComplete && index > (wizardLockIndex ?? 0)
                    Button {
                        withAnimation { self.currentPage = index }
                    } label: {
                        Circle()
                            .fill(index == self.currentPage ? Color.accentColor : Color.gray.opacity(0.3))
                            .frame(width: 8, height: 8)
                    }
                    .buttonStyle(.plain)
                    .disabled(isLocked)
                    .opacity(isLocked ? 0.3 : 1)
                }
            }

            Spacer()

            Button(action: self.handleNext) {
                Text(self.buttonTitle)
                    .frame(minWidth: 88)
            }
            .keyboardShortcut(.return)
            .buttonStyle(.borderedProminent)
            .disabled(!self.canAdvance)
        }
        .padding(.horizontal, 28)
        .padding(.bottom, 13)
        .frame(minHeight: 60, alignment: .bottom)
    }

    func onboardingPage(@ViewBuilder _ content: () -> some View) -> some View {
        let scrollIndicatorGutter: CGFloat = 18
        return ScrollView {
            VStack(spacing: 16) {
                content()
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .top)
            .padding(.trailing, scrollIndicatorGutter)
        }
        .scrollIndicators(.automatic)
        .padding(.horizontal, 28)
        .frame(width: self.pageWidth, alignment: .top)
    }

    func onboardingCard(
        spacing: CGFloat = 12,
        padding: CGFloat = 16,
        @ViewBuilder _ content: () -> some View) -> some View
    {
        VStack(alignment: .leading, spacing: spacing) {
            content()
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.12), radius: 12, y: 6))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(
                    LinearGradient(colors: [.white.opacity(0.4), .clear, .white.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing),
                    lineWidth: 1
                )
        )
    }

    func onboardingGlassCard(
        spacing: CGFloat = 12,
        padding: CGFloat = 16,
        @ViewBuilder _ content: () -> some View) -> some View
    {
        let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
        return VStack(alignment: .leading, spacing: spacing) {
            content()
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            shape.fill(.ultraThinMaterial.opacity(0.6))
        )
        .clipShape(shape)
        .overlay(
            shape.stroke(
                LinearGradient(colors: [.white.opacity(0.2), .clear, .white.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing),
                lineWidth: 1
            )
        )
    }

    func featureRow(title: String, subtitle: String, systemImage: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Color.accentColor)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    func featureActionRow(
        title: String,
        subtitle: String,
        systemImage: String,
        buttonTitle: String,
        action: @escaping () -> Void) -> some View
    {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Color.accentColor)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Button(buttonTitle, action: action)
                    .buttonStyle(.link)
                    .padding(.top, 2)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }
}
