import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { CronJob, CronRunLogEntry, CronStatus } from "../types";
import type { CronFormState } from "../ui-types";
import { DEFAULT_CRON_FORM } from "../app-defaults";

export class CronStore implements ReactiveController {
    host: ReactiveControllerHost;

    loading = false;
    jobs: CronJob[] = [];
    status: CronStatus | null = null;
    error: string | null = null;
    form: CronFormState = { ...DEFAULT_CRON_FORM };
    runsJobId: string | null = null;
    runs: CronRunLogEntry[] = [];
    busy = false;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() { }
    hostDisconnected() { }

    requestUpdate() {
        this.host.requestUpdate();
    }
}
