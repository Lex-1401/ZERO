import { t, injectTranslation, currentLang } from "../i18n";
import type { AppViewState } from "../app-view-state";

/**
 * LocalizationAgent
 * Responsável por gerenciar o ciclo de vida da Localização On-Demand.
 * Orquestra chamas ao LLM e persiste traduções no ecossistema.
 */
export class LocalizationAgent {
    private static instance: LocalizationAgent;
    private busyKeys = new Set<string>();
    private CHUNK_SIZE = 15; // Número de chaves por pacotes para otimizar contexto/tokens

    static getInstance() {
        if (!this.instance) this.instance = new LocalizationAgent();
        return this.instance;
    }

    /**
     * Traduz uma lista de chaves (Auto-Chunking)
     */
    async translateBatch(state: AppViewState, keys: string[], targetLang: string) {
        const chunks = this.splitIntoChunks(keys, this.CHUNK_SIZE);
        for (const chunk of chunks) {
            await this.processChunk(state, chunk, targetLang);
        }
    }

    /**
     * Processa um pacote de traduções com Âncora Semântica e Proteções
     */
    private async processChunk(state: AppViewState, keys: string[], targetLang: string) {
        // Filtrar chaves protegidas (Blacklist e Root Dictionary)
        const allowedKeys = keys.filter(key => !this.isBlacklisted(key));

        const pendingKeys = allowedKeys.filter(k => !this.busyKeys.has(k));
        if (pendingKeys.length === 0) return;

        pendingKeys.forEach(k => this.busyKeys.add(k));

        // Âncora Semântica: Pegamos os valores originais em pt-BR como referência de contexto
        const payload = pendingKeys.map(key => ({
            key,
            source: t(key), // Retorna o valor em pt-BR (âncora)
            context: this.inferContext(key)
        }));

        console.log(`[LocalizationAgent] Enviando chunk de ${pendingKeys.length} chaves para [${targetLang}]...`);

        try {
            // Placeholder para chamada real à API (OpenAI/NVIDIA) via Gateway
            // Aqui seria feito o dispatch via MCP
            await new Promise(r => setTimeout(r, 1000));

            payload.forEach(item => {
                const simulatedValue = `[✨] ${item.source}`;
                injectTranslation(targetLang, item.key, simulatedValue, true);
            });

            if (state.requestUpdate) state.requestUpdate();

        } catch (error) {
            console.error("[LocalizationAgent] Erro no processamento do chunk:", error);
        } finally {
            pendingKeys.forEach(k => this.busyKeys.delete(k));
        }
    }

    private isBlacklisted(key: string): boolean {
        // Proteção de Termos Core e Menu Raiz
        const blacklist = ["app.title", "app.panic", "app.sentinel"];
        const rootNavigation = ["nav.mission-control", "nav.chat", "nav.config"];

        return blacklist.includes(key) || rootNavigation.includes(key);
    }

    /**
     * Valida uma tradução (Feedback Loop)
     * Despacha para o servidor para persistência real e refinamento futuro.
     */
    async validateTranslation(state: AppViewState, key: string, lang: string, approved: boolean) {
        console.log(`[LocalizationAgent] Persistindo feedback: ${key} [${lang}] -> ${approved ? 'APROVADO' : 'REJEITADO'}`);

        try {
            // Persistência Real via Gateway (RPC de Telemetria)
            if (state.client && state.connected) {
                await state.client.request("telemetry.log_event", {
                    event: "i18n_feedback",
                    payload: {
                        key,
                        lang,
                        approved,
                        engine: "agentic-jit-v1"
                    }
                });
            }

            // Também salvamos localmente uma flag de validação
            localStorage.setItem(`zero-lang-feedback-${lang}-${key}`, approved ? '1' : '0');

        } catch (error) {
            console.error("[LocalizationAgent] Falha ao persistir feedback:", error);
        }
    }

    private splitIntoChunks<T>(array: T[], size: number): T[][] {
        const results = [];
        for (let i = 0; i < array.length; i += size) {
            results.push(array.slice(i, i + size));
        }
        return results;
    }

    private inferContext(key: string): string {
        if (key.startsWith('nav.')) return "Menu de navegação (curto)";
        if (key.startsWith('error.')) return "Mensagem de erro técnica";
        if (key.startsWith('onboarding.')) return "Texto longo de boas-vindas";
        return "Interface de usuário";
    }

    /**
     * Executa um teste de estresse traduzindo um lote massivo de chaves.
     * Útil para validar o Auto-Chunking.
     */
    async runStressTest(state: AppViewState, targetLang: string) {
        console.log(`[STRESS TEST] Iniciando tradução em massa para [${targetLang}]...`);

        // Simulação de chaves da seção de Configurações (> 15 chaves para forçar chunking)
        const keysToTest = [
            "config.nav.overview", "config.nav.settings", "config.mode.default",
            "config.mode.json", "config.status.synced", "config.status.manual",
            "config.action.revert", "config.action.save", "config.action.apply",
            "config.diff.title", "config.diag.critical", "config.appearance.theme.desc",
            "config.section.agents.label", "config.section.auth.label", "config.section.ui.label",
            "config.field.apiKey", "config.field.baseUrl", "config.field.enabled",
            "config.node.reset", "config.node.add", "config.node.remove"
        ];

        return this.translateBatch(state, keysToTest, targetLang);
    }
}
