
import {
    type HookStatusReport,
    type HooksListOptions,
    type HookStatusEntry,
    type HookInfoOptions,
    type HooksCheckOptions,
} from "./types.js";
import { renderTable } from "../../terminal/table.js";
import { theme } from "../../terminal/theme.js";
export function formatHookStatus(hook: HookStatusEntry): string {
    if (hook.active) return theme.success("✓ pronto");
    if (!hook.enabled) return theme.warn("⏸ desativado");
    return theme.error("✗ ausente");
}

export function formatHookName(hook: HookStatusEntry): string {
    const emoji = (hook as any).emoji ?? "🔗";
    return `${emoji} ${theme.command(hook.name)}`;
}

export function formatHookSource(hook: HookStatusEntry): string {
    if (!(hook as any).managedByPlugin) return hook.source;
    return `plugin:${(hook as any).pluginId ?? "desconhecido"}`;
}

export function formatHookMissingSummary(hook: HookStatusEntry): string {
    const missingArr: string[] = [];
    const h = hook as any;
    if (h.missing?.bins?.length > 0) missingArr.push(`binários: ${h.missing.bins.join(", ")}`);
    if (h.missing?.env?.length > 0) missingArr.push(`ambiente: ${h.missing.env.join(", ")}`);
    return missingArr.join("; ");
}

export function formatHooksList(report: HookStatusReport, opts: HooksListOptions): string {
    if (opts.json) return JSON.stringify(report, null, 2);
    const hooks = report.entries;
    if (hooks.length === 0) return "Nenhum hook encontrado.";

    const rows = hooks.map((hook) => ({
        Status: formatHookStatus(hook),
        Hook: formatHookName(hook),
        Description: theme.muted(hook.description || ""),
        Source: formatHookSource(hook),
    }));

    const columns = [
        { key: "Status", header: "Status", minWidth: 10 },
        { key: "Hook", header: "Hook", minWidth: 18, flex: true },
        { key: "Description", header: "Descrição", minWidth: 24, flex: true },
        { key: "Source", header: "Fonte", minWidth: 12, flex: true },
    ];

    return renderTable({ columns, rows });
}

export function formatHookInfo(report: HookStatusReport, hookName: string, opts: HookInfoOptions): string {
    const hook = report.entries.find((h) => h.name === hookName);
    if (!hook) return `Hook "${hookName}" não encontrado.`;
    if (opts.json) return JSON.stringify(hook, null, 2);

    const lines = [
        `${formatHookName(hook)} ${formatHookStatus(hook)}`,
        "",
        hook.description || "N/A",
        "",
        `${theme.heading("Detalhes:")}`,
        `${theme.muted("  Fonte:")} ${formatHookSource(hook)}`,
    ];
    return lines.join("\n");
}

export function formatHooksCheck(report: HookStatusReport, opts: HooksCheckOptions): string {
    if (opts.json) return JSON.stringify(report.summary, null, 2);
    return `Status dos Hooks: ${report.summary.active}/${report.summary.total} ativos.`;
}
