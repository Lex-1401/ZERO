import {
  confirm as clackConfirm,
  intro as clackIntro,
  outro as clackOutro,
  select as clackSelect,
  text as clackText,
} from "@clack/prompts";

import { stylePromptHint, stylePromptMessage, stylePromptTitle } from "../terminal/prompt-style.js";

export const CONFIGURE_WIZARD_SECTIONS = [
  "workspace",
  "model",
  "web",
  "gateway",
  "daemon",
  "channels",
  "skills",
  "health",
] as const;

export type WizardSection = (typeof CONFIGURE_WIZARD_SECTIONS)[number];

export type ChannelsWizardMode = "configure" | "remove";

export type ConfigureWizardParams = {
  command: "configure" | "update";
  sections?: WizardSection[];
};

export const CONFIGURE_SECTION_OPTIONS: Array<{
  value: WizardSection;
  label: string;
  hint: string;
}> = [
  { value: "workspace", label: "Workspace", hint: "Definir workspace + sessões" },
  { value: "model", label: "Modelo", hint: "Escolher provedor + credenciais" },
  { value: "web", label: "Ferramentas web", hint: "Configurar busca + fetch do Brave" },
  { value: "gateway", label: "Gateway", hint: "Porta, bind, autenticação, tailscale" },
  {
    value: "daemon",
    label: "Daemon",
    hint: "Instalar/gerenciar o serviço em segundo plano",
  },
  {
    value: "channels",
    label: "Canais",
    hint: "Vincular WhatsApp/Telegram/etc e padrões",
  },
  { value: "skills", label: "Habilidades", hint: "Instalar/ativar habilidades do workspace" },
  {
    value: "health",
    label: "Verificação de saúde",
    hint: "Executar verificações de gateway + canais",
  },
];

export const intro = (message: string) => clackIntro(stylePromptTitle(message) ?? message);
export const outro = (message: string) => clackOutro(stylePromptTitle(message) ?? message);
export const text = (params: Parameters<typeof clackText>[0]) =>
  clackText({
    ...params,
    message: stylePromptMessage(params.message),
  });
export const confirm = (params: Parameters<typeof clackConfirm>[0]) =>
  clackConfirm({
    ...params,
    message: stylePromptMessage(params.message),
  });
export const select = <T>(params: Parameters<typeof clackSelect<T>>[0]) =>
  clackSelect({
    ...params,
    message: stylePromptMessage(params.message),
    options: params.options.map((opt) =>
      opt.hint === undefined ? opt : { ...opt, hint: stylePromptHint(opt.hint) },
    ),
  });
