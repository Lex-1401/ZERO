import fs from "node:fs/promises";
import path from "node:path";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

const DOCS_DIR = path.resolve(process.cwd(), "docs");

export const docsHandlers: GatewayRequestHandlers = {
  "docs.list": async ({ respond }) => {
    try {
      const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
      const docs = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
        .map((e) => ({
          id: e.name,
          name: e.name.replace(".md", "").replace(/_/g, " "),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      respond(true, { docs });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `Failed to list docs: ${String(err)}`),
      );
    }
  },

  "docs.get": async ({ params, respond }) => {
    const id = params.id as string;
    if (!id || typeof id !== "string") {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "Missing or invalid doc id"),
      );
      return;
    }

    // Security check: ensure the path is within the docs directory
    const filePath = path.join(DOCS_DIR, id);
    if (!filePath.startsWith(DOCS_DIR)) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Access denied"));
      return;
    }

    try {
      const content = await fs.readFile(filePath, "utf8");
      respond(true, { id, content });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `Failed to read doc: ${String(err)}`),
      );
    }
  },
};
