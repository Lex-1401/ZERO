
/**
 * Node Daemon CLI
 *
 * Implements the subcommands for managing the ZERO Node as a background service.
 * Delegated to src/cli/node-cli/daemon/ for maintainability and Atomic Modularity.
 */

// @ts-nocheck
import {
  type NodeDaemonInstallOptions,
  type NodeDaemonLifecycleOptions,
  type NodeDaemonStatusOptions
} from "./daemon/types.js";
import {
  runNodeDaemonInstall as install,
  runNodeDaemonUninstall as uninstall,
  runNodeDaemonStart as start,
  runNodeDaemonStop as stop,
  runNodeDaemonRestart as restart,
  runNodeDaemonStatus as status
} from "./daemon/actions.js";

export type { NodeDaemonInstallOptions, NodeDaemonLifecycleOptions, NodeDaemonStatusOptions };

export async function runNodeDaemonInstall(opts: NodeDaemonInstallOptions) {
  return await install(opts);
}

export async function runNodeDaemonUninstall(opts: NodeDaemonLifecycleOptions = {}) {
  return await uninstall(opts);
}

export async function runNodeDaemonStart(opts: NodeDaemonLifecycleOptions = {}) {
  return await start(opts);
}

export async function runNodeDaemonStop(opts: NodeDaemonLifecycleOptions = {}) {
  return await stop(opts);
}

export async function runNodeDaemonRestart(opts: NodeDaemonLifecycleOptions = {}) {
  return await restart(opts);
}

export async function runNodeDaemonStatus(opts: NodeDaemonStatusOptions = {}) {
  return await status(opts);
}
