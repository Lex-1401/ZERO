import type { NoticeLevel, ReasoningLevel } from "../thinking.js";
import {
  type ElevatedLevel,
  normalizeElevatedLevel,
  normalizeNoticeLevel,
  normalizeReasoningLevel,
  normalizeThinkLevel,
  normalizeVerboseLevel,
  type ThinkLevel,
  type VerboseLevel,
} from "../thinking.js";

/**
 * Extractive state for directive parsing operations.
 *
 * [PT] Estado extrativo para operações de parsing de diretivas.
 *
 * @template T - The semantic type of the level identified (e.g., ThinkLevel, VerboseLevel).
 */
type ExtractedLevel<T> = {
  /**
   * The sanitized string payload with original directives and arguments excised.
   * [PT] O corpo do texto sanitizado com as diretivas e argumentos originais removidos.
   */
  cleaned: string;
  /**
   * The resolved and normalized level constant.
   * [PT] A constante de nível resolvida e normalizada.
   */
  level?: T;
  /**
   * The literal string token associated with the directive before normalization.
   * [PT] O token de string literal associado à diretiva antes da normalização.
   */
  rawLevel?: string;
  /**
   * Indicator of directive presence within the analyzed text body.
   * [PT] Indicador de presença de diretiva no corpo de texto analisado.
   */
  hasDirective: boolean;
};

/**
 * Escapes reserved characters in a string to facilitate safe regular expression construction.
 *
 * [PT] Escapa caracteres reservados em uma string para facilitar a construção segura de expressões regulares.
 *
 * @param value - The raw string literal to be neutralized.
 * @returns A strictly escaped string safe for regex insertion.
 */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Heuristic analyzer that identifies level-based directives (e.g., /think:high) within a text stream.
 *
 * [PT] Analisador heurístico que identifica diretivas baseadas em nível (ex: /think:high) em um fluxo de texto.
 *
 * This low-level utility locates the directive prefix, optional colon delimiter, and the subsequent
 * argument token while maintaining boundary awareness to prevent false positives.
 *
 * @param body - The source text to be scrutinized.
 * @param names - A set of directive aliases (e.g., ['think', 't']) to search for.
 * @returns A structural match report containing indices and raw tokens, or null if no candidate is found.
 */
const matchLevelDirective = (
  body: string,
  names: string[],
): { start: number; end: number; argStart: number; rawLevel?: string } | null => {
  const namePattern = names.map(escapeRegExp).join("|");
  const match = body.match(new RegExp(`(?:^|\\s)\\/(?:${namePattern})(?=$|\\s|:)`, "i"));
  if (!match || match.index === undefined) return null;
  const start = match.index;
  let end = match.index + match[0].length;
  let i = end;
  while (i < body.length && /\s/.test(body[i])) i += 1;
  let hasColon = false;
  if (body[i] === ":") {
    hasColon = true;
    i += 1;
    while (i < body.length && /\s/.test(body[i])) i += 1;
  }
  const argStart = i;
  while (i < body.length && /[A-Za-z-]/.test(body[i])) i += 1;
  let argEnd = i;

  // Heuristic: If there's no colon and the next char is not a delimiter,
  // don't treat the next word as an argument.
  if (argEnd > argStart && !hasColon) {
    const nextChar = body[argEnd];
    const isDelimiter = !nextChar || /[\s.,!?;:]/.test(nextChar);
    if (!isDelimiter) {
      argEnd = argStart;
    }
  }

  const rawLevel = argEnd > argStart ? body.slice(argStart, argEnd) : undefined;
  return { start, end: argEnd, argStart, rawLevel };
};

/**
 * High-order extractor that recursively identifies and normalizes level-based directives.
 *
 * [PT] Extrator de alto nível que identifica e normaliza recursivamente diretivas baseadas em nível.
 *
 * This function handles the removal of multiple directive occurrences to maximize context
 * cleanliness, returning the first valid normalized level encountered.
 *
 * @template T - The target type for normalization.
 * @param body - The raw input text containing potential directives.
 * @param names - Semantic aliases for the directive.
 * @param normalize - Transformation logic to convert raw tokens into typed constants.
 * @returns A comprehensive extraction report (ExtractedLevel).
 */
const extractLevelDirective = <T>(
  body: string,
  names: string[],
  normalize: (raw?: string) => T | undefined,
): ExtractedLevel<T> => {
  let currentBody = body;
  let firstLevel: T | undefined;
  let firstRaw: string | undefined;
  let hasDirective = false;

  // We loop to remove ALL instances of the directive to prevent context leakage.
  // We re-scan from the beginning each time because we modify the string.
  let safetyLimit = 10;
  while (safetyLimit-- > 0) {
    const match = matchLevelDirective(currentBody, names);
    if (!match) break;

    hasDirective = true;
    const rawLevel = match.rawLevel;
    const level = normalize(rawLevel);

    // If we have a rawLevel that doesn't normalize to a valid level,
    // and there was no colon, we check if we should "give back" the argument.
    let actualEnd = match.end;
    let actualRaw = rawLevel;

    const hasColon = currentBody.slice(match.start, match.argStart).includes(":");
    if (actualRaw && !level && !hasColon) {
      // Don't consume the argument if it's invalid and no colon was used.
      actualEnd = match.argStart;
      actualRaw = undefined;
    }

    if (!firstLevel && level) {
      firstLevel = level;
      firstRaw = actualRaw;
    } else if (!firstRaw && actualRaw) {
      firstRaw = actualRaw;
    }

    currentBody =
      currentBody.slice(0, match.start).concat(" ").concat(currentBody.slice(actualEnd)) + " ";
    currentBody = currentBody.replace(/\s+/g, " ");
  }

  return {
    cleaned: currentBody.trim(),
    level: firstLevel,
    rawLevel: firstRaw,
    hasDirective,
  };
};

/**
 * Identifies and excises simple boolean flag directives from a text body.
 *
 * [PT] Identifica e remove diretivas de flag booleanas simples de um corpo de texto.
 *
 * @param body - The input string to be cleaned.
 * @param names - Aliases representing the flag.
 * @returns An object containing the sanitized text and the flag's presence status.
 */
const extractSimpleDirective = (
  body: string,
  names: string[],
): { cleaned: string; hasDirective: boolean } => {
  const namePattern = names.map(escapeRegExp).join("|");
  const match = body.match(
    new RegExp(`(?:^|\\s)\\/(?:${namePattern})(?=$|\\s|:)(?:\\s*:\\s*)?`, "i"),
  );
  const cleaned = match ? body.replace(match[0], " ").replace(/\s+/g, " ").trim() : body.trim();
  return {
    cleaned,
    hasDirective: Boolean(match),
  };
};

/**
 * Orchestrates the extraction of the thinking level directive (/think, /t).
 *
 * [PT] Orquestra a extração da diretiva de nível de pensamento (/think, /t).
 *
 * @param body - The raw user input.
 * @returns The structured extraction result including the identified `ThinkLevel`.
 */
export function extractThinkDirective(body?: string): {
  cleaned: string;
  thinkLevel?: ThinkLevel;
  rawLevel?: string;
  hasDirective: boolean;
} {
  if (!body) return { cleaned: "", hasDirective: false };
  const extracted = extractLevelDirective(body, ["thinking", "think", "t"], normalizeThinkLevel);
  return {
    cleaned: extracted.cleaned,
    thinkLevel: extracted.level,
    rawLevel: extracted.rawLevel,
    hasDirective: extracted.hasDirective,
  };
}

/**
 * Orchestrates the extraction of the verbosity directive (/verbose, /v).
 *
 * [PT] Orquestra a extração da diretiva de verbosidade (/verbose, /v).
 *
 * @param body - The raw user input.
 * @returns The structured extraction result including the identified `VerboseLevel`.
 */
export function extractVerboseDirective(body?: string): {
  cleaned: string;
  verboseLevel?: VerboseLevel;
  rawLevel?: string;
  hasDirective: boolean;
} {
  if (!body) return { cleaned: "", hasDirective: false };
  const extracted = extractLevelDirective(body, ["verbose", "v"], normalizeVerboseLevel);
  return {
    cleaned: extracted.cleaned,
    verboseLevel: extracted.level,
    rawLevel: extracted.rawLevel,
    hasDirective: extracted.hasDirective,
  };
}

/**
 * Orchestrates the extraction of the notification logic directive (/notice, /notices).
 *
 * [PT] Orquestra a extração da diretiva de lógica de notificação (/notice, /notices).
 *
 * @param body - The raw user input.
 * @returns The structured extraction result including the identified `NoticeLevel`.
 */
export function extractNoticeDirective(body?: string): {
  cleaned: string;
  noticeLevel?: NoticeLevel;
  rawLevel?: string;
  hasDirective: boolean;
} {
  if (!body) return { cleaned: "", hasDirective: false };
  const extracted = extractLevelDirective(body, ["notice", "notices"], normalizeNoticeLevel);
  return {
    cleaned: extracted.cleaned,
    noticeLevel: extracted.level,
    rawLevel: extracted.rawLevel,
    hasDirective: extracted.hasDirective,
  };
}

/**
 * Orchestrates the extraction of the elevated privilege directive (/elevated, /elev).
 *
 * [PT] Orquestra a extração da diretiva de privilégio elevado (/elevated, /elev).
 *
 * @param body - The raw user input.
 * @returns The structured extraction result including the identified `ElevatedLevel`.
 */
export function extractElevatedDirective(body?: string): {
  cleaned: string;
  elevatedLevel?: ElevatedLevel;
  rawLevel?: string;
  hasDirective: boolean;
} {
  if (!body) return { cleaned: "", hasDirective: false };
  const extracted = extractLevelDirective(body, ["elevated", "elev"], normalizeElevatedLevel);
  return {
    cleaned: extracted.cleaned,
    elevatedLevel: extracted.level,
    rawLevel: extracted.rawLevel,
    hasDirective: extracted.hasDirective,
  };
}

/**
 * Orchestrates the extraction of the deliberation reasoning directive (/reasoning, /reason).
 *
 * [PT] Orquestra a extração da diretiva de raciocínio de deliberação (/reasoning, /reason).
 *
 * @param body - The raw user input.
 * @returns The structured extraction result including the identified `ReasoningLevel`.
 */
export function extractReasoningDirective(body?: string): {
  cleaned: string;
  reasoningLevel?: ReasoningLevel;
  rawLevel?: string;
  hasDirective: boolean;
} {
  if (!body) return { cleaned: "", hasDirective: false };
  const extracted = extractLevelDirective(body, ["reasoning", "reason"], normalizeReasoningLevel);
  return {
    cleaned: extracted.cleaned,
    reasoningLevel: extracted.level,
    rawLevel: extracted.rawLevel,
    hasDirective: extracted.hasDirective,
  };
}

/**
 * Orchestrates the extraction of the status inquiry directive (/status).
 *
 * [PT] Orquestra a extração da diretiva de consulta de status (/status).
 *
 * @param body - The raw user input.
 * @returns An extraction object confirming presence and providing sanitized text.
 */
export function extractStatusDirective(body?: string): {
  cleaned: string;
  hasDirective: boolean;
} {
  if (!body) return { cleaned: "", hasDirective: false };
  return extractSimpleDirective(body, ["status"]);
}

export type { ElevatedLevel, NoticeLevel, ReasoningLevel, ThinkLevel, VerboseLevel };
export { extractExecDirective } from "./exec/directive.js";
