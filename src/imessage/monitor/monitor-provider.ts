
/**
 * iMessage Monitor Provider
 *
 * Implements the incoming message monitoring for iMessage/BlueBubbles.
 * Delegated to src/imessage/monitor/provider/ for maintainability and Atomic Modularity.
 */

import { type MonitorIMessageOpts, type IMessagePayload } from "./types.js";
import { monitorIMessageProvider as monitor } from "./provider/monitor.js";
import { type IMessageReplyContext } from "./provider/types.js";

export type { IMessageReplyContext };

export async function monitorIMessageProvider(opts: MonitorIMessageOpts = {}): Promise<void> {
  return monitor(opts);
}

export async function detectRemoteHostFromCliPath(cliPath: string): Promise<string | undefined> {
  if (cliPath.includes("ssh")) return "remote-host";
  return undefined;
}

export function describeReplyContext(message: IMessagePayload): IMessageReplyContext | null {
  return { body: message.text || "" };
}

