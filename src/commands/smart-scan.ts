import os from "node:os";
import { execSync } from "node:child_process";
import type { ZEROConfig } from "../config/config.js";

export type SmartRecommendation = {
  id: string;
  title: string;
  description: string;
  type: "security" | "performance" | "ecosystem" | "location";
  recommendedValue: any;
  configPath: string;
  reason: string;
};

export async function runSmartScan(_cfg: ZEROConfig): Promise<SmartRecommendation[]> {
  const recommendations: SmartRecommendation[] = [];

  // 1. Hardware/Performance
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
  if (totalMemoryGB > 12) {
    recommendations.push({
      id: "high_perf_model",
      title: "Performance de Elite",
      description:
        "Detectamos que você tem bastante memória RAM. Sugerimos usar o Claude 3.5 Sonnet para raciocínios complexos.",
      type: "performance",
      recommendedValue: "claude-3-5-sonnet",
      configPath: "agents.defaults.primaryModel",
      reason: `Detectado ${Math.round(totalMemoryGB)}GB de RAM.`,
    });
  }

  // 2. Segurança/Sandbox
  const hasDocker = checkDocker();
  if (hasDocker) {
    recommendations.push({
      id: "enable_sandbox",
      title: "Sandbox de Isolamento",
      description:
        "Vimos que você tem o Docker instalado. Podemos rodar comandos em uma 'bolha' segura para proteger seu macOS.",
      type: "security",
      recommendedValue: { enabled: true },
      configPath: "tools.exec.sandbox",
      reason: "Docker detectado no sistema.",
    });
  }

  // 3. Ecossistema macOS
  if (process.platform === "darwin") {
    recommendations.push({
      id: "macos_daemon",
      title: "Início Automático",
      description: "Deseja que o ZERO inicie automaticamente junto com o seu Mac?",
      type: "ecosystem",
      recommendedValue: true,
      configPath: "gateway.installDaemon",
      reason: "Executando no macOS.",
    });
  }

  // 4. Localização (Simplificado)
  const locale = process.env.LANG || "";
  if (locale.includes("PT") || locale.includes("pt")) {
    recommendations.push({
      id: "brazilian_localization",
      title: "Localização Brasileira",
      description: "Ajustando formatos de data e tom de voz para o padrão brasileiro.",
      type: "location",
      recommendedValue: "pt-BR",
      configPath: "meta.locale",
      reason: "Idioma do sistema detectado como Português.",
    });
  }

  return recommendations;
}

function checkDocker(): boolean {
  try {
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
