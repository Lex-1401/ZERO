import fs from "node:fs/promises";
import path from "node:path";
import { IntegrityCrypt } from "./crypt.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("security/decision-vault");

export interface DecisionEntry {
    id: string;
    timestamp: string;
    topic: string;
    rationale: string;
    impact: string;
    status: "active" | "deprecated";
}

/**
 * DecisionVault: Cofre soberano para armazenamento encriptado de inteligência estratégica e de segurança.
 * Garante que decisões críticas sejam preservadas localmente sem exposição no histórico Git.
 */
export class DecisionVault {
    private vaultFile: string;

    constructor(projectRoot: string) {
        // Armazena em .aios-core/data/sovereign-intelligence.vault (git-ignored)
        this.vaultFile = path.join(projectRoot, ".aios-core", "data", "sovereign-intelligence.vault");
    }

    /**
     * Adiciona uma nova decisão estratégica ao cofre.
     */
    async recordDecision(entry: Omit<DecisionEntry, "timestamp">, encryptionToken: string): Promise<void> {
        const data = await this.readVault(encryptionToken);

        const newEntry: DecisionEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
        };

        data.push(newEntry);
        await this.saveVault(data, encryptionToken);
        log.info(`Decisão soberana registrada: ${entry.topic}`);
    }

    /**
     * Recupera todas as decisões registradas.
     */
    async listDecisions(encryptionToken: string): Promise<DecisionEntry[]> {
        return await this.readVault(encryptionToken);
    }

    private async readVault(token: string): Promise<DecisionEntry[]> {
        try {
            if (!await fs.stat(this.vaultFile).then(() => true).catch(() => false)) {
                return [];
            }

            const content = await fs.readFile(this.vaultFile, "utf8");
            if (IntegrityCrypt.isEncrypted(content.trim())) {
                const decrypted = IntegrityCrypt.decrypt(content.trim(), token);
                return JSON.parse(decrypted);
            }
            return JSON.parse(content);
        } catch (err) {
            log.error("Falha ao ler cofre soberano", { error: String(err) });
            return [];
        }
    }

    private async saveVault(data: DecisionEntry[], token: string): Promise<void> {
        try {
            const json = JSON.stringify(data, null, 2);
            const encrypted = IntegrityCrypt.encrypt(json, token);

            const dir = path.dirname(this.vaultFile);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.vaultFile, encrypted, { mode: 0o600 });
        } catch (err) {
            log.error("Falha ao salvar cofre soberano", { error: String(err) });
        }
    }
}
