
/**
 * Media Understanding Execution
 *
 * Implements the execution of media understanding tasks via various providers and CLI tools.
 * Delegated to src/media-understanding/runner/execution/ for maintainability and Atomic Modularity.
 */

import {
  runAttachmentEntries as runEntries,
  runProviderEntry as provider,
  runCliEntry as cli
} from "./execution/main.js";
import { trimOutput as trim } from "./execution/utils.js";

export async function runAttachmentEntries(params: any) {
  return await runEntries(params);
}

export async function runProviderEntry(params: any) {
  return await provider(params);
}

export async function runCliEntry(params: any) {
  return await cli(params);
}

export function trimOutput(text: string, maxChars?: number): string {
  return trim(text, maxChars);
}

export function commandBase(command: string): string {
  return command.split(" ")[0];
}
