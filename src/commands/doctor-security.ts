import { resolveChannelDefaultAccountId } from "../channels/plugins/helpers.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import type { ChannelId } from "../channels/plugins/types.js";
import type { ZEROConfig } from "../config/config.js";
import { readChannelAllowFromStore } from "../pairing/pairing-store.js";
import { note } from "../terminal/note.js";
import { formatCliCommand } from "../cli/command-format.js";

export async function noteSecurityWarnings(cfg: ZEROConfig) {
  const warnings: string[] = [];
  const auditHint = `- Execute: ${formatCliCommand("zero security audit --deep")}`;

  // Security by Design: Root check
  if (process.getuid?.() === 0) {
    warnings.push(
      `- ALERTA: Rodando como ROOT. Isso viola o princípio de least privilege e compromete a integridade do sistema.`,
    );
  }

  const warnDmPolicy = async (params: {
    label: string;
    provider: ChannelId;
    dmPolicy: string;
    allowFrom?: Array<string | number> | null;
    policyPath?: string;
    allowFromPath: string;
    approveHint: string;
    normalizeEntry?: (raw: string) => string;
  }) => {
    const dmPolicy = params.dmPolicy;
    const policyPath = params.policyPath ?? `${params.allowFromPath}policy`;
    const configAllowFrom = (params.allowFrom ?? []).map((v) => String(v).trim());
    const hasWildcard = configAllowFrom.includes("*");
    const storeAllowFrom = await readChannelAllowFromStore(params.provider).catch(() => []);
    const normalizedCfg = configAllowFrom
      .filter((v) => v !== "*")
      .map((v) => (params.normalizeEntry ? params.normalizeEntry(v) : v))
      .map((v) => v.trim())
      .filter(Boolean);
    const normalizedStore = storeAllowFrom
      .map((v) => (params.normalizeEntry ? params.normalizeEntry(v) : v))
      .map((v) => v.trim())
      .filter(Boolean);
    const allowCount = Array.from(new Set([...normalizedCfg, ...normalizedStore])).length;
    const dmScope = cfg.session?.dmScope ?? "main";
    const isMultiUserDm = hasWildcard || allowCount > 1;

    if (dmPolicy === "open") {
      const allowFromPath = `${params.allowFromPath}allowFrom`;
      warnings.push(
        `- DMs do ${params.label}: ABERTAS (${policyPath}="open"). Qualquer um pode enviar DMs.`,
      );
      if (!hasWildcard) {
        warnings.push(
          `- DMs do ${params.label}: configuração inválida — "open" requer que ${allowFromPath} inclua "*".`,
        );
      }
    }

    if (dmPolicy === "disabled") {
      warnings.push(`- DMs do ${params.label}: desativadas (${policyPath}="disabled").`);
      return;
    }

    if (dmPolicy !== "open" && allowCount === 0) {
      warnings.push(
        `- DMs do ${params.label}: bloqueadas (${policyPath}="${dmPolicy}") sem lista branca; remetentes desconhecidos serão bloqueados / receberão um código de pareamento.`,
      );
      warnings.push(`  ${params.approveHint}`);
    }

    if (dmScope === "main" && isMultiUserDm) {
      warnings.push(
        `- DMs do ${params.label}: múltiplos remetentes compartilham a sessão principal; defina session.dmScope="per-channel-peer" para isolar as sessões.`,
      );
    }
  };

  for (const plugin of listChannelPlugins()) {
    if (!plugin.security) continue;
    const accountIds = plugin.config.listAccountIds(cfg);
    const defaultAccountId = resolveChannelDefaultAccountId({
      plugin,
      cfg,
      accountIds,
    });
    const account = plugin.config.resolveAccount(cfg, defaultAccountId);
    const enabled = plugin.config.isEnabled ? plugin.config.isEnabled(account, cfg) : true;
    if (!enabled) continue;
    const configured = plugin.config.isConfigured
      ? await plugin.config.isConfigured(account, cfg)
      : true;
    if (!configured) continue;
    const dmPolicy = plugin.security.resolveDmPolicy?.({
      cfg,
      accountId: defaultAccountId,
      account,
    });
    if (dmPolicy) {
      await warnDmPolicy({
        label: plugin.meta.label ?? plugin.id,
        provider: plugin.id,
        dmPolicy: dmPolicy.policy,
        allowFrom: dmPolicy.allowFrom,
        policyPath: dmPolicy.policyPath,
        allowFromPath: dmPolicy.allowFromPath,
        approveHint: dmPolicy.approveHint,
        normalizeEntry: dmPolicy.normalizeEntry,
      });
    }
    if (plugin.security.collectWarnings) {
      const extra = await plugin.security.collectWarnings({
        cfg,
        accountId: defaultAccountId,
        account,
      });
      if (extra?.length) warnings.push(...extra);
    }
  }

  const lines =
    warnings.length > 0 ? warnings : ["- Nenhum aviso de segurança de canal detectado."];
  lines.push(auditHint);
  note(lines.join("\n"), "Segurança");
}
