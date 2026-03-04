// @ts-nocheck
import { Command } from "commander";
import { buildHooksReport, enableHook, disableHook } from "./core.js";
import { formatHooksList, formatHookInfo, formatHooksCheck } from "./formatter.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";

export function registerHooksSubcommands(hooks: Command) {
    hooks
        .command("list")
        .description("Listar todos os hooks")
        .option("--eligible", "Mostrar apenas hooks elegíveis", false)
        .option("--json", "Saída como JSON", false)
        .option("-v, --verbose", "Mostrar mais detalhes incluindo requisitos ausentes", false)
        .action(async (opts) => {
            try {
                const { loadConfig } = await import("../../config/io.js");
                const config = loadConfig();
                const report = buildHooksReport(config);
                defaultRuntime.log(formatHooksList(report, opts));
            } catch (err: any) {
                defaultRuntime.error(`${theme.error("Erro:")} ${err.message}`);
                process.exit(1);
            }
        });

    hooks
        .command("info <name>")
        .description("Mostrar informações detalhadas sobre um hook")
        .option("--json", "Saída como JSON", false)
        .action(async (name, opts) => {
            try {
                const { loadConfig } = await import("../../config/io.js");
                const config = loadConfig();
                const report = buildHooksReport(config);
                defaultRuntime.log(formatHookInfo(report, name, opts));
            } catch (err: any) {
                defaultRuntime.error(`${theme.error("Erro:")} ${err.message}`);
                process.exit(1);
            }
        });

    hooks
        .command("check")
        .description("Verificar status de elegibilidade dos hooks")
        .option("--json", "Saída como JSON", false)
        .action(async (opts) => {
            try {
                const { loadConfig } = await import("../../config/io.js");
                const config = loadConfig();
                const report = buildHooksReport(config);
                defaultRuntime.log(formatHooksCheck(report, opts));
            } catch (err: any) {
                defaultRuntime.error(`${theme.error("Erro:")} ${err.message}`);
                process.exit(1);
            }
        });

    hooks
        .command("enable <name>")
        .description("Ativar um hook")
        .action(async (name) => {
            try {
                await enableHook(name);
            } catch (err: any) {
                defaultRuntime.error(`${theme.error("Erro:")} ${err.message}`);
                process.exit(1);
            }
        });

    hooks
        .command("disable <name>")
        .description("Desativar um hook")
        .action(async (name) => {
            try {
                await disableHook(name);
            } catch (err: any) {
                defaultRuntime.error(`${theme.error("Erro:")} ${err.message}`);
                process.exit(1);
            }
        });
}
