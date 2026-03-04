
import { type loadConfig } from "../../../config/io.js";

export interface DiscordConfig {
    dm?: {
        policy?: string;
        allowFrom?: string[];
    };
    commands?: {
        native?: string | boolean;
        nativeSkills?: string | boolean;
    };
    maxLinesPerMessage?: number;
}

export interface DiscordCommandArgContext {
    cfg: ReturnType<typeof loadConfig>;
    discordConfig: DiscordConfig;
    accountId: string;
    sessionPrefix: string;
}
