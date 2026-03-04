
export function trimOutput(text: string, maxChars?: number): string {
    if (!maxChars || text.length <= maxChars) return text;
    return text.substring(0, maxChars) + "...";
}

export function commandBase(command: string): string {
    return command.split(" ")[0];
}

export function findArgValue(args: string[], keys: string[]): string | undefined {
    const index = args.findIndex((arg) => keys.includes(arg));
    if (index !== -1 && index < args.length - 1) return args[index + 1];
    return undefined;
}
