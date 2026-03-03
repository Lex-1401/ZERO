import { describe, it, expect } from "vitest";
import { evaluateDiscordAccess } from "./logic.js";
import { ChannelType } from "@buape/carbon";

describe("evaluateDiscordAccess", () => {
  const mockParams = {
    dmEnabled: true,
    groupDmEnabled: true,
    dmPolicy: "open",
    groupPolicy: "open",
    guildInfo: { id: "guild1" },
    guildEntriesCount: 1,
    channelConfig: { enabled: true, allowed: true },
    channelAllowlistConfigured: true,
    channelAllowed: true,
  };

  it("should allow access for an open group policy", () => {
    const context = {
      author: { id: "user1", username: "user" },
      channelInfo: { type: ChannelType.GuildText, id: "chan1" },
      guildId: "guild1",
      isGroupDm: false,
      isDirectMessage: false,
    };
    const result = evaluateDiscordAccess(context as any, mockParams as any);
    expect(result.allowed).toBe(true);
  });

  it("should block if DMs are disabled globally", () => {
    const params = { ...mockParams, dmEnabled: false };
    const context = {
      author: { id: "user1", username: "user" },
      channelInfo: { type: ChannelType.DM, id: "dm1" },
      isGroupDm: false,
      isDirectMessage: true,
    };
    const result = evaluateDiscordAccess(context as any, params as any);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("dms-disabled");
  });

  it("should block if guild is not in allowlist and whitelist is active", () => {
    const params = { ...mockParams, guildInfo: null, guildEntriesCount: 5 };
    const context = {
      author: { id: "user1", username: "user" },
      channelInfo: { type: ChannelType.GuildText, id: "chan1" },
      guildId: "unknown_guild",
      isGroupDm: false,
      isDirectMessage: false,
    };
    const result = evaluateDiscordAccess(context as any, params as any);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("guild-not-in-allowlist");
  });
});
