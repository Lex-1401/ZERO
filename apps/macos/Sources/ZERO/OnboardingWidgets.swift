import AppKit
import SwiftUI

struct GlowingZeroIcon: View {
    @Environment(\.scenePhase) private var scenePhase

    let size: CGFloat
    let glowIntensity: Double
    let enableFloating: Bool

    @State private var breathe = false

    init(size: CGFloat = 148, glowIntensity: Double = 0.35, enableFloating: Bool = true) {
        self.size = size
        self.glowIntensity = glowIntensity
        self.enableFloating = enableFloating
    }

    var body: some View {
        let glowBlurRadius: CGFloat = 24
        let glowCanvasSize: CGFloat = self.size + 64
        ZStack {
            // Glow effect
            Circle()
                .fill(
                    AngularGradient(
                        colors: [
                            Color.blue,
                            Color.purple,
                            Color.cyan,
                            Color.blue
                        ],
                        center: .center
                    )
                )
                .frame(width: glowCanvasSize * 0.8, height: glowCanvasSize * 0.8)
                .blur(radius: glowBlurRadius)
                .scaleEffect(self.breathe ? 1.2 : 0.9)
                .opacity(self.glowIntensity * (self.breathe ? 1.0 : 0.7))
                .animation(.easeInOut(duration: 4).repeatForever(autoreverses: true), value: self.breathe)

            // Main Icon Container
            ZStack {
                // Content: App Icon or Mascot
                // Use the transparency-enabled version if available
                let officialIconPath = "/Users/lex/Downloads/Arquivos/ZERO/macOS Icon.png"
                if let nsImage = NSImage(contentsOfFile: officialIconPath) ?? NSImage(named: "AppIcon_Official") {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding(5) // Subtle padding for the glow
                } else if let icon = NSApp.applicationIconImage, icon.size.width > 32 {
                     Image(nsImage: icon)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } else {
                    // Fallback to stylized SVG-like droid if nothing else found
                    ZStack {
                        Capsule(style: .continuous)
                            .fill(LinearGradient(colors: [Color(red: 0.8, green: 0.1, blue: 0.1), Color(red: 0.5, green: 0, blue: 0)], startPoint: .top, endPoint: .bottom))
                            .frame(width: size * 0.5, height: size * 0.7)
                        
                        Circle().fill(Color.cyan).frame(width: size * 0.1).offset(x: -size * 0.1, y: -size * 0.1)
                        Circle().fill(Color.cyan).frame(width: size * 0.1).offset(x: size * 0.1, y: -size * 0.1)
                    }
                }
            }
            .frame(width: self.size, height: self.size)
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
            .scaleEffect(self.breathe ? 1.03 : 1.0)
            .offset(y: self.breathe ? -6 : 0)
        }
        .frame(
            width: glowCanvasSize + (glowBlurRadius * 2),
            height: glowCanvasSize + (glowBlurRadius * 2))
        .onAppear { self.updateBreatheAnimation() }
        .onDisappear { self.breathe = false }
        .onChange(of: self.scenePhase) { _, _ in
            self.updateBreatheAnimation()
        }
    }

    private func updateBreatheAnimation() {
        guard self.enableFloating, self.scenePhase == .active else {
            self.breathe = false
            return
        }
        // Small delay to ensure view is ready
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) {
                self.breathe = true
            }
        }
    }
}

struct OnboardingBackground: View {
    var body: some View {
        ZStack {
            Color(NSColor.windowBackgroundColor)
            
            // Subtle mesh-like gradients
            Canvas { context, size in
                context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(NSColor.windowBackgroundColor)))
                
                let rect1 = CGRect(x: -size.width * 0.2, y: -size.height * 0.2, width: size.width * 0.8, height: size.height * 0.8)
                context.fill(Path(ellipseIn: rect1), with: .radialGradient(Gradient(colors: [Color.blue.opacity(0.12), .clear]), center: CGPoint(x: rect1.midX, y: rect1.midY), startRadius: 0, endRadius: size.width * 0.4))
                
                let rect2 = CGRect(x: size.width * 0.5, y: size.height * 0.5, width: size.width * 0.7, height: size.height * 0.7)
                context.fill(Path(ellipseIn: rect2), with: .radialGradient(Gradient(colors: [Color.purple.opacity(0.1), .clear]), center: CGPoint(x: rect2.midX, y: rect2.midY), startRadius: 0, endRadius: size.width * 0.4))
            }
            .opacity(0.6)
            .ignoresSafeArea()
            
            VisualEffectView(material: .sidebar, blendingMode: .behindWindow)
                .ignoresSafeArea()
        }
    }
}

