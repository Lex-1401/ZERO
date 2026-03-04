
import { Type } from "@sinclair/typebox";

export const NODES_TOOL_ACTIONS = [
    "approve",
    "reject",
    "notify",
    "camera_snap",
    "camera_list",
    "camera_clip",
    "screen_record",
    "screen_snap",
    "ui_scan",
    "location_get",
    "run",
] as const;

export const NodesToolSchema = Type.Object({
    action: Type.String(),
    node: Type.Optional(Type.String()),
    command: Type.Optional(Type.Array(Type.String())),
});
