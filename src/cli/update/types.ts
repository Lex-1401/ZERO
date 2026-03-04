
import { UpdateRunResult } from "../../infra/update-runner.js";

export type { UpdateRunResult };

export type UpdateCommandOptions = {
    json?: boolean;
    restart?: boolean;
    channel?: string;
    tag?: string;
    timeout?: string;
    yes?: boolean;
};

export type UpdateStatusOptions = {
    json?: boolean;
    timeout?: string;
};

export type UpdateWizardOptions = {
    timeout?: string;
};
