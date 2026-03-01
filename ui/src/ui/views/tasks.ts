import { html } from "lit";
import { icons } from "../icons";
import { t } from "../i18n";

export interface TaskRecord {
    id: string;
    sessionKey: string;
    name: string;
    status: "pending" | "running" | "done" | "failed";
    progress: number;
    result?: string;
    error?: string;
    createdAt: number;
    updatedAt: number;
}

export type TasksProps = {
    loading: boolean;
    tasks: TaskRecord[];
    onRefresh: () => void;
};

export function renderTasks(props: TasksProps) {
    const columns = {
        pending: props.tasks.filter((t) => t.status === "pending"),
        running: props.tasks.filter((t) => t.status === "running"),
        completed: props.tasks.filter((t) => t.status === "done" || t.status === "failed"),
    };

    return html`
    <div class="task-board animate-fade-in">
      <div class="tb-header">
        <div class="tb-header__title">
            <div class="tb-header__main">${t("tasks.board.title" as any)}</div>
            <div class="tb-header__sub">${t("tasks.board.subtitle" as any)}</div>
        </div>
        <button class="btn btn--glass" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${icons.rotateCcw} ${t("tasks.board.refresh" as any)}
        </button>
      </div>

      <div class="tb-grid">
        <!-- Col: Pending -->
        <div class="tb-col">
          <div class="tb-col__header">
            <span class="status-dot status-dot--pending"></span>
            ${t("tasks.status.pending" as any)}
            <span class="tb-count">${columns.pending.length}</span>
          </div>
          <div class="tb-col__content">
            ${columns.pending.map((task) => renderTaskCard(task))}
            ${columns.pending.length === 0 ? html`<div class="tb-empty">${t("tasks.empty.pending" as any)}</div>` : ""}
          </div>
        </div>

        <!-- Col: Running -->
        <div class="tb-col">
          <div class="tb-col__header">
            <span class="status-dot status-dot--running"></span>
            ${t("tasks.status.running" as any)}
            <span class="tb-count">${columns.running.length}</span>
          </div>
          <div class="tb-col__content">
            ${columns.running.map((task) => renderTaskCard(task))}
             ${columns.running.length === 0 ? html`<div class="tb-empty">${t("tasks.empty.running" as any)}</div>` : ""}
          </div>
        </div>

        <!-- Col: Completed -->
        <div class="tb-col">
          <div class="tb-col__header">
            <span class="status-dot status-dot--done"></span>
            ${t("tasks.status.completed" as any)}
            <span class="tb-count">${columns.completed.length}</span>
          </div>
          <div class="tb-col__content">
            ${columns.completed.map((task) => renderTaskCard(task))}
             ${columns.completed.length === 0 ? html`<div class="tb-empty">${t("tasks.empty.completed" as any)}</div>` : ""}
          </div>
        </div>
      </div>

      <style>
        .task-board {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .tb-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tb-header__main {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }
        .tb-header__sub {
            font-size: 14px;
            color: var(--text-dim);
            margin-top: 4px;
        }
        .tb-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          flex: 1;
          min-height: 0;
        }
        .tb-col {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-subtle);
          overflow: hidden;
        }
        .tb-col__header {
          padding: 16px 20px;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--border-subtle);
        }
        .tb-count {
            margin-left: auto;
            background: rgba(255, 255, 255, 0.08);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            color: var(--text-dim);
        }
        .tb-col__content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          flex: 1;
        }
        .tb-card {
          background: var(--surface-glass);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
          cursor: default;
        }
        .tb-card:hover {
            border-color: var(--accent-blue-semi);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .tb-card__name {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .tb-card__meta {
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
        }
        .tb-progress {
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .tb-progress-fill {
          height: 100%;
          background: var(--accent-blue);
          transition: width 0.4s ease;
        }
        .tb-card__footer {
          font-size: 12px;
          line-height: 1.4;
        }
        .tb-card--failed {
            border-left: 3px solid var(--danger);
        }
        .tb-card--done {
            border-left: 3px solid var(--success);
        }
        .tb-empty {
            text-align: center;
            color: var(--text-dim);
            padding: 40px 20px;
            font-size: 13px;
            border: 1px dashed var(--border-subtle);
            border-radius: 12px;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .status-dot--pending { background: #ffcc00; }
        .status-dot--running { background: #007aff; box-shadow: 0 0 8px #007aff; }
        .status-dot--done { background: #34c759; }
      </style>
    </div>
  `;
}

function renderTaskCard(task: TaskRecord) {
    const isFailed = task.status === "failed";
    const isDone = task.status === "done";

    return html`
    <div class="tb-card ${isFailed ? "tb-card--failed" : ""} ${isDone ? "tb-card--done" : ""}">
      <div class="tb-card__name">${task.name}</div>
      <div class="tb-card__meta">
        <span>Session: ${task.sessionKey.slice(0, 8)}...</span>
        <span>${new Date(task.updatedAt).toLocaleTimeString()}</span>
      </div>
      <div class="tb-progress">
        <div class="tb-progress-fill" style="width: ${task.progress}%"></div>
      </div>
      <div class="tb-card__footer">
        ${isFailed ? html`<span style="color: var(--danger)">${task.error || "Erro desconhecido"}</span>` :
            task.result ? html`<span style="color: var(--text-dim)">${task.result}</span>` :
                html`<span style="color: var(--accent-blue)">${task.status === 'running' ? `Executando (${task.progress}%)` : 'Aguardando...'}</span>`}
      </div>
    </div>
  `;
}
