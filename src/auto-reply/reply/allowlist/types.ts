
export type AllowlistScope = "dm" | "group" | "all";
export type AllowlistAction = "list" | "add" | "remove";

export interface AllowlistCommand {
    action: AllowlistAction | "error";
    scope: AllowlistScope;
    channel?: string;
    account?: string;
    entry?: string;
    resolve?: boolean;
    message?: string;
}
