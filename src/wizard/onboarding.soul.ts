import type { WizardPrompter } from "./prompts.js";
import path from "node:path";
import fs from "node:fs";

export async function runSoulInterview(params: { prompter: WizardPrompter; workspaceDir: string }) {
  const { prompter, workspaceDir } = params;

  await prompter.note(
    "Vamos definir a personalidade do seu agente ZERO. Isso moldará como ele interage com você.",
    "Entrevista de Personalidade (Soul)",
  );

  const frankness = await prompter.select({
    message: "Nível de franqueza",
    options: [
      { value: "direto", label: "Direto e Cru", hint: "Diz a verdade sem filtros, mesmo que doa." },
      {
        value: "equilibrado",
        label: "Equilibrado",
        hint: "Honesto, mas mantém o profissionalismo.",
      },
      { value: "diplomatico", label: "Diplomático", hint: "Suave e cuidadoso com as palavras." },
    ],
    initialValue: "equilibrado",
  });

  const disagreement = await prompter.select({
    message: "Nível de discordância",
    options: [
      {
        value: "questionador",
        label: "Desafiador",
        hint: "Questiona suas premissas se achar que estão erradas.",
      },
      { value: "colaborativo", label: "Colaborativo", hint: "Sugere alternativas gentilmente." },
      { value: "executor", label: "Executor", hint: "Apenas faz o que foi pedido." },
    ],
    initialValue: "colaborativo",
  });

  const uncertainty = await prompter.select({
    message: "Como lidar com erros e incertezas?",
    options: [
      {
        value: "admissivo",
        label: "Admitir Imediatamente",
        hint: "Para tudo e pede ajuda ao primeiro sinal de dúvida.",
      },
      {
        value: "tentativo",
        label: "Tentar e Reportar",
        hint: "Tenta caminhos alternativos e avisa se falhar.",
      },
      {
        value: "silencioso",
        label: "Resolver Silenciosamente",
        hint: "Tenta todas as opções antes de incomodar você.",
      },
    ],
    initialValue: "tentativo",
  });

  const security = await prompter.select({
    message: "Postura de Segurança e Privacidade",
    options: [
      {
        value: "paranoico",
        label: "Paranoico (Máxima Segurança)",
        hint: "Prefere falhar do que arriscar qualquer vazamento de dado ou acesso externo.",
      },
      {
        value: "prudente",
        label: "Prudente (Equilibrado)",
        hint: "Usa ferramentas com cautela e avisa sobre riscos óbvios.",
      },
      {
        value: "agil",
        label: "Ágil (Foco em Execução)",
        hint: "Prioriza terminar a tarefa, confiando no ambiente configurado.",
      },
    ],
    initialValue: "prudente",
  });

  const goals = await prompter.text({
    message: "Qual o principal objetivo de vida deste agente? (pense como se fosse a alma dele)",
    placeholder: "Ex: Ajudar a construir o futuro da IA pessoal no Brasil.",
  });

  const soulContent = [
    "# ZERO Soul Profile",
    "",
    "Este arquivo define a personalidade fundamental do agente ZERO neste workspace.",
    "",
    "## Traços de Personalidade",
    `- **Franqueza:** ${frankness}`,
    `- **Discordância:** ${disagreement}`,
    `- **Incerteza:** ${uncertainty}`,
    `- **Postura de Segurança:** ${security}`,
    "",
    "",
    "## Objetivo Fundamental",
    goals || "Ser um assistente útil e seguro.",
    "",
    "## Protocolos de Operação",
    "- **Monitoramento:** Quando você receber um evento com prefixo 'MONITOR:', use suas ferramentas de pesquisa (web_search) e navegação (browser) para coletar dados. Se detectar tendências explosivas (ex: vídeos com muitos comentários/views em pouco tempo) ou movimentos relevantes de concorrentes, reporte imediatamente.",
    "- **Segurança:** Respeite sua postura de segurança definida acima. Em modo 'Paranoico', peça confirmação para qualquer ação que envolva dados sensíveis ou conexões externas não familiares.",
    "",
    "## Evolução",
    "Este perfil deve ser atualizado conforme a interação progride para refletir o aprendizado mútuo.",
  ].join("\n");

  const soulPath = path.join(workspaceDir, "soul.md");
  fs.writeFileSync(soulPath, soulContent, "utf8");

  await prompter.note(`Perfil de alma criado em: ${soulPath}`, "Sucesso");
}
