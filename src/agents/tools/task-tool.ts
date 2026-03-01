import { Type } from "@sinclair/typebox";
import { type AnyAgentTool, jsonResult, readStringParam, readNumberParam } from "./common.js";
import { taskManager } from "../../gateway/task-manager.js";

const TaskUpdateSchema = Type.Object({
    action: Type.Enum({
        create: "create",
        update: "update",
    } as const),
    id: Type.Optional(Type.String({ description: "ID da tarefa (obrigatório para update)." })),
    name: Type.Optional(Type.String({ description: "Nome legível da tarefa (obrigatório para create)." })),
    status: Type.Optional(Type.Enum({
        pending: "pending",
        running: "running",
        done: "done",
        failed: "failed",
    } as const)),
    progress: Type.Optional(Type.Number({ description: "Progresso de 0 a 100.", minimum: 0, maximum: 100 })),
    message: Type.Optional(Type.String({ description: "Mensagem de status ou resultado/erro." })),
});

export function createTaskTool(opts: { agentSessionKey: string }): AnyAgentTool {
    return {
        label: "Task Progress",
        name: "task_progress",
        description: "Gerencia a visibilidade de progresso de tarefas longas no TaskBoard do usuário. Use para reportar status de missões complexas.",
        parameters: TaskUpdateSchema,
        execute: async (_toolCallId, args) => {
            const params = args as Record<string, unknown>;
            const action = readStringParam(params, "action", { required: true });

            if (action === "create") {
                const name = readStringParam(params, "name", { required: true });
                const task = taskManager.createTask({
                    sessionKey: opts.agentSessionKey,
                    name,
                });
                return jsonResult({ id: task.id, status: task.status });
            }

            if (action === "update") {
                const id = readStringParam(params, "id", { required: true });
                const status = readStringParam(params, "status") as any;
                const progress = readNumberParam(params, "progress");
                const message = readStringParam(params, "message");

                const patch: any = {};
                if (status) patch.status = status;
                if (progress !== undefined) patch.progress = progress;
                if (message) {
                    if (status === "failed") patch.error = message;
                    else patch.result = message;
                }

                const task = taskManager.updateTask(id, patch);
                if (!task) return jsonResult({ error: "Tarefa não encontrada." });
                return jsonResult({ id: task.id, status: task.status, progress: task.progress });
            }

            return jsonResult({ error: "Ação inválida." });
        },
    };
}
