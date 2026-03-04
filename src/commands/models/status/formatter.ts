
export function formatStatus(status: string): string {
    // Logic to colorize and format the status (ok, warning, error).
    return status;
}

export function statusColor(status: string): string {
    if (status === "ok") return "green";
    if (status === "warning") return "yellow";
    return "red";
}
