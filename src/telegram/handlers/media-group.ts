import { danger } from "../../globals.js";
import { resolveMedia } from "../bot/delivery.js";
import { readTelegramAllowFromStore } from "../pairing-store.js";
import type { MediaGroupEntry } from "../bot-updates.js";

/**
 * Processes a group of media messages (images, videos, etc.) from Telegram.
 *
 * @param params - Configuration and context for media group resolution.
 */
export const processMediaGroup = async ({
  entry,
  mediaMaxBytes,
  token,
  proxyFetch,
  runtime,
  processMessage,
}: {
  entry: MediaGroupEntry;
  mediaMaxBytes: number;
  token: string;
  proxyFetch?: any;
  runtime: any;
  processMessage: any;
}) => {
  try {
    entry.messages.sort((a, b) => a.msg.message_id - b.msg.message_id);

    const captionMsg = entry.messages.find((m) => m.msg.caption || m.msg.text);
    const primaryEntry = captionMsg ?? entry.messages[0];

    const allMedia: Array<{ path: string; contentType?: string }> = [];
    for (const { ctx } of entry.messages) {
      const media = await resolveMedia(ctx, mediaMaxBytes, token, proxyFetch);
      if (media) {
        allMedia.push({ path: media.path, contentType: media.contentType });
      }
    }

    const storeAllowFrom = await readTelegramAllowFromStore().catch(() => []);
    await processMessage(primaryEntry.ctx, allMedia, storeAllowFrom);
  } catch (err) {
    runtime.error?.(danger(`media group handler failed: ${String(err)}`));
  }
};
