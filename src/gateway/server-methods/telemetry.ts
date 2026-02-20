import { telemetry } from "../../infra/telemetry.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const telemetryHandlers: GatewayRequestHandlers = {
  "telemetry.summary": async ({ respond }) => {
    try {
      const summary = telemetry.getSummary();
      respond(true, summary);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
