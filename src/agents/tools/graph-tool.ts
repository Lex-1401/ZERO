import { Type } from "@sinclair/typebox";
import { MemoryIndexManager } from "../../memory/manager.js";
import type { ZEROConfig } from "../../config/config.js";
import { jsonResult } from "./common.js";
import type { AnyAgentTool } from "./common.js";

const GraphUpsertEntitySchema = Type.Object({
  name: Type.String({ description: "Name of the entity (e.g. 'Alice', 'Google')" }),
  type: Type.String({ description: "Type of the entity (e.g. 'Person', 'Company', 'Technology')" }),
  description: Type.Optional(Type.String({ description: "Description or facts about the entity" })),
  id: Type.Optional(Type.String({ description: "Optional UUID if updating a known entity" })),
});

const GraphUpsertRelationSchema = Type.Object({
  source: Type.String({ description: "Name or ID of the source entity" }),
  target: Type.String({ description: "Name or ID of the target entity" }),
  relation: Type.String({
    description: "Relationship type (e.g. 'WORKS_AT', 'AUTHORED', 'FRIEND_OF')",
  }),
  description: Type.Optional(Type.String({ description: "Context about the relationship" })),
});

const GraphSearchSchema = Type.Object({
  query: Type.String({ description: "Name of the entity to search for" }),
});

const GraphReadContextSchema = Type.Object({
  names: Type.Array(Type.String(), { description: "List of entity names to pull context for" }),
});

export function createGraphTools(options: { config: ZEROConfig; agentId: string }): AnyAgentTool[] {
  return [
    createGraphUpsertEntityTool(options),
    createGraphUpsertRelationTool(options),
    createGraphSearchTool(options),
    createGraphReadContextTool(options),
  ];
}

function createGraphUpsertEntityTool(options: {
  config: ZEROConfig;
  agentId: string;
}): AnyAgentTool {
  return {
    name: "graph_upsert_entity",
    label: "Add/Update Entity in Graph",
    description: "Add or update an entity in the Knowledge Graph.",
    parameters: GraphUpsertEntitySchema,
    execute: async (_toolCallId, args) => {
      const params = args as any;
      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });
      if (!manager) return jsonResult({ error: "Memory system unavailable" });

      const id = manager.graph.addEntity({
        name: params.name,
        type: params.type,
        description: params.description,
        id: params.id,
      });

      return jsonResult({ status: "success", entity_id: id });
    },
  };
}

function createGraphUpsertRelationTool(options: {
  config: ZEROConfig;
  agentId: string;
}): AnyAgentTool {
  return {
    name: "graph_upsert_relation",
    label: "Add/Update Relation in Graph",
    description:
      "Add or update a relationship between two entities. If entities don't exist, try to use graph_upsert_entity first, or providing exact names will work if they exist.",
    parameters: GraphUpsertRelationSchema,
    execute: async (_toolCallId, args) => {
      const params = args as any;
      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });
      if (!manager) return jsonResult({ error: "Memory system unavailable" });

      // Resolve source/target by name if IDs not provided
      let sourceId = params.source;
      let targetId = params.target;

      const sourceEntity = manager.graph.findEntityByName(params.source);
      if (sourceEntity) sourceId = sourceEntity.id;

      const targetEntity = manager.graph.findEntityByName(params.target);
      if (targetEntity) targetId = targetEntity.id;

      if (!sourceEntity || !targetEntity) {
        // Ideally we would error, but for robustness maybe we auto-create?
        // For now, let's error to be strict.
        if (!sourceEntity && !params.source.match(/^[0-9a-f-]{36}$/)) {
          // simple UUID check
          return jsonResult({
            error: `Source entity '${params.source}' not found. Create it first.`,
          });
        }
        if (!targetEntity && !params.target.match(/^[0-9a-f-]{36}$/)) {
          return jsonResult({
            error: `Target entity '${params.target}' not found. Create it first.`,
          });
        }
      }

      manager.graph.addRelation({
        source_id: sourceId,
        target_id: targetId,
        relation: params.relation,
        description: params.description,
      });

      return jsonResult({
        status: "success",
        relation: `${sourceId} -[${params.relation}]-> ${targetId}`,
      });
    },
  };
}

function createGraphSearchTool(options: { config: ZEROConfig; agentId: string }): AnyAgentTool {
  return {
    name: "graph_search",
    label: "Search Entities",
    description: "Find entities in the Knowledge Graph by name.",
    parameters: GraphSearchSchema,
    execute: async (_toolCallId, args) => {
      const params = args as any;
      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });
      if (!manager) return jsonResult({ error: "Memory system unavailable" });

      const results = manager.graph.searchEntities(params.query);
      return jsonResult({ results });
    },
  };
}

function createGraphReadContextTool(options: {
  config: ZEROConfig;
  agentId: string;
}): AnyAgentTool {
  return {
    name: "graph_read_context",
    label: "Read Graph Context",
    description: "Get comprehensive details and connections for a list of entity names.",
    parameters: GraphReadContextSchema,
    execute: async (_toolCallId, args) => {
      const params = args as any;
      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });
      if (!manager) return jsonResult({ error: "Memory system unavailable" });

      const text = manager.graph.getGraphContext(params.names);
      return jsonResult({ context: text });
    },
  };
}
