
export interface ExecApprovalRequest {
    id: string;
    command: string;
    cwd?: string | null;
    host?: string | null;
}

export type ExecApprovalDecision = "approve" | "reject" | "timeout";

export interface ExecApprovalResolved {
    id: string;
    decision: ExecApprovalDecision;
    resolvedBy?: string | null;
    ts: number;
}
