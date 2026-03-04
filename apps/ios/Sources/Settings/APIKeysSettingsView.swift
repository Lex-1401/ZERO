import SwiftUI
import ZeroKit

struct APIKeysSettingsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var config: [String: Any] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Form {
            if self.isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            } else {
                Section("Anthropic") {
                    SecureField("API Key", text: self.binding(path: "auth.profiles.anthropic.apiKey"))
                }

                Section("Google") {
                    SecureField("API Key", text: self.binding(path: "auth.profiles.google.apiKey"))
                }

                Section("OpenAI") {
                    SecureField("API Key", text: self.binding(path: "auth.profiles.openai.apiKey"))
                }

                Section("DeepSeek") {
                    SecureField("API Key", text: self.binding(path: "auth.profiles.deepseek.apiKey"))
                }

                Section("Venice") {
                    SecureField("API Key", text: self.binding(path: "auth.profiles.venice.apiKey"))
                }
                
                Section("Local LLM") {
                  Toggle("Ollama Habilitado", isOn: self.boolBinding(path: "models.ollama.enabled"))
                  TextField("Ollama Base URL", text: self.binding(path: "models.ollama.baseUrl"))
                  Toggle("Apple MLX Habilitado (Experimental)", isOn: self.boolBinding(path: "models.mlx.enabled"))
                }
            }
            
            if let error = self.errorMessage {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Provedores de IA")
        .task {
            await self.loadConfig()
        }
    }

    private func loadConfig() async {
        self.isLoading = true
        defer { self.isLoading = false }
        do {
            let res = try await self.appModel.gatewaySession.request(method: "config.get", paramsJSON: "{}", timeoutSeconds: 8)
            guard let json = try JSONSerialization.jsonObject(with: res) as? [String: Any],
                  let cfg = json["config"] as? [String: Any] else { return }
            self.config = cfg
        } catch {
            self.errorMessage = "Falha ao carregar configuração: \(error.localizedDescription)"
        }
    }

    private func binding(path: String) -> Binding<String> {
        Binding(
            get: {
                self.getValue(path: path) as? String ?? ""
            },
            set: { newValue in
                self.updateValue(path: path, value: newValue)
                self.saveValue(path: path, value: newValue)
            }
        )
    }
    
    private func boolBinding(path: String) -> Binding<Bool> {
        Binding(
            get: {
                self.getValue(path: path) as? Bool ?? false
            },
            set: { newValue in
                self.updateValue(path: path, value: newValue)
                self.saveValue(path: path, value: newValue)
            }
        )
    }

    private func getValue(path: String) -> Any? {
        let parts = path.split(separator: ".")
        var current: Any? = self.config
        for part in parts {
            if let dict = current as? [String: Any] {
                current = dict[String(part)]
            } else {
                return nil
            }
        }
        return current
    }

    private func updateValue(path: String, value: Any) {
        let parts = path.split(separator: ".")
        var newConfig = self.config
        var current = newConfig
        
        // This is a simplified deep update for nested dicts
        // In a real app, we'd use a more robust mutable deep update
        self.config = self.merge(config: self.config, path: Array(parts), value: value)
    }
    
    private func merge(config: [String: Any], path: [String.SubSequence], value: Any) -> [String: Any] {
        var res = config
        guard let first = path.first else { return res }
        let key = String(first)
        
        if path.count == 1 {
            res[key] = value
        } else {
            let subDict = res[key] as? [String: Any] ?? [:]
            res[key] = self.merge(config: subDict, path: Array(path.dropFirst()), value: value)
        }
        return res
    }

    private func saveValue(path: String, value: Any) {
        Task {
            do {
                let parts = path.split(separator: ".")
                var patch: [String: Any] = [:]
                var current = patch
                
                // Build a nested patch dict
                func buildPatch(path: [String.SubSequence], value: Any) -> [String: Any] {
                    guard let first = path.first else { return [:] }
                    let key = String(first)
                    if path.count == 1 {
                        return [key: value]
                    } else {
                        return [key: buildPatch(path: Array(path.dropFirst()), value: value)]
                    }
                }
                
                let patchDict = buildPatch(path: Array(parts), value: value)
                let wrappedPatch = ["patch": patchDict]
                
                let data = try JSONSerialization.data(withJSONObject: wrappedPatch)
                guard let json = String(data: data, encoding: .utf8) else { return }
                
                _ = try await self.appModel.gatewaySession.request(method: "config.patch", paramsJSON: json, timeoutSeconds: 10)
            } catch {
                self.errorMessage = "Falha ao salvar: \(error.localizedDescription)"
            }
        }
    }
}
