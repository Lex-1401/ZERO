export const SLACK_COMMAND_ARG_ACTION_ID = "zero_cmdarg";
export const SLACK_COMMAND_ARG_VALUE_PREFIX = "cmdarg";

export type SlackBlock = { type: string; [key: string]: unknown };

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export function encodeSlackCommandArgValue(parts: {
  command: string;
  arg: string;
  value: string;
  userId: string;
}) {
  return [
    SLACK_COMMAND_ARG_VALUE_PREFIX,
    encodeURIComponent(parts.command),
    encodeURIComponent(parts.arg),
    encodeURIComponent(parts.value),
    encodeURIComponent(parts.userId),
  ].join("|");
}

export function parseSlackCommandArgValue(raw?: string | null): {
  command: string;
  arg: string;
  value: string;
  userId: string;
} | null {
  if (!raw) return null;
  const parts = raw.split("|");
  if (parts.length !== 5 || parts[0] !== SLACK_COMMAND_ARG_VALUE_PREFIX) return null;
  const [, command, arg, value, userId] = parts;
  if (!command || !arg || !value || !userId) return null;
  const decode = (text: string) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return null;
    }
  };
  const decodedCommand = decode(command);
  const decodedArg = decode(arg);
  const decodedValue = decode(value);
  const decodedUserId = decode(userId);
  if (!decodedCommand || !decodedArg || !decodedValue || !decodedUserId) return null;
  return {
    command: decodedCommand,
    arg: decodedArg,
    value: decodedValue,
    userId: decodedUserId,
  };
}

export function buildSlackCommandArgMenuBlocks(params: {
  title: string;
  command: string;
  arg: string;
  choices: string[];
  userId: string;
}) {
  const rows = chunkItems(params.choices, 5).map((choices) => ({
    type: "actions",
    elements: choices.map((choice) => ({
      type: "button",
      action_id: SLACK_COMMAND_ARG_ACTION_ID,
      text: { type: "plain_text", text: choice },
      value: encodeSlackCommandArgValue({
        command: params.command,
        arg: params.arg,
        value: choice,
        userId: params.userId,
      }),
    })),
  }));
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: params.title },
    },
    ...rows,
  ];
}
