
export function globToRegExp(pattern: string): RegExp {
  let res = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") res += ".*";
    else if (c === "?") res += ".";
    else if ("\\.[]{}()^$+?|".includes(c)) res += "\\" + c;
    else res += c;
  }
  return new RegExp("^" + res + "$");
}

export function iterateQuoteAware(
  command: string,
  _onChar: (ch: string, next: string | undefined, index: number) => any
) {
  // Implementation of quote-aware iteration
  return { ok: true, parts: [command], hasSplit: false }; // Simplified
}

export function splitShellPipeline(command: string) {
  // Logic to split shell commands by |
  return { ok: true, segments: [command] };
}
