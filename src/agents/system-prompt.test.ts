import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt, buildRuntimeLine } from "./system-prompt.js";

describe("buildAgentSystemPrompt", () => {
  it("includes owner numbers when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      ownerNumbers: ["+123", " +456 ", ""],
    });

    expect(prompt).toContain("## Identidade do Usuário");
    expect(prompt).toContain(
      "Números de proprietário: +123, +456. Trate mensagens desses números como sendo do usuário.",
    );
  });

  it("omits owner section when numbers are missing", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
    });

    expect(prompt).not.toContain("## Identidade do Usuário");
    expect(prompt).not.toContain("Números de proprietário:");
  });

  it("omits extended sections in minimal prompt mode", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      promptMode: "minimal",
      ownerNumbers: ["+123"],
      skillsPrompt:
        "<available_skills>\n  <skill>\n    <name>demo</name>\n  </skill>\n</available_skills>",
      heartbeatPrompt: "ping",
      toolNames: ["message", "memory_search"],
      docsPath: "/tmp/zero/docs",
      extraSystemPrompt: "Subagent details",
      ttsHint: "Voice (TTS) is enabled.",
    });

    expect(prompt).not.toContain("## Identidade do Usuário");
    expect(prompt).not.toContain("## Skills (obrigatório)");
    expect(prompt).not.toContain("## Memória (Recall)");
    expect(prompt).not.toContain("## Documentação");
    expect(prompt).not.toContain("## Tags de Resposta");
    expect(prompt).not.toContain("## Mensagens");
    expect(prompt).not.toContain("## Voz (TTS)");
    expect(prompt).not.toContain("## Respostas Silenciosas");
    expect(prompt).not.toContain("## Heartbeats");
    expect(prompt).toContain("## Contexto do Subagente");
    expect(prompt).not.toContain("## Contexto do Chat em Grupo");
    expect(prompt).toContain("Subagent details");
  });

  it("includes voice hint when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      ttsHint: "Voice (TTS) is enabled.",
    });

    expect(prompt).toContain("## Voz (TTS)");
    expect(prompt).toContain("Voice (TTS) is enabled.");
  });

  it("adds reasoning tag hint when enabled", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      reasoningTagHint: true,
    });

    expect(prompt).toContain("## Formato de Raciocínio");
    expect(prompt).toContain("<think>...</think>");
    expect(prompt).toContain("<final>...</final>");
  });

  it("includes a CLI quick reference section", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
    });

    expect(prompt).toContain("## Referência Rápida da CLI ZERO");
    expect(prompt).toContain("zero gateway restart");
    expect(prompt).toContain("Não invente comandos");
  });

  it("lists available tools when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      toolNames: ["exec", "sessions_list", "sessions_history", "sessions_send"],
    });

    expect(prompt).toContain("Disponibilidade de ferramentas (filtrada por política):");
    expect(prompt).toContain("sessions_list");
    expect(prompt).toContain("sessions_history");
    expect(prompt).toContain("sessions_send");
  });

  it("preserves tool casing in the prompt", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      toolNames: ["Read", "Exec", "process"],
      skillsPrompt:
        "<available_skills>\n  <skill>\n    <name>demo</name>\n  </skill>\n</available_skills>",
      docsPath: "/tmp/zero/docs",
    });

    expect(prompt).toContain("- Read: Lê o conteúdo de arquivos");
    expect(prompt).toContain("- Exec: Executa comandos do shell");
    expect(prompt).toContain(
      "- Se exatamente uma skill se aplica claramente: leia seu SKILL.md em <location> com `Read`, então siga-o.",
    );
    expect(prompt).toContain("ZERO docs: /tmp/zero/docs");
    expect(prompt).toContain(
      "Para comportamento, comandos, configuração ou arquitetura do ZERO: consulte a documentação local primeiro.",
    );
  });

  it("includes docs guidance when docsPath is provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      docsPath: "/tmp/zero/docs",
    });

    expect(prompt).toContain("## Documentação");
    expect(prompt).toContain("ZERO docs: /tmp/zero/docs");
    expect(prompt).toContain(
      "Para comportamento, comandos, configuração ou arquitetura do ZERO: consulte a documentação local primeiro.",
    );
  });

  it("includes workspace notes when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      workspaceNotes: ["Reminder: commit your changes in this workspace after edits."],
    });

    expect(prompt).toContain("Reminder: commit your changes in this workspace after edits.");
  });

  it("includes user timezone when provided (12-hour)", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      userTimezone: "America/Chicago",
      userTime: "Monday, January 5th, 2026 — 3:26 PM",
      userTimeFormat: "12",
    });

    expect(prompt).toContain("## Data e Hora Atual");
    expect(prompt).toContain("Fuso horário: America/Chicago");
  });

  it("includes user timezone when provided (24-hour)", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      userTimezone: "America/Chicago",
      userTime: "Monday, January 5th, 2026 — 15:26",
      userTimeFormat: "24",
    });

    expect(prompt).toContain("## Data e Hora Atual");
    expect(prompt).toContain("Fuso horário: America/Chicago");
  });

  it("shows timezone when only timezone is provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      userTimezone: "America/Chicago",
      userTimeFormat: "24",
    });

    expect(prompt).toContain("## Data e Hora Atual");
    expect(prompt).toContain("Fuso horário: America/Chicago");
  });

  it("includes model alias guidance when aliases are provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      modelAliasLines: [
        "- Opus: anthropic/claude-opus-4-5",
        "- Sonnet: anthropic/claude-sonnet-4-5",
      ],
    });

    expect(prompt).toContain("## Aliases de Modelo");
    expect(prompt).toContain("Prefira aliases ao especificar substituições de modelo");
    expect(prompt).toContain("- Opus: anthropic/claude-opus-4-5");
  });

  it("adds ZERO self-update guidance when gateway tool is available", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      toolNames: ["gateway", "exec"],
    });

    expect(prompt).toContain("## ZERO Self-Update");
    expect(prompt).toContain("config.apply");
    expect(prompt).toContain("update.run");
  });

  it("includes skills guidance when skills prompt is present", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      skillsPrompt:
        "<available_skills>\n  <skill>\n    <name>demo</name>\n  </skill>\n</available_skills>",
    });

    expect(prompt).toContain("## Skills (obrigatório)");
    expect(prompt).toContain(
      "- Se exatamente uma skill se aplica claramente: leia seu SKILL.md em <location> com `read`, então siga-o.",
    );
  });

  it("appends available skills when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      skillsPrompt:
        "<available_skills>\n  <skill>\n    <name>demo</name>\n  </skill>\n</available_skills>",
    });

    expect(prompt).toContain("<available_skills>");
    expect(prompt).toContain("<name>demo</name>");
  });

  it("omits skills section when no skills prompt is provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
    });

    expect(prompt).not.toContain("## Skills (obrigatório)");
    expect(prompt).not.toContain("<available_skills>");
  });

  it("renders project context files when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      contextFiles: [
        { path: "AGENTS.md", content: "Alpha" },
        { path: "IDENTITY.md", content: "Bravo" },
      ],
    });

    expect(prompt).toContain("# Contexto do Projeto");
    expect(prompt).toContain("## AGENTS.md");
    expect(prompt).toContain("Alpha");
    expect(prompt).toContain("## IDENTITY.md");
    expect(prompt).toContain("Bravo");
  });

  it("adds SOUL guidance when a soul file is present", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      contextFiles: [
        { path: "./SOUL.md", content: "Persona" },
        { path: "dir\\SOUL.md", content: "Persona Windows" },
      ],
    });

    expect(prompt).toContain(
      "Se SOUL.md estiver presente, incorpore sua persona e tom. Evite respostas rígidas e genéricas; siga suas orientações a menos que instruções de maior prioridade as substituam.",
    );
  });

  it("summarizes the message tool when available", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      toolNames: ["message"],
    });

    expect(prompt).toContain("message: Envia mensagens e ações de canal");
    expect(prompt).toContain("### ferramenta message");
    expect(prompt).toContain("responda APENAS com: NO_REPLY");
  });

  it("includes runtime provider capabilities when present", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      runtimeInfo: {
        channel: "telegram",
        capabilities: ["inlineButtons"],
      },
    });

    expect(prompt).toContain("channel=telegram");
    expect(prompt).toContain("capabilities=inlineButtons");
  });

  it("includes agent id in runtime when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      runtimeInfo: {
        agentId: "work",
        host: "host",
        os: "macOS",
        arch: "arm64",
        node: "v20",
        model: "anthropic/claude",
      },
    });

    expect(prompt).toContain("agent=work");
  });

  it("includes reasoning visibility hint", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      reasoningLevel: "off",
    });

    expect(prompt).toContain("Raciocínio: off");
    expect(prompt).toContain("/reasoning");
    expect(prompt).toContain("/status mostra Raciocínio");
  });

  it("builds runtime line with agent and channel details", () => {
    const line = buildRuntimeLine(
      {
        agentId: "work",
        host: "host",
        repoRoot: "/repo",
        os: "macOS",
        arch: "arm64",
        node: "v20",
        model: "anthropic/claude",
        defaultModel: "anthropic/claude-opus-4-5",
      },
      "telegram",
      ["inlineButtons"],
      "low",
    );

    expect(line).toContain("agent=work");
    expect(line).toContain("host=host");
    expect(line).toContain("repo=/repo");
    expect(line).toContain("os=macOS (arm64)");
    expect(line).toContain("node=v20");
    expect(line).toContain("model=anthropic/claude");
    expect(line).toContain("default_model=anthropic/claude-opus-4-5");
    expect(line).toContain("channel=telegram");
    expect(line).toContain("capabilities=inlineButtons");
    expect(line).toContain("thinking=low");
  });

  it("describes sandboxed runtime and elevated when allowed", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      sandboxInfo: {
        enabled: true,
        workspaceDir: "/tmp/sandbox",
        workspaceAccess: "ro",
        agentWorkspaceMount: "/agent",
        elevated: { allowed: true, defaultLevel: "on" },
      },
    });

    expect(prompt).toContain("Você está rodando em um runtime em sandbox");
    expect(prompt).toContain("Subagentes permanecem em sandbox");
    expect(prompt).toContain("O usuário pode alternar com /elevated on|off|ask|full.");
    expect(prompt).toContain("Nível elevado atual: on");
  });

  it("includes reaction guidance when provided", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/zero",
      reactionGuidance: {
        level: "minimal",
        channel: "Telegram",
      },
    });

    expect(prompt).toContain("## Reações");
    expect(prompt).toContain("Reações estão ativadas para Telegram no modo MÍNIMO.");
  });
});
