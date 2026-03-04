
/**
 * OpenResponses HTTP Handler Wrapper
 *
 * Implements the OpenResponses `/v1/responses` endpoint for ZERO Gateway.
 * Delegated to modular components in src/gateway/openresponses/ for maintainability.
 *
 * @see https://www.open-responses.com/
 */

import { handleOpenResponsesHttpRequest as coreHandler } from "./openresponses/handler.js";
import { buildAgentPrompt as corePromptBuilder } from "./openresponses/prompts.js";
import type { OpenResponsesHttpOptions } from "./openresponses/types.js";

export { coreHandler as handleOpenResponsesHttpRequest };
export { corePromptBuilder as buildAgentPrompt };
export type { OpenResponsesHttpOptions };
