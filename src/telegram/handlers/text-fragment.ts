import { danger } from "../../globals.js";
import { readTelegramAllowFromStore } from "../pairing-store.js";
import type { TelegramMessage } from "../bot/types.js";

export type TextFragmentEntry = {
  key: string;
  messages: Array<{ msg: TelegramMessage; ctx: unknown; receivedAtMs: number }>;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Flushes buffered text fragments by joining them into a single synthetic message.
 *
 * @param params - Context and references for fragment reconstruction.
 */
export const flushTextFragments = async ({
  entry,
  processMessage,
  runtime,
}: {
  entry: TextFragmentEntry;
  processMessage: any;
  runtime: any;
}) => {
  try {
    entry.messages.sort((a, b) => a.msg.message_id - b.msg.message_id);

    const first = entry.messages[0];
    const last = entry.messages.at(-1);
    if (!first || !last) return;

    const combinedText = entry.messages.map((m) => m.msg.text ?? "").join("");
    if (!combinedText.trim()) return;

    const syntheticMessage: TelegramMessage = {
      ...first.msg,
      text: combinedText,
      caption: undefined,
      caption_entities: undefined,
      entities: undefined,
      date: last.msg.date ?? first.msg.date,
    };

    const storeAllowFrom = await readTelegramAllowFromStore().catch(() => []);
    const baseCtx = first.ctx as { me?: unknown; getFile?: unknown } & Record<string, unknown>;
    const getFile =
      typeof baseCtx.getFile === "function" ? baseCtx.getFile.bind(baseCtx) : async () => ({});

    await processMessage(
      { message: syntheticMessage, me: baseCtx.me, getFile },
      [],
      storeAllowFrom,
      { messageIdOverride: String(last.msg.message_id) },
    );
  } catch (err) {
    runtime.error?.(danger(`text fragment handler failed: ${String(err)}`));
  }
};
