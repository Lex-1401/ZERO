import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { isRich, theme } from "../../terminal/theme.js";
import { formatCliBannerLine, hasEmittedCliBanner } from "../banner.js";
import type { ProgramContext } from "./context.js";

const EXAMPLES = [
  ["zero channels login --verbose", "Linke o WhatsApp Web pessoal e mostre logs do QR + conexão."],
  [
    'zero message send --target +15555550123 --message "Oi" --json',
    "Envie via sua sessão web e imprima o resultado JSON.",
  ],
  ["zero gateway --port 18789", "Execute o Gateway WebSocket localmente."],
  ["zero --dev gateway", "Execute um Gateway dev (estado/config isolado) em ws://127.0.0.1:19001."],
  [
    "zero gateway --force",
    "Mate qualquer coisa associada à porta padrão do gateway, depois inicie-o.",
  ],
  ["zero gateway ...", "Controle do Gateway via WebSocket."],
  [
    'zero agent --to +15555550123 --message "Run summary" --deliver',
    "Fale diretamente com o agente usando o Gateway; opcionalmente envie a resposta do WhatsApp.",
  ],
  [
    'zero message send --channel telegram --target @mychat --message "Oi"',
    "Envie via seu bot do Telegram.",
  ],
] as const;

export function configureProgramHelp(program: Command, ctx: ProgramContext) {
  program
    .name("zero")
    .description("")
    .version(ctx.programVersion)
    .option(
      "--dev",
      "Perfil Dev: isola o estado em ~/.zero-dev, porta gateway padrão 19001, e desloca portas derivadas (browser/canvas)",
    )
    .option(
      "--profile <name>",
      "Use um perfil nomeado (isola ZERO_STATE_DIR/ZERO_CONFIG_PATH em ~/.zero-<name>)",
    );

  program.option("--no-color", "Desabilitar cores ANSI", false);

  program.configureHelp({
    optionTerm: (option) => theme.option(option.flags),
    subcommandTerm: (cmd) => theme.command(cmd.name()),
  });

  program.configureOutput({
    writeOut: (str) => {
      const colored = str
        .replace(/^Usage:/gm, theme.heading("Uso:"))
        .replace(/^Options:/gm, theme.heading("Opções:"))
        .replace(/^Commands:/gm, theme.heading("Comandos:"));
      process.stdout.write(colored);
    },
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(theme.error(str)),
  });

  if (
    process.argv.includes("-V") ||
    process.argv.includes("--version") ||
    process.argv.includes("-v")
  ) {
    console.log(ctx.programVersion);
    process.exit(0);
  }

  program.addHelpText("beforeAll", () => {
    if (hasEmittedCliBanner()) return "";
    const rich = isRich();
    const line = formatCliBannerLine(ctx.programVersion, { richTty: rich });
    return `\n${line}\n`;
  });

  const fmtExamples = EXAMPLES.map(
    ([cmd, desc]) => `  ${theme.command(cmd)}\n    ${theme.muted(desc)}`,
  ).join("\n");

  program.addHelpText("afterAll", ({ command }) => {
    if (command !== program) return "";
    const docs = formatDocsLink("/cli", "docs.zero.local/cli");
    return `\n${theme.heading("Exemplos:")}\n${fmtExamples}\n\n${theme.muted("Docs:")} ${docs}\n`;
  });
}
