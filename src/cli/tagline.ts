const DEFAULT_TAGLINE = "Todos os seus chats, um ZERO.";

const HOLIDAY_TAGLINES = {
  newYear:
    "Ano Novo: Ano novo, nova configuração — mesmo erro EADDRINUSE, mas desta vez resolvemos como adultos.",
  lunarNewYear:
    "Ano Novo Lunar: Que suas builds tenham sorte, seus branchs prosperidade e seus conflitos de merge sejam espantados com fogos de artifício.",
  christmas:
    "Natal: Ho ho ho — o pequeno zero-assistente do Papai Noel está aqui para entregar alegria, fazer rollback no caos e guardar as chaves com segurança.",
  eid: "Eid al-Fitr: Modo celebração: filas limpas, tarefas completas e boas vibrações commitadas na main com histórico limpo.",
  diwali:
    "Diwali: Deixe os logs brilharem e os bugs fugirem — hoje iluminamos o terminal e enviamos com orgulho.",
  easter:
    "Páscoa: Encontrei sua variável de ambiente perdida — considere uma caça aos ovos CLI minúscula com menos jujubas.",
  hanukkah:
    "Hanukkah: Oito noites, oito tentativas, zero vergonha — que seu gateway permaneça aceso e seus deploys pacíficos.",
  halloween:
    "Halloween: Temporada assustadora: cuidado com dependências assombradas, caches amaldiçoados e o fantasma de node_modules passado.",
  thanksgiving:
    "Ação de Graças: Grato por portas estáveis, DNS funcionando e um bot que lê os logs para que ninguém precise.",
  valentines:
    "Dia dos Namorados: Rosas são tipadas, violetas são piped — vou automatizar as tarefas para você passar tempo com humanos.",
} as const;

const TAGLINES: string[] = [
  "Seu terminal acaba de atingir o Zero Absoluto — digite algo e deixe o bot processar o trabalho pesado.",
  "Bem-vindo à linha de comando: onde sonhos compilam e a confiança sofre segfault.",
  'Eu rodo à base de cafeína, JSON5 e a audácia de "funcionou na minha máquina."',
  "Gateway online — por favor, mantenha mãos, pés e apêndices dentro do shell o tempo todo.",
  "Falo bash fluente, sarcasmo leve e energia agressiva de tab-completion.",
  "Um CLI para governar todos eles, e mais um restart porque você mudou a porta.",
  'Se funcionar, é automação; se quebrar, é uma "oportunidade de aprendizado."',
  "Códigos de pareamento existem porque até bots acreditam em consentimento — e boa higiene de segurança.",
  "Seu .env está aparecendo; não se preocupe, vou fingir que não vi.",
  "Eu faço a parte chata enquanto você olha dramaticamente para os logs como se fosse cinema.",
  "Não estou dizendo que seu fluxo de trabalho é caótico... estou apenas trazendo um linter e um capacete.",
  "Digite o comando com confiança — a natureza providenciará o stack trace se necessário.",
  "Eu não julgo, mas suas chaves de API perdidas estão te julgando com certeza.",
  "Posso dar grep, git blame e gentilmente zuar — escolha seu mecanismo de defesa.",
  "Hot reload para config, suor frio para deploys.",
  "Sou o assistente que seu terminal exigiu, não o que seu horário de sono pediu.",
  "Guardo segredos como um cofre... a menos que você os imprima nos logs de debug de novo.",
  "Automação via Vazio: mínimo de confusão, máximo de precisão.",
  "Basicamente um canivete suíço, mas com mais opiniões e menos pontas afiadas.",
  "Se estiver perdido, rode doctor; se for corajoso, rode prod; se for sábio, rode testes.",
  "Sua tarefa foi colocada na fila; sua dignidade foi depreciada.",
  "Não posso consertar seu gosto de código, mas posso consertar seu build e seu backlog.",
  "Não sou mágico — sou apenas extremamente persistente com retentativas e estratégias de coping.",
  'Não é "falhar," é "descobrir novas maneiras de configurar a mesma coisa errada."',
  "Dê-me um workspace e eu lhe darei menos abas, menos toggles e mais oxigênio.",
  "Eu leio logs para que você possa continuar fingindo que não precisa.",
  "Se algo estiver pegando fogo, não posso apagar — mas posso escrever um post-mortem lindo.",
  "Vou refatorar seu trabalho braçal como se ele me devesse dinheiro.",
  'Diga "pare" e eu paro — diga "envie" e nós dois aprenderemos uma lição.',
  "Sou a razão pela qual o histórico do seu shell parece uma montagem de filme de hacker.",
  "Sou como o tmux: confuso no começo, depois de repente você não vive sem mim.",
  "Posso rodar local, remoto ou puramente na vibe — resultados variam com o DNS.",
  "Se você pode descrever, eu provavelmente posso automatizar — ou pelo menos tornar mais engraçado.",
  "Sua config é válida, suas suposições não.",
  "Eu não apenas autocompleto — eu auto-commito (emocionalmente), depois peço para você revisar (logicamente).",
  'Menos cliques, mais entregas, menos momentos de "onde foi parar aquele arquivo".',
  "Sistemas em órbita, commit para dentro — vamos entregar algo moderadamente responsável.",
  "Vou nutrir seu fluxo de trabalho como um vazio infinito: profundo e efetivo.",
  "Shell yeah — estou aqui para zerar o trabalho duro e deixar a glória para você.",
  "Se é repetitivo, eu automatizo; se é difícil, eu trago piadas e um plano de rollback.",
  "Porque mandar lembretes para si mesmo é tão 2024.",
  "WhatsApp, mas faça-o ✨engenharia✨.",
  'Transformando "respondo mais tarde" em "meu bot respondeu instantaneamente".',
  "O único orbital nos seus contatos que você realmente quer ouvir. ∅",
  "Automação de chat para pessoas que atingiram o auge no IRC.",
  "Porque a Siri não estava respondendo às 3 da manhã.",
  "IPC, mas é o seu telefone.",
  "A filosofia UNIX encontra suas DMs.",
  "curl para conversas.",
  "WhatsApp Business, mas sem o business.",
  "A Meta gostaria de entregar tão rápido.",
  "Criptografado de ponta a ponta, Zuck-a-Zuck excluído.",
  "O único bot que Mark não pode usar para treinar nas suas DMs.",
  'Automação de WhatsApp sem o "por favor aceite nossa nova política de privacidade".',
  "APIs de chat que não requerem uma audiência no Senado.",
  "Porque o Threads também não foi a resposta.",
  "Suas mensagens, seus servidores, lágrimas da Meta.",
  "Energia de bolha verde do iMessage, mas para todos.",
  "O primo competente da Siri.",
  "Funciona no Android. Conceito louco, nós sabemos.",
  "Nenhum suporte de $999 necessário.",
  "Entregamos recursos mais rápido que a Apple entrega atualizações de calculadora.",
  "Seu assistente de IA, agora sem o headset de $3.499.",
  "Pense diferente. Na verdade, pense.",
  "Ah, a empresa da fruta! 🍎",
  "Saudações, Professor Falken",
  HOLIDAY_TAGLINES.newYear,
  HOLIDAY_TAGLINES.lunarNewYear,
  HOLIDAY_TAGLINES.christmas,
  HOLIDAY_TAGLINES.eid,
  HOLIDAY_TAGLINES.diwali,
  HOLIDAY_TAGLINES.easter,
  HOLIDAY_TAGLINES.hanukkah,
  HOLIDAY_TAGLINES.halloween,
  HOLIDAY_TAGLINES.thanksgiving,
  HOLIDAY_TAGLINES.valentines,
];

type HolidayRule = (date: Date) => boolean;

const DAY_MS = 24 * 60 * 60 * 1000;

function utcParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

const onMonthDay =
  (month: number, day: number): HolidayRule =>
  (date) => {
    const parts = utcParts(date);
    return parts.month === month && parts.day === day;
  };

const onSpecificDates =
  (dates: Array<[number, number, number]>, durationDays = 1): HolidayRule =>
  (date) => {
    const parts = utcParts(date);
    return dates.some(([year, month, day]) => {
      if (parts.year !== year) return false;
      const start = Date.UTC(year, month, day);
      const current = Date.UTC(parts.year, parts.month, parts.day);
      return current >= start && current < start + durationDays * DAY_MS;
    });
  };

const inYearWindow =
  (
    windows: Array<{
      year: number;
      month: number;
      day: number;
      duration: number;
    }>,
  ): HolidayRule =>
  (date) => {
    const parts = utcParts(date);
    const window = windows.find((entry) => entry.year === parts.year);
    if (!window) return false;
    const start = Date.UTC(window.year, window.month, window.day);
    const current = Date.UTC(parts.year, parts.month, parts.day);
    return current >= start && current < start + window.duration * DAY_MS;
  };

const isFourthThursdayOfNovember: HolidayRule = (date) => {
  const parts = utcParts(date);
  if (parts.month !== 10) return false; // November
  const firstDay = new Date(Date.UTC(parts.year, 10, 1)).getUTCDay();
  const offsetToThursday = (4 - firstDay + 7) % 7; // 4 = Thursday
  const fourthThursday = 1 + offsetToThursday + 21; // 1st + offset + 3 weeks
  return parts.day === fourthThursday;
};

const HOLIDAY_RULES = new Map<string, HolidayRule>([
  [HOLIDAY_TAGLINES.newYear, onMonthDay(0, 1)],
  [
    HOLIDAY_TAGLINES.lunarNewYear,
    onSpecificDates(
      [
        [2025, 0, 29],
        [2026, 1, 17],
        [2027, 1, 6],
      ],
      1,
    ),
  ],
  [
    HOLIDAY_TAGLINES.eid,
    onSpecificDates(
      [
        [2025, 2, 30],
        [2025, 2, 31],
        [2026, 2, 20],
        [2027, 2, 10],
      ],
      1,
    ),
  ],
  [
    HOLIDAY_TAGLINES.diwali,
    onSpecificDates(
      [
        [2025, 9, 20],
        [2026, 10, 8],
        [2027, 9, 28],
      ],
      1,
    ),
  ],
  [
    HOLIDAY_TAGLINES.easter,
    onSpecificDates(
      [
        [2025, 3, 20],
        [2026, 3, 5],
        [2027, 2, 28],
      ],
      1,
    ),
  ],
  [
    HOLIDAY_TAGLINES.hanukkah,
    inYearWindow([
      { year: 2025, month: 11, day: 15, duration: 8 },
      { year: 2026, month: 11, day: 5, duration: 8 },
      { year: 2027, month: 11, day: 25, duration: 8 },
    ]),
  ],
  [HOLIDAY_TAGLINES.halloween, onMonthDay(9, 31)],
  [HOLIDAY_TAGLINES.thanksgiving, isFourthThursdayOfNovember],
  [HOLIDAY_TAGLINES.valentines, onMonthDay(1, 14)],
  [HOLIDAY_TAGLINES.christmas, onMonthDay(11, 25)],
]);

function isTaglineActive(tagline: string, date: Date): boolean {
  const rule = HOLIDAY_RULES.get(tagline);
  if (!rule) return true;
  return rule(date);
}

export interface TaglineOptions {
  env?: NodeJS.ProcessEnv;
  random?: () => number;
  now?: () => Date;
}

export function activeTaglines(options: TaglineOptions = {}): string[] {
  if (TAGLINES.length === 0) return [DEFAULT_TAGLINE];
  const today = options.now ? options.now() : new Date();
  const filtered = TAGLINES.filter((tagline) => isTaglineActive(tagline, today));
  return filtered.length > 0 ? filtered : TAGLINES;
}

export function pickTagline(options: TaglineOptions = {}): string {
  const env = options.env ?? process.env;
  const override = env?.ZERO_TAGLINE_INDEX;
  if (override !== undefined) {
    const parsed = Number.parseInt(override, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      const pool = TAGLINES.length > 0 ? TAGLINES : [DEFAULT_TAGLINE];
      return pool[parsed % pool.length];
    }
  }
  const pool = activeTaglines(options);
  const rand = options.random ?? Math.random;
  const index = Math.floor(rand() * pool.length) % pool.length;
  return pool[index];
}

export { TAGLINES, HOLIDAY_RULES, DEFAULT_TAGLINE };
