import { randomUUID } from "node:crypto";

export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface TaskRecord {
  id: string;
  sessionKey: string;
  name: string;
  status: TaskStatus;
  progress: number;
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

class TaskManager {
  private tasks = new Map<string, TaskRecord>();

  createTask(params: { sessionKey: string; name: string }): TaskRecord {
    const task: TaskRecord = {
      id: randomUUID(),
      sessionKey: params.sessionKey,
      name: params.name,
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(id: string, patch: Partial<Omit<TaskRecord, "id" | "createdAt" | "sessionKey">>) {
    const current = this.tasks.get(id);
    if (!current) return;
    const next = { ...current, ...patch, updatedAt: Date.now() };
    this.tasks.set(id, next);
    return next;
  }

  getTask(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  listTasks(sessionKey?: string): TaskRecord[] {
    const all = Array.from(this.tasks.values());
    if (sessionKey) {
      return all.filter((t) => t.sessionKey === sessionKey);
    }
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  clearOldTasks(maxAgeMs = 1000 * 60 * 60 * 24) {
    const now = Date.now();
    for (const [id, task] of this.tasks.entries()) {
      if (now - task.updatedAt > maxAgeMs) {
        this.tasks.delete(id);
      }
    }
  }
}

export const taskManager = new TaskManager();
