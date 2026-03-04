import type {
  MediaUnderstandingDecision,
  MediaUnderstandingOutput,
  MediaUnderstandingProvider,
} from "../types.js";

export type ActiveMediaModel = {
  provider: string;
  model?: string;
};

export type ProviderRegistry = Map<string, MediaUnderstandingProvider>;

export type RunCapabilityResult = {
  outputs: MediaUnderstandingOutput[];
  decision: MediaUnderstandingDecision;
};
