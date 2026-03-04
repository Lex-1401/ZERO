
export const DEFAULT_HEARTBEAT_TARGET = "last";
export const ACTIVE_HOURS_TIME_PATTERN = /^([01]\d|2[0-3]|24):([0-5]\d)$/;

export const EXEC_EVENT_PROMPT =
    "An async command you ran earlier has completed. The result is shown in the system messages above. " +
    "Please relay the command output to the user in a helpful way. If the command succeeded, share the relevant output. " +
    "If it failed, explain what went wrong.";
