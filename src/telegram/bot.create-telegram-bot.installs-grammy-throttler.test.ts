import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatEnvelopeTimestamp } from "../../test/helpers/envelope-timestamp.js";

// Hoisted spies
const {
  replySpy,
  answerCallbackQuerySpy,
  sendMessageSpy,
  sendChatActionSpy,
  botCtorSpy,
  onSpy,
  middlewareUseSpy,
  useSpy,
  handlers,
  buildTelegramMessageContextSpy,
  dispatchTelegramMessageSpy,
  upsertTelegramPairingRequest,
} = vi.hoisted(() => {
  const handlers = new Map<string, Function>();
  return {
    replySpy: vi.fn(),
    answerCallbackQuerySpy: vi.fn(async () => undefined),
    sendMessageSpy: vi.fn(async () => ({ message_id: 77 })),
    sendChatActionSpy: vi.fn(async () => undefined),
    botCtorSpy: vi.fn(),
    onSpy: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
      return undefined;
    }),
    middlewareUseSpy: vi.fn(),
    useSpy: vi.fn(),
    handlers,
    buildTelegramMessageContextSpy: vi.fn(),
    dispatchTelegramMessageSpy: vi.fn(),
    upsertTelegramPairingRequest: vi.fn(),
  };
});

let createTelegramBot: typeof import("./bot.js").createTelegramBot;
let resetInboundDedupe: typeof import("../auto-reply/reply/inbound-dedupe.js").resetInboundDedupe;

vi.mock("./bot-message-context.js", () => ({
  buildTelegramMessageContext: buildTelegramMessageContextSpy,
}));
vi.mock("./bot-message-dispatch.js", () => ({
  dispatchTelegramMessage: dispatchTelegramMessageSpy,
}));
vi.mock("../auto-reply/reply.js", () => ({ getReplyFromConfig: replySpy, __replySpy: replySpy }));
vi.mock("./inline-buttons.js", () => ({
  resolveTelegramInlineButtonsScope: () => "all",
  isTelegramInlineButtonsEnabled: () => true,
  resolveTelegramTargetChatType: () => "direct",
}));
vi.mock("./accounts.js", () => ({
  resolveTelegramAccount: (params: any) => {
    const { cfg, accountId } = params;
    const account = cfg?.channels?.telegram?.accounts?.[accountId] || cfg?.channels?.telegram || {};
    return {
      config: { capabilities: ["inlineButtons"], ...account },
      accountId: accountId || "default",
    };
  },
  listTelegramAccountIds: (cfg: any) => Object.keys(cfg?.channels?.telegram?.accounts || []),
}));

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, loadConfig: vi.fn() };
});
vi.mock("./pairing-store.js", () => ({
  readTelegramAllowFromStore: vi.fn(async () => []),
  upsertTelegramPairingRequest,
}));

vi.mock("grammy", () => ({
  Bot: class {
    api = {
      config: { use: useSpy },
      answerCallbackQuery: (...args) => answerCallbackQuerySpy(...args),
      sendChatAction: (...args) => sendChatActionSpy(...args),
      sendMessage: (...args) => sendMessageSpy(...args),
      setMessageReaction: vi.fn().mockResolvedValue(undefined),
      setMyCommands: vi.fn().mockResolvedValue(undefined),
      sendAnimation: vi.fn().mockResolvedValue({ message_id: 78 }),
      sendPhoto: vi.fn().mockResolvedValue({ message_id: 79 }),
      getFile: vi.fn().mockResolvedValue({ download: async () => new Uint8Array() }),
    };
    use = middlewareUseSpy;
    on = onSpy;
    stop = vi.fn();
    command = vi.fn();
    constructor(
      public token: string,
      public options?: any,
    ) {
      botCtorSpy(token, options);
    }
  },
  InputFile: class {},
  webhookCallback: vi.fn(),
}));

vi.mock("@grammyjs/runner", () => ({
  sequentialize: (keyFn: any) => {
    (globalThis as any).__sequentializeKey = keyFn;
    return vi.fn();
  },
}));

vi.mock("@grammyjs/transformer-throttler", () => ({ apiThrottler: () => "throttler" }));

const getHandler = (event: string) => {
  const handler = handlers.get(event);
  if (!handler) throw new Error(`Handler not found for event: ${event}`);
  return handler;
};

describe("createTelegramBot", () => {
  beforeEach(async () => {
    ({ createTelegramBot } = await import("./bot.js"));
    ({ resetInboundDedupe } = await import("../auto-reply/reply/inbound-dedupe.js"));
    const configMod = await import("../config/config.js");

    resetInboundDedupe();
    process.env.TZ = "UTC";

    (configMod.loadConfig as any).mockReturnValue({
      agents: { defaults: { envelopeTimezone: "utc" } },
      channels: {
        telegram: { dmPolicy: "open", allowFrom: ["*"], capabilities: ["inlineButtons"] },
      },
    });

    buildTelegramMessageContextSpy.mockImplementation(async (params) => {
      const callbackQuery =
        (params.primaryCtx as any).callbackQuery ||
        (params.primaryCtx as any).update?.callback_query;
      const msg =
        params.primaryCtx.message ||
        callbackQuery?.message ||
        (params.primaryCtx as any).update?.message ||
        {};
      const chatId = msg.chat?.id || 1234;
      return {
        ctxPayload: {
          Body: msg.text || callbackQuery?.data || "hello",
          From: `telegram:${chatId}`,
          MessageSid: "1",
        },
        primaryCtx: params.primaryCtx,
        msg,
        chatId,
        sendTyping: async () => {
          await sendChatActionSpy(chatId, "typing", undefined);
        },
      };
    });

    dispatchTelegramMessageSpy.mockImplementation(async ({ context }) => {
      if (context) {
        await context.sendTyping?.();
        await replySpy(context.ctxPayload);
      }
    });

    upsertTelegramPairingRequest.mockResolvedValue({ code: "PAIRCODE", created: true });
    replySpy.mockReset();
    answerCallbackQuerySpy.mockReset().mockResolvedValue(undefined);
    sendMessageSpy.mockReset().mockResolvedValue({ message_id: 77 });
    sendChatActionSpy.mockReset().mockResolvedValue(undefined);
    botCtorSpy.mockClear();
    onSpy.mockClear();
    middlewareUseSpy.mockClear();
    useSpy.mockClear();
    handlers.clear();
  });

  afterEach(() => {
    process.env.TZ = undefined;
  });

  it("installs grammY throttler", () => {
    createTelegramBot({ token: "tok" });
    expect(useSpy).toHaveBeenCalledWith("throttler");
  });

  it("installs sequentializer", () => {
    createTelegramBot({ token: "tok" });
    expect(middlewareUseSpy).toHaveBeenCalled();
  });

  it("resolves sequential keys correctly", () => {
    createTelegramBot({ token: "tok" });
    const keyFn = (globalThis as any).__sequentializeKey;
    expect(keyFn).toBeDefined();
    expect(keyFn({ message: { chat: { id: 123 }, message_thread_id: 456 } })).toBe(
      "telegram:123:topic:456",
    );
    expect(keyFn({ chat: { id: 123 } })).toBe("telegram:123");
    expect(keyFn({ update: { callback_query: { message: { chat: { id: 789 } } } } })).toBe(
      "telegram:789",
    );
    expect(keyFn({})).toBe("telegram:unknown");
  });

  it("dedupes duplicate updates by update_id", async () => {
    createTelegramBot({ token: "tok" });
    const handler = getHandler("message");
    const ctx = {
      update: { update_id: 111 },
      message: { text: "hello", chat: { id: 1234, type: "private" }, from: { id: 1234 } },
      me: { username: "bot" },
    };
    await handler(ctx);
    await handler(ctx);
    expect(replySpy).toHaveBeenCalledTimes(1);
  });

  it("uses wrapped fetch when global fetch is available", () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn() as any;
    globalThis.fetch = fetchSpy;
    try {
      createTelegramBot({ token: "tok" });
      const clientFetch = botCtorSpy.mock.calls[0]?.[1]?.client?.fetch;
      expect(clientFetch).toBeTypeOf("function");
      expect(clientFetch).not.toBe(fetchSpy);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("passes timeoutSeconds and prefes overrides", async () => {
    const configMod = await import("../config/config.js");
    (configMod.loadConfig as any).mockReturnValue({
      channels: { telegram: { timeoutSeconds: 61, accounts: { foo: { timeoutSeconds: 62 } } } },
    });
    createTelegramBot({ token: "tok", accountId: "foo" });
    expect(botCtorSpy).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ client: expect.objectContaining({ timeoutSeconds: 62 }) }),
    );
  });

  it("routes callback_query payloads as messages and answers callbacks", async () => {
    createTelegramBot({ token: "tok" });
    const handler = getHandler("callback_query");
    const callbackData = {
      id: "cbq-1",
      data: "cmd:a",
      from: { id: 1234 },
      message: { chat: { id: 1234, type: "private" }, message_id: 10 },
    };
    const ctx = {
      update: { callback_query: callbackData },
      callbackQuery: callbackData,
      me: { username: "bot" },
      getFile: async () => ({}),
    };
    await handler(ctx);
    expect(answerCallbackQuerySpy).toHaveBeenCalledWith("cbq-1");
    expect(replySpy).toHaveBeenCalled();
  });

  it("wraps inbound message with Telegram envelope", async () => {
    buildTelegramMessageContextSpy.mockImplementationOnce(async (params) => {
      const expected = "[Telegram Ada Lovelace (@ada_bot) id:1234 2025-01-09T00:00Z] hello world";
      return {
        ctxPayload: { Body: expected, From: "telegram:1234" },
        primaryCtx: params.primaryCtx,
        chatId: 1234,
        sendTyping: async () => {},
      };
    });
    createTelegramBot({ token: "tok" });
    const handler = getHandler("message");
    await handler({
      message: {
        text: "hello world",
        chat: { id: 1234, type: "private" },
        from: { id: 1234, first_name: "Ada Lovelace", username: "ada_bot" },
        date: 1736380800,
      },
      me: { username: "bot" },
      getFile: async () => ({ download: async () => new Uint8Array() }),
    });
    const payload = replySpy.mock.calls[0][0];
    const expectedTz = formatEnvelopeTimestamp(new Date(1736380800 * 1000), "utc");
    expect(payload.Body).toContain(expectedTz);
  });

  it("requests pairing by default for unknown DM senders", async () => {
    buildTelegramMessageContextSpy.mockImplementationOnce(async (params) => {
      await params.bot.api.sendMessage(888, "Pairing code: PAIRCODE");
      return null;
    });
    createTelegramBot({ token: "tok" });
    const handler = getHandler("message");
    await handler({
      message: { chat: { id: 888, type: "private" } },
      me: { username: "bot" },
      getFile: async () => ({}),
    });
    expect(replySpy).not.toHaveBeenCalled();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      888,
      expect.stringContaining("Pairing code: PAIRCODE"),
    );
  });

  it("does not resend pairing code when a request is already pending", async () => {
    upsertTelegramPairingRequest
      .mockResolvedValueOnce({ code: "PAIRCODE", created: true })
      .mockResolvedValueOnce({ code: "PAIRCODE", created: false });
    buildTelegramMessageContextSpy.mockImplementation(async (params) => {
      const { created } = await upsertTelegramPairingRequest({ chatId: "999" });
      if (created) await params.bot.api.sendMessage(999, "Pairing code: PAIRCODE");
      return null;
    });
    createTelegramBot({ token: "tok" });
    const handler = getHandler("message");
    const msg = { chat: { id: 999, type: "private" } };
    await handler({ message: msg, me: { username: "bot" }, getFile: async () => ({}) });
    await handler({ message: msg, me: { username: "bot" }, getFile: async () => ({}) });
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
  });

  it("triggers typing cue", async () => {
    createTelegramBot({ token: "tok" });
    const handler = getHandler("message");
    await handler({
      message: { chat: { id: 42, type: "private" } },
      me: { username: "bot" },
      getFile: async () => ({}),
    });
    expect(sendChatActionSpy).toHaveBeenCalledWith(42, "typing", undefined);
  });
});
