import { Type } from "@sinclair/typebox";

export const MemorySearchParamsSchema = Type.Object({
  query: Type.String({ minLength: 1 }),
  agentId: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  minScore: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  sessionKey: Type.Optional(Type.String()),
});

export const MemorySearchResultItemSchema = Type.Object({
  id: Type.String(),
  snippet: Type.String(),
  score: Type.Number(),
  source: Type.String(),
  timestamp: Type.Optional(Type.Number()),
  sessionKey: Type.Optional(Type.String()),
  startLine: Type.Optional(Type.Number()),
  endLine: Type.Optional(Type.Number()),
  path: Type.Optional(Type.String()),
});

export const MemorySearchResultSchema = Type.Object({
  ts: Type.Number(),
  results: Type.Array(MemorySearchResultItemSchema),
});

export type MemorySearchParams = import("@sinclair/typebox").Static<
  typeof MemorySearchParamsSchema
>;
export type MemorySearchResult = import("@sinclair/typebox").Static<
  typeof MemorySearchResultSchema
>;
