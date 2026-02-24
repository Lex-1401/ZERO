import { Type } from \"@sinclair/typebox\";

export const execSchema = Type.Object({
    command: Type.String({
        description: \"Shell command to execute\" }),
  workdir: Type.Optional(Type.String({
            description: \"Working directory (defaults to cwd)\" })),
  env: Type.Optional(Type.Record(Type.String(), Type.String())),
            yieldMs: Type.Optional(
                Type.Number({
                    description: \"Milliseconds to wait before backgrounding (default 10000)\",
    }),
            ),
            background: Type.Optional(Type.Boolean({
                description: \"Run in background immediately\" })),
  timeout: Type.Optional(
                    Type.Number({
                        description: \"Timeout in seconds (optional, kills process on expiry)\",
    }),
                ),
                pty: Type.Optional(
                    Type.Boolean({
                        description:
\"Run in a pseudo-terminal (PTY) when available (TTY-required CLIs, coding agents)\",
    }),
  ),
elevated: Type.Optional(
    Type.Boolean({
        description: \"Run on the host with elevated permissions (if allowed)\",
    }),
),
    host: Type.Optional(
        Type.String({
            description: \"Exec host (sandbox|gateway|node).\",
    }),
    ),
        security: Type.Optional(
            Type.String({
                description: \"Exec security mode (deny|allowlist|full).\",
    }),
        ),
            ask: Type.Optional(
                Type.String({
                    description: \"Exec ask mode (off|on-miss|always).\",
    }),
            ),
                node: Type.Optional(
                    Type.String({
                        description: \"Node id/name for host=node.\",
    }),
                ),
});
