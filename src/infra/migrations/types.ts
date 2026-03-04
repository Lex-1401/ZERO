
export interface LegacyStateDetection {
    targetAgentId: string;
    targetMainKey: string;
    stateDir: string;
    oauthDir: string;
    sessions: {
        legacyDir: string;
        hasLegacy: boolean;
    };
    whatsappAuth: {
        legacyDir: string;
        hasLegacy: boolean;
    };
    preview: string[];
}

export interface MigrationLogger {
    info: (message: string) => void;
    warn: (message: string) => void;
}
