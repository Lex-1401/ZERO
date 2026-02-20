import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export type GraphEntity = {
  id: string;
  name: string;
  type: string;
  description?: string;
  updated_at: number;
};

export type GraphRelation = {
  source_id: string;
  target_id: string;
  relation: string;
  description?: string;
  updated_at: number;
};

export class KnowledgeGraph {
  constructor(private db: DatabaseSync) {}

  addEntity(params: { name: string; type: string; description?: string; id?: string }) {
    const id = params.id || randomUUID();
    const now = Date.now();
    this.db
      .prepare(`
      INSERT INTO entities (id, name, type, description, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        description = excluded.description,
        updated_at = excluded.updated_at
    `)
      .run(id, params.name, params.type, params.description || null, now);
    return id;
  }

  addRelation(params: {
    source_id: string;
    target_id: string;
    relation: string;
    description?: string;
  }) {
    const now = Date.now();
    this.db
      .prepare(`
      INSERT INTO relations (source_id, target_id, relation, description, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_id, target_id, relation) DO UPDATE SET
        description = excluded.description,
        updated_at = excluded.updated_at
    `)
      .run(params.source_id, params.target_id, params.relation, params.description || null, now);
  }

  findEntityByName(name: string): GraphEntity | undefined {
    // Basic Exact Match (case-insensitive) for now. Could upgrade to FTS later.
    return this.db
      .prepare(`
      SELECT * FROM entities WHERE lower(name) = lower(?) LIMIT 1
    `)
      .get(name) as GraphEntity | undefined;
  }

  searchEntities(query: string, limit = 5): GraphEntity[] {
    return this.db
      .prepare(`
      SELECT * FROM entities WHERE name LIKE ? LIMIT ?
    `)
      .all(`%${query}%`, limit) as GraphEntity[];
  }

  getRelationsForEntity(
    entityId: string,
  ): Array<{ relation: string; target: GraphEntity; description?: string }> {
    // Outgoing
    const outgoing = this.db
      .prepare(`
      SELECT r.relation, r.description, e.id, e.name, e.type, e.description as target_desc
      FROM relations r
      JOIN entities e ON r.target_id = e.id
      WHERE r.source_id = ?
    `)
      .all(entityId) as any[];

    // Incoming (inverse)
    const incoming = this.db
      .prepare(`
      SELECT r.relation, r.description, e.id, e.name, e.type, e.description as target_desc
      FROM relations r
      JOIN entities e ON r.source_id = e.id
      WHERE r.target_id = ?
    `)
      .all(entityId) as any[];

    return [
      ...outgoing.map((row) => ({
        relation: row.relation,
        target: {
          id: row.id,
          name: row.name,
          type: row.type,
          description: row.target_desc,
          updated_at: 0,
        },
        description: row.description,
        direction: "outgoing",
      })),
      ...incoming.map((row) => ({
        relation: `(inverse) ${row.relation}`,
        target: {
          id: row.id,
          name: row.name,
          type: row.type,
          description: row.target_desc,
          updated_at: 0,
        },
        description: row.description,
        direction: "incoming",
      })),
    ];
  }

  /**
   * Retrieves specific entity details and their immediate connections suitable for context injection
   */
  getGraphContext(entityNames: string[]): string {
    const lines: string[] = [];

    for (const name of entityNames) {
      const entity = this.findEntityByName(name);
      if (!entity) continue;

      lines.push(`Entity: ${entity.name} (${entity.type})`);
      if (entity.description) lines.push(`  Description: ${entity.description}`);

      const relations = this.getRelationsForEntity(entity.id);
      if (relations.length > 0) {
        lines.push(`  Connections:`);
        for (const rel of relations) {
          lines.push(
            `    - ${rel.relation} -> ${rel.target.name} (${rel.target.type}) ${rel.description ? `NOTE: ${rel.description}` : ""}`,
          );
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  getWholeGraph(): { nodes: GraphEntity[]; edges: GraphRelation[] } {
    const nodes = this.db.prepare("SELECT * FROM entities").all() as GraphEntity[];
    const edges = this.db.prepare("SELECT * FROM relations").all() as GraphRelation[];
    return { nodes, edges };
  }
}
