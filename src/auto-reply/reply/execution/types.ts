
export type AgentRunLoopResult =
    | { kind: "success"; runResult: any; didLogHeartbeatStrip: boolean }
    | { kind: "final"; payload: any };
