import { getChannelPlugin, listChannelPlugins } from "../channels/plugins/index.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { ZEROConfig } from "../config/config.js";
import { CONFIG_PATH_ZERO } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { shortenHomePath } from "../utils.js";
import { confirm, select } from "./configure.shared.js";
import { guardCancel } from "./onboard-helpers.js";

export async function removeChannelConfigWizard(
  cfg: ZEROConfig,
  runtime: RuntimeEnv,
): Promise<ZEROConfig> {
  let next = { ...cfg };

  const listConfiguredChannels = () =>
    listChannelPlugins()
      .map((plugin) => plugin.meta)
      .filter((meta) => next.channels?.[meta.id] !== undefined);

  while (true) {
    const configured = listConfiguredChannels();
    if (configured.length === 0) {
      note(
        [
          "Nenhuma configuração de canal encontrada em zero.json.",
          `Dica: \`${formatCliCommand("zero channels status")}\` mostra o que está configurado e ativado.`,
        ].join("\n"),
        "Remover canal",
      );
      return next;
    }

    const channel = guardCancel(
      await select({
        message: "Remover qual configuração de canal?",
        options: [
          ...configured.map((meta) => ({
            value: meta.id,
            label: meta.label,
            hint: "Exclui tokens + configurações (as credenciais permanecem no disco)",
          })),
          { value: "done", label: "Concluído" },
        ],
      }),
      runtime,
    ) as string;

    if (channel === "done") return next;

    const label = getChannelPlugin(channel)?.meta.label ?? channel;
    const confirmed = guardCancel(
      await confirm({
        message: `Excluir a configuração de ${label} de ${shortenHomePath(CONFIG_PATH_ZERO)}?`,
        initialValue: false,
      }),
      runtime,
    );
    if (!confirmed) continue;

    const nextChannels: Record<string, unknown> = { ...next.channels };
    delete nextChannels[channel];
    next = {
      ...next,
      channels: Object.keys(nextChannels).length
        ? (nextChannels as ZEROConfig["channels"])
        : undefined,
    };

    note(
      [
        `${label} removido da configuração.`,
        "Nota: credenciais/sessões no disco permanecem inalteradas.",
      ].join("\n"),
      "Canal removido",
    );
  }
}
