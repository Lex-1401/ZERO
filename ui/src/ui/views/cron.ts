import { html, nothing } from "lit";

import { formatMs } from "../format";
import {
  formatCronPayload,
  formatCronSchedule,
  formatCronState,
  formatNextRun,
} from "../presenter";
import type { ChannelUiMetaEntry, CronJob, CronRunLogEntry, CronStatus } from "../types";
import { icons } from "../icons";
import type { CronFormState } from "../ui-types";

export type CronProps = {
  loading: boolean;
  status: CronStatus | null;
  jobs: CronJob[];
  error: string | null;
  busy: boolean;
  form: CronFormState;
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];
  runsJobId: string | null;
  runs: CronRunLogEntry[];
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
};

function buildChannelOptions(props: CronProps): string[] {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.channel?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  const seen = new Set<string>();
  return options.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function resolveChannelLabel(props: CronProps, channel: string): string {
  if (channel === "last") return "último";
  const meta = props.channelMeta?.find((entry) => entry.id === channel);
  if (meta?.label) return meta.label;
  return props.channelLabels?.[channel] ?? channel;
}

export function renderCron(props: CronProps) {
  const channelOptions = buildChannelOptions(props);

  return html`
    <div class="animate-fade-in">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;">
            
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                    <div class="section-title" style="margin: 0;">Agendador Central</div>
                    <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
                        ${icons.rotateCcw} Atualizar
                    </button>
                </div>
                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Integridade</div>
                            <div class="group-desc">${props.status?.enabled ? "Ativo" : "Inativo"}</div>
                        </div>
                        <div class="group-content">
                            <div class="status-orb ${props.status?.enabled ? "success" : "danger"}"></div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Processos</div>
                            <div class="group-desc">Total de tarefas agendadas.</div>
                        </div>
                        <div class="group-content">
                            <div class="badge">${props.status?.jobs ?? 0}</div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Próxima Ativação</div>
                            <div class="group-desc">${formatNextRun(props.status?.nextWakeAtMs ?? null)}</div>
                        </div>
                    </div>
                </div>

                <div class="section-title">Nova Configuração</div>
                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Nome Identificador</div>
                        </div>
                        <div class="group-content">
                            <input class="input-native" style="width: 240px;" .value=${props.form.name} @input=${(e: Event) => props.onFormChange({ name: (e.target as HTMLInputElement).value })} />
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">ID do Agente</div>
                        </div>
                        <div class="group-content">
                            <input class="input-native" style="width: 240px;" .value=${props.form.agentId} placeholder="default" @input=${(e: Event) => props.onFormChange({ agentId: (e.target as HTMLInputElement).value })} />
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Estado</div>
                        </div>
                        <div class="group-content">
                            <label class="toggle-switch">
                                <input type="checkbox" .checked=${props.form.enabled} @change=${(e: Event) => props.onFormChange({ enabled: (e.target as HTMLInputElement).checked })} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Tipo de Gatilho</div>
                        </div>
                        <div class="group-content">
                            <select class="select-native" style="width: 240px;" .value=${props.form.scheduleKind} @change=${(e: Event) => props.onFormChange({ scheduleKind: (e.target as HTMLSelectElement).value as any })}>
                                <option value="every">A cada</option>
                                <option value="at">Em específico</option>
                                <option value="cron">Expressão Cron</option>
                            </select>
                        </div>
                    </div>
                    ${renderScheduleFields(props)}
                </div>

                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Sessão Alvo</div>
                        </div>
                        <div class="group-content">
                            <select class="select-native" style="width: 240px;" .value=${props.form.sessionTarget} @change=${(e: Event) => props.onFormChange({ sessionTarget: (e.target as HTMLSelectElement).value as any })}>
                                <option value="main">Principal</option>
                                <option value="isolated">Isolada</option>
                            </select>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Carga Útil</div>
                        </div>
                        <div class="group-content">
                            <select class="select-native" style="width: 240px;" .value=${props.form.payloadKind} @change=${(e: Event) => props.onFormChange({ payloadKind: (e.target as HTMLSelectElement).value as any })}>
                                <option value="systemEvent">Evento de Sistema</option>
                                <option value="agentTurn">Turno de Agente</option>
                            </select>
                        </div>
                    </div>
                    <div class="group-item" style="flex-direction: column; align-items: start; gap: 8px;">
                        <div class="group-title">${props.form.payloadKind === "systemEvent" ? "Texto da Telemetria" : "Mensagem do Agente"}</div>
                        <textarea class="textarea-native" style="width: 100%;" .value=${props.form.payloadText} @input=${(e: Event) => props.onFormChange({ payloadText: (e.target as HTMLTextAreaElement).value })}></textarea>
                    </div>
                </div>

                <button class="btn primary" style="width: 100%; height: 32px;" ?disabled=${props.busy} @click=${props.onAdd}>
                    ${props.busy ? "Provisionando…" : "Provisionar Nova Tarefa"}
                </button>
            </div>

            <div>
                <div class="section-title">Fila de Agendamentos</div>
                <div class="group-list">
                    ${props.jobs.length === 0 ? html`
                        <div class="group-item" style="padding: 40px; justify-content: center; color: var(--text-dim);">Vazio</div>
                    ` : props.jobs.map(job => renderJob(job, props))}
                </div>

                <div class="section-title">Histórico de Ativações</div>
                <div class="group-list">
                    ${props.runsJobId == null ? html`
                        <div class="group-item" style="padding: 40px; justify-content: center; color: var(--text-dim);">Selecione uma tarefa</div>
                    ` : props.runs.length === 0 ? html`
                        <div class="group-item" style="padding: 40px; justify-content: center; color: var(--text-dim);">Sem execuções</div>
                    ` : props.runs.map(entry => renderRun(entry))}
                </div>
            </div>

        </div>

    </div>
  `;
}

function renderScheduleFields(props: CronProps) {
  const form = props.form;
  if (form.scheduleKind === "at") {
    return html`
      <div class="group-item">
        <div class="group-label"><div class="group-title">Momento</div></div>
        <div class="group-content">
            <input class="input-native" style="width: 240px;" type="datetime-local" .value=${form.scheduleAt} @input=${(e: Event) => props.onFormChange({ scheduleAt: (e.target as HTMLInputElement).value })} />
        </div>
      </div>
    `;
  }
  if (form.scheduleKind === "every") {
    return html`
      <div class="group-item">
        <div class="group-label"><div class="group-title">Periodicidade</div></div>
        <div class="group-content" style="gap: 8px;">
            <input class="input-native" style="width: 100px;" .value=${form.everyAmount} @input=${(e: Event) => props.onFormChange({ everyAmount: (e.target as HTMLInputElement).value })} />
            <select class="select-native" style="width: 132px;" .value=${form.everyUnit} @change=${(e: Event) => props.onFormChange({ everyUnit: (e.target as HTMLSelectElement).value as any })}>
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
            </select>
        </div>
      </div>
    `;
  }
  return html`
    <div class="group-item">
      <div class="group-label"><div class="group-title">Definição Cron</div></div>
      <div class="group-content">
          <input class="input-native" style="width: 240px;" .value=${form.cronExpr} placeholder="0 0 * * *" @input=${(e: Event) => props.onFormChange({ cronExpr: (e.target as HTMLInputElement).value })} />
      </div>
    </div>
  `;
}

function renderJob(job: CronJob, props: CronProps) {
  const isSelected = props.runsJobId === job.id;
  return html`
    <div class="group-item" style="cursor: pointer; ${isSelected ? "background: rgba(0,122,255,0.05);" : ""}" @click=${() => props.onLoadRuns(job.id)}>
      <div class="group-label">
        <div class="group-title" style="display: flex; align-items: center; gap: 8px;">
            <div class="status-orb ${job.enabled ? "success" : "dim"}"></div>
            ${job.name}
        </div>
        <div class="group-desc">${formatCronSchedule(job)}</div>
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">${formatCronPayload(job)}</div>
      </div>
      <div class="group-content" style="flex-direction: column; align-items: flex-end; gap: 6px;">
        <div style="font-size: 11px; font-weight: 700;">${formatCronState(job)}</div>
        <div style="display: flex; gap: 4px;">
            <button class="btn btn--icon btn--sm" title="Executar Agora" @click=${(e: Event) => { e.stopPropagation(); props.onRun(job); }}>${icons.play}</button>
            <button class="btn btn--icon btn--sm ${job.enabled ? "danger" : ""}" title="${job.enabled ? "Inativar" : "Ativar"}" @click=${(e: Event) => { e.stopPropagation(); props.onToggle(job, !job.enabled); }}>${job.enabled ? icons.pause : icons.playCircle}</button>
            <button class="btn btn--icon btn--sm danger" title="Remover" @click=${(e: Event) => { e.stopPropagation(); props.onRemove(job); }}>${icons.trash}</button>
        </div>
      </div>
    </div>
  `;
}

function renderRun(entry: CronRunLogEntry) {
  return html`
    <div class="group-item">
      <div class="group-label">
        <div class="group-title">${entry.status}</div>
        <div class="group-desc">${entry.summary ?? "Sem detalhes."}</div>
      </div>
      <div class="group-content" style="flex-direction: column; align-items: flex-end; gap: 2px;">
        <div style="font-size: 11px; font-weight: 700;">${formatMs(entry.ts)}</div>
        <div style="font-size: 10px; color: var(--text-dim);">${entry.durationMs ?? 0}ms</div>
      </div>
    </div>
  `;
}
