
import { type ZEROConfig } from "../../config/config.js";

export async function collectChannelStatus(_params: {
    cfg: ZEROConfig;
    accountOverrides: any;
}) {
    // Logic to check which channels are configured, linked, or need setup.
    return { statusByChannel: new Map(), statusLines: [] };
}
