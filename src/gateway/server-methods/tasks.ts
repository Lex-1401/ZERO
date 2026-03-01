import { taskManager } from "../task-manager.js";
import type { GatewayRequestHandlers } from "./types.js";

export const tasksHandlers: GatewayRequestHandlers = {
    "tasks.list": async ({ params, respond }) => {
        const sessionKey = params.sessionKey ? String(params.sessionKey) : undefined;
        const tasks = taskManager.listTasks(sessionKey);
        respond(true, tasks);
    },
};
