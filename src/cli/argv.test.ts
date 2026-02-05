import { describe, expect, it } from "vitest";

import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "zero", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "zero", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "zero", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "zero", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "zero", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "zero", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "zero", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "zero"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "zero", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "zero", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "zero", "status", "--timeout", "5000"], "--timeout")).toBe("5000");
    expect(getFlagValue(["node", "zero", "status", "--timeout=2500"], "--timeout")).toBe("2500");
    expect(getFlagValue(["node", "zero", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "zero", "status", "--timeout", "--json"], "--timeout")).toBe(null);
    expect(getFlagValue(["node", "zero", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "zero", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "zero", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "zero", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "zero", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "zero", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "zero", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "zero", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "zero",
      rawArgs: ["node", "zero", "status"],
    });
    expect(nodeArgv).toEqual(["node", "zero", "status"]);

    const directArgv = buildParseArgv({
      programName: "zero",
      rawArgs: ["zero", "status"],
    });
    expect(directArgv).toEqual(["node", "zero", "status"]);

    const bunArgv = buildParseArgv({
      programName: "zero",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "zero",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "zero", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "zero", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "zero", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "zero", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "zero", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "zero", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "zero", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "zero", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
