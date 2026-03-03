import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export type GraphEntity = {
  id: string;
  name: string;
  type: string;
  description?: string;
  updated_at: number;
  x?: number;
  y?: number;
};

export type GraphRelation = {
  source_id: string;
  target_id: string;
  relation: string;
  description?: string;
  updated_at: number;
};

export class KnowledgeGraph {
  constructor(private db: DatabaseSync) {
    this.ensureSchema();
  }

  private ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL,
        x REAL,
        y REAL
      );
      CREATE TABLE IF NOT EXISTS relations (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (source_id, target_id, relation),
        FOREIGN KEY (source_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
    `);
  }

  addEntity(params: {
    name: string;
    type: string;
    description?: string;
    id?: string;
    x?: number;
    y?: number;
  }) {
    const id = params.id || randomUUID();
    const now = Date.now();
    this.db
      .prepare(`
      INSERT INTO entities (id, name, type, description, updated_at, x, y)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        description = excluded.description,
        updated_at = excluded.updated_at,
        x = COALESCE(excluded.x, entities.x),
        y = COALESCE(excluded.y, entities.y)
    `)
      .run(
        id,
        params.name,
        params.type,
        params.description || null,
        now,
        params.x ?? null,
        params.y ?? null,
      );
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
