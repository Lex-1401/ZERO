import { warn, danger } from "../../globals.js";
import { loadConfig } from "../../config/config.js";
import { writeConfigFile } from "../../config/io.js";
import { migrateTelegramGroupConfig } from "../group-migration.js";
import { resolveChannelConfigWrites } from "../../channels/plugins/config-writes.js";

/**
 * Handles Telegram group migration from legacy group to supergroup (chat ID changes).
 * Automatically migrates existing configuration to the new chat ID.
 *
 * @param params - Context and configuration for migration.
 */
export const handleTelegramMigration = async ({
  ctx,
  cfg,
  accountId,
  runtime,
}: {
  ctx: any;
  cfg: any;
  accountId: string;
  runtime: any;
}) => {
  try {
    const msg = ctx.message;
    if (!msg?.migrate_to_chat_id) return;

    const oldChatId = String(msg.chat.id);
    const newChatId = String(msg.migrate_to_chat_id);
    const chatTitle = (msg.chat as { title?: string }).title ?? "Unknown";

    runtime.log?.(warn(`[telegram] Group migrated: "${chatTitle}" ${oldChatId} → ${newChatId}`));

    if (!resolveChannelConfigWrites({ cfg, channelId: "telegram", accountId })) {
      runtime.log?.(warn("[telegram] Config writes disabled; skipping group config migration."));
      return;
    }

    // Check if old chat ID has config and migrate it
    const currentConfig = loadConfig();
    const migration = migrateTelegramGroupConfig({
      cfg: currentConfig,
      accountId,
      oldChatId,
      newChatId,
    });

    if (migration.migrated) {
      runtime.log?.(warn(`[telegram] Migrating group config from ${oldChatId} to ${newChatId}`));
      migrateTelegramGroupConfig({ cfg, accountId, oldChatId, newChatId });
      await writeConfigFile(currentConfig);
      runtime.log?.(warn(`[telegram] Group config migrated and saved successfully`));
    } else if (migration.skippedExisting) {
      runtime.log?.(
        warn(
          `[telegram] Group config already exists for ${newChatId}; leaving ${oldChatId} unchanged`,
        ),
      );
    } else {
      runtime.log?.(
        warn(`[telegram] No config found for old group ID ${oldChatId}, migration logged only`),
      );
    }
  } catch (err) {
    runtime.error?.(danger(`[telegram] Group migration handler failed: ${String(err)}`));
  }
};
