
/**
 * Terminal User Interface (TUI)
 *
 * Implements the interactive terminal interface for the ZERO platform.
 * Delegated to src/tui/main/ for maintainability and Atomic Modularity.
 */

import { type TuiOptions } from "./tui-types.js";
import { runTui as runApp } from "./main/app.js";
import { createEditorSubmitHandler as createSubmit } from "./main/handlers.js";

export type { TuiOptions };
export { resolveFinalAssistantText } from "./tui-formatters.js";

export async function runTui(opts: TuiOptions) {
  return runApp(opts);
}

export function createEditorSubmitHandler(params: any) {
  return createSubmit(params);
}
