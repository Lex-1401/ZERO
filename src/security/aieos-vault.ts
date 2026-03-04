/**
 * AIEOS (AI Entity Object Specification) Vault
 * [PT] Cofre AIEOS para portabilidade de identidade de agentes.
 *
 * Implementação inspirada nas lições de soberania técnica do ZeroClaw.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface AIEOSIdentity {
  v: string; // Version
  id: string;
  name: string;
  avatar?: string;
  capabilities: string[];
  metadata: Record<string, any>;
  signature?: string;
}

export class AIEOSVault {
  private vaultPath: string;

  constructor(vaultRoot: string) {
    this.vaultPath = join(vaultRoot, "aieos-identities.json");
  }

  /**
   * Exporta a identidade soberana do agente no padrão AIEOS.
   */
  export(identity: AIEOSIdentity): string {
    const data = JSON.stringify(identity, null, 2);
    writeFileSync(this.vaultPath, data);
    return this.vaultPath;
  }

  /**
   * Importa uma identidade externa para o sistema ZERO.
   */
  import(path: string): AIEOSIdentity {
    if (!existsSync(path)) {
      throw new Error(`Identidade AIEOS não encontrada em: ${path}`);
    }
    const data = readFileSync(path, "utf8");
    return JSON.parse(data) as AIEOSIdentity;
  }

  /**
   * Gera um manifesto AIEOS v1.1 compatível.
   */
  static createManifest(id: string, name: string): AIEOSIdentity {
    return {
      v: "1.1",
      id,
      name,
      capabilities: ["chat", "vision", "tools"],
      metadata: {
        created_at: new Date().toISOString(),
        origin: "ZERO-A-POS",
      },
    };
  }
}
