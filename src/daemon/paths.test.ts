import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".zero"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", ZERO_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".zero-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", ZERO_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".zero"));
  });

  it("uses ZERO_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", ZERO_STATE_DIR: "/var/lib/zero" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/zero"));
  });

  it("expands ~ in ZERO_STATE_DIR", () => {
    const env = { HOME: "/Users/test", ZERO_STATE_DIR: "~/zero-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/zero-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { ZERO_STATE_DIR: "C:\\State\\zero" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\zero");
  });
});
