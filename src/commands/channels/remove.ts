import { resolveChannelDefaultAccountId } from "../../channels/plugins/helpers.js";
import {
  getChannelPlugin,
  listChannelPlugins,
  normalizeChannelId,
} from "../../channels/plugins/index.js";
import { type ZEROConfig, writeConfigFile } from "../../config/config.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../routing/session-key.js";
import { defaultRuntime, type RuntimeEnv } from "../../runtime.js";
import { createClackPrompter } from "../../wizard/clack-prompter.js";
import { type ChatChannel, channelLabel, requireValidConfig, shouldUseWizard } from "./shared.js";

export type ChannelsRemoveOptions = {
  channel?: string;
  account?: string;
  delete?: boolean;
};

function listAccountIds(cfg: ZEROConfig, channel: ChatChannel): string[] {
  const plugin = getChannelPlugin(channel);
  if (!plugin) return [];
  return plugin.config.listAccountIds(cfg);
}

export async function channelsRemoveCommand(
  opts: ChannelsRemoveOptions,
  runtime: RuntimeEnv = defaultRuntime,
  params?: { hasFlags?: boolean },
) {
  const cfg = await requireValidConfig(runtime);
  if (!cfg) return;

  const useWizard = shouldUseWizard(params);
  const prompter = useWizard ? createClackPrompter() : null;
  let channel: ChatChannel | null = normalizeChannelId(opts.channel);
  let accountId = normalizeAccountId(opts.account);
  const deleteConfig = Boolean(opts.delete);

  if (useWizard && prompter) {
    await prompter.intro("Remover conta de canal");
    const selectedChannel = (await prompter.select({
      message: "Canal",
      options: listChannelPlugins().map((plugin) => ({
        value: plugin.id,
        label: plugin.meta.label,
      })),
    })) as ChatChannel;
    channel = selectedChannel;

    accountId = await (async () => {
      const ids = listAccountIds(cfg, selectedChannel);
      const choice = (await prompter.select({
        message: "Conta",
        options: ids.map((id) => ({
          value: id,
          label: id === DEFAULT_ACCOUNT_ID ? "padrão (principal)" : id,
        })),
        initialValue: ids[0] ?? DEFAULT_ACCOUNT_ID,
      })) as string;
      return normalizeAccountId(choice);
    })();

    const wantsDisable = await prompter.confirm({
      message: `Desativar conta do ${channelLabel(selectedChannel)} "${accountId}"? (mantém a configuração)`,
      initialValue: true,
    });
    if (!wantsDisable) {
      await prompter.outro("Cancelado.");
      return;
    }
  } else {
    if (!channel) {
      runtime.error("O canal é obrigatório. Use --channel <nome>.");
      runtime.exit(1);
      return;
    }
    if (!deleteConfig) {
      const confirm = createClackPrompter();
      const ok = await confirm.confirm({
        message: `Desativar conta do ${channelLabel(channel)} "${accountId}"? (mantém a configuração)`,
        initialValue: true,
      });
      if (!ok) {
        return;
      }
    }
  }

  const plugin = getChannelPlugin(channel);
  if (!plugin) {
    runtime.error(`Canal desconhecido: ${channel}`);
    runtime.exit(1);
    return;
  }

  const resolvedAccountId =
    normalizeAccountId(accountId) ?? resolveChannelDefaultAccountId({ plugin, cfg });
  const accountKey = resolvedAccountId || DEFAULT_ACCOUNT_ID;

  let next = { ...cfg };
  if (deleteConfig) {
    if (!plugin.config.deleteAccount) {
      runtime.error(`O canal ${channel} não suporta exclusão.`);
      runtime.exit(1);
      return;
    }
    next = plugin.config.deleteAccount({
      cfg: next,
      accountId: resolvedAccountId,
    });
  } else {
    if (!plugin.config.setAccountEnabled) {
      runtime.error(`O canal ${channel} não suporta desativação.`);
      runtime.exit(1);
      return;
    }
    next = plugin.config.setAccountEnabled({
      cfg: next,
      accountId: resolvedAccountId,
      enabled: false,
    });
  }

  await writeConfigFile(next);
  if (useWizard && prompter) {
    await prompter.outro(
      deleteConfig
        ? `Conta do ${channelLabel(channel)} "${accountKey}" excluída.`
        : `Conta do ${channelLabel(channel)} "${accountKey}" desativada.`,
    );
  } else {
    runtime.log(
      deleteConfig
        ? `Conta do ${channelLabel(channel)} "${accountKey}" excluída.`
        : `Conta do ${channelLabel(channel)} "${accountKey}" desativada.`,
    );
  }
}
