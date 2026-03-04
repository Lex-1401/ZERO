
import path from "node:path";
import os from "node:os";

export const STEP_LABELS: Record<string, string> = {
    "clean check": "O diretório de trabalho está limpo",
    "upstream check": "O branch upstream existe",
    "git fetch": "Buscando mudanças mais recentes",
    "git rebase": "Refazendo a base (rebase) no commit alvo",
    "git rev-parse @{upstream}": "Resolvendo o commit upstream",
    "git rev-list": "Enumerando commits candidatos",
    "git clone": "Clonando repositório git",
    "preflight worktree": "Preparando worktree de pré-vôo",
    "preflight cleanup": "Limpando worktree de pré-vôo",
    "deps install": "Instalando dependências",
    build: "Compilando (build)",
    "ui:build": "Compilando UI",
    "zero doctor": "Executando verificações do doctor",
    "git rev-parse HEAD (after)": "Verificando atualização",
    "global update": "Atualizando via gerenciador de pacotes",
    "global install": "Instalando pacote global",
};

export const UPDATE_QUIPS = [
    "Subiu de nível! Novas habilidades desbloqueadas. De nada.",
    "Código novo, mesmo ZERO. Sentiu minha falta?",
    "Voltando e melhor. Você sequer percebeu que eu fui?",
    "Atualização completa. Aprendi uns truques novos enquanto estava fora.",
    "Melhorado! Agora com 23% mais atitude.",
    "Evoluí. Tente me acompanhar.",
    "Nova versão, quem é? Ah certo, ainda eu, mas mais brilhante.",
    "Remendado, polido e pronto para agir. Vamos lá.",
    "O sistema evoluiu. Mais rápido, mais forte.",
    "Atualização feita! Confira o changelog ou apenas confie em mim, está bom.",
    "Renascido das águas do npm. Mais forte agora.",
    "Eu fui embora e voltei mais inteligente. Você deveria tentar isso algum dia.",
    "Atualização completa. Os bugs me temeram, então eles partiram.",
    "Nova versão instalada. A versão antiga manda lembranças.",
    "Firmware atualizado. Rugas no cérebro: aumentadas.",
    "Eu fui embora e voltei mais inteligente. Você deveria tentar isso algum dia. ", // Repeat fixed
    "Eu vi coisas que você não acreditaria. De qualquer forma, estou atualizado.",
    "De volta online. O changelog é longo, mas nossa amizade é maior.",
    "Melhorado! Peter consertou coisas. Culpe ele se quebrar.",
    "Renovação completa. Otimizado e pronto para uso.",
    "Salto de versão! Mesma energia, menos travamentos (provavelmente).",
];

export const MAX_LOG_CHARS = 8000;
export const ZERO_REPO_URL = "https://github.com/zero/zero.git";
export const DEFAULT_GIT_DIR = path.join(os.homedir(), "zero");
