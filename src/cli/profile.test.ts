import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs(["node", "zero", "gateway", "--dev", "--allow-unconfigured"]);
    if (!res.ok) throw new Error(res.error);
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "zero", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "zero", "--dev", "gateway"]);
    if (!res.ok) throw new Error(res.error);
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "zero", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "zero", "--profile", "work", "status"]);
    if (!res.ok) throw new Error(res.error);
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "zero", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "zero", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "zero", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "zero", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join("/home/peter", ".zero-dev");
    expect(env.ZERO_PROFILE).toBe("dev");
    expect(env.ZERO_STATE_DIR).toBe(expectedStateDir);
    expect(env.ZERO_CONFIG_PATH).toBe(path.join(expectedStateDir, "zero.json"));
    expect(env.ZERO_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      ZERO_STATE_DIR: "/custom",
      ZERO_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.ZERO_STATE_DIR).toBe("/custom");
    expect(env.ZERO_GATEWAY_PORT).toBe("19099");
    expect(env.ZERO_CONFIG_PATH).toBe(path.join("/custom", "zero.json"));
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("zero doctor --fix", {})).toBe("zero doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("zero doctor --fix", { ZERO_PROFILE: "default" })).toBe(
      "zero doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("zero doctor --fix", { ZERO_PROFILE: "Default" })).toBe(
      "zero doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("zero doctor --fix", { ZERO_PROFILE: "bad profile" })).toBe(
      "zero doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(formatCliCommand("zero --profile work doctor --fix", { ZERO_PROFILE: "work" })).toBe(
      "zero --profile work doctor --fix",
    );
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("zero --dev doctor", { ZERO_PROFILE: "dev" })).toBe(
      "zero --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("zero doctor --fix", { ZERO_PROFILE: "work" })).toBe(
      "zero --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("zero doctor --fix", { ZERO_PROFILE: "  jbzero  " })).toBe(
      "zero --profile jbzero doctor --fix",
    );
  });

  it("handles command with no args after zero", () => {
    expect(formatCliCommand("zero", { ZERO_PROFILE: "test" })).toBe("zero --profile test");
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm zero doctor", { ZERO_PROFILE: "work" })).toBe(
      "pnpm zero --profile work doctor",
    );
  });
});
