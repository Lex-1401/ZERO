import chalk, { Chalk } from "chalk";

import { ZERO_PALETTE } from "./palette.js";

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

export const theme = {
  accent: hex(ZERO_PALETTE.accent),
  accentBright: hex(ZERO_PALETTE.accentBright),
  accentDim: hex(ZERO_PALETTE.accentDim),
  info: hex(ZERO_PALETTE.info),
  success: hex(ZERO_PALETTE.success),
  warn: hex(ZERO_PALETTE.warn),
  error: hex(ZERO_PALETTE.error),
  muted: hex(ZERO_PALETTE.muted),
  heading: baseChalk.bold.hex(ZERO_PALETTE.accent),
  command: hex(ZERO_PALETTE.accentBright),
  option: hex(ZERO_PALETTE.warn),
} as const;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
