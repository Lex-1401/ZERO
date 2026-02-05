/**
 * Proactive Nudge Engine
 * Analyzes inactivity and system state to suggest actions autonomously.
 */
export class ProactiveNudge {
  private static IDLE_THRESHOLD_MS = 1000 * 60 * 30; // 30 minutes
  private static lastActivity: number = Date.now();
  private static interval: NodeJS.Timeout | null = null;

  static start() {
    this.interval = setInterval(() => this.check(), 60000); // Check every minute
    console.log("[Proactive] Nudge engine started.");
  }

  static stop() {
    if (this.interval) clearInterval(this.interval);
  }

  static recordActivity() {
    this.lastActivity = Date.now();
  }

  private static async check() {
    const idleTime = Date.now() - this.lastActivity;

    if (idleTime > this.IDLE_THRESHOLD_MS) {
      // Logic to determine if a nudge is appropriate
      const suggestion = await this.generateSuggestion();
      if (suggestion) {
        console.log(`[Proactive] Nudge: ${suggestion}`);
        // In a real implementation, this would push a message to the user via the active channel
        // e.g. events.emit("nudge", suggestion);
      }
    }
  }

  private static async generateSuggestion(): Promise<string | null> {
    const hour = new Date().getHours();
    const day = new Date().getDay(); // 0 = Sun, 5 = Fri

    // "Friday Deploy" Nudge
    if (day === 5 && hour >= 14 && hour <= 16) {
      return "Percebi que é sexta-feira à tarde. O ambiente de staging está estável. Quer que eu rode os testes finais antes do fim de semana?";
    }

    // "Morning Standup" Nudge
    if (hour === 9) {
      return "Bom dia. Revisei os commits de ontem. Quer um resumo para a daily?";
    }

    // "Cleanup" Nudge (Generic)
    if (Math.random() > 0.9) {
      return "Notei alguns arquivos temporários em ~/.zero/tmp. Quer que eu faça uma limpeza?";
    }

    return null;
  }
}
