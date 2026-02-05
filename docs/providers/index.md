---
summary: "Provedores de modelos (LLMs) suportados pelo ZERO"
read_when:
  - Você deseja escolher um provedor de modelo
  - Você precisa de uma visão geral rápida dos backends de LLM suportados
---
# Provedores de Modelos

O ZERO pode usar muitos provedores de LLM. Escolha um provedor, autentique-se e defina o modelo padrão como `provedor/modelo`.

Procurando a documentação dos canais de chat (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.)? Consulte [Canais](/channels).

## Destaque: Venius (Venice AI)

Venius é nossa configuração recomendada da Venice AI para inferência com foco em privacidade, com a opção de usar o Opus para tarefas difíceis.

- Padrão: `venice/llama-3.3-70b`
- Melhor geral: `venice/claude-opus-45` (O Opus continua sendo o mais forte)

Consulte [Venice AI](/providers/venice).

## Início rápido

1) Autentique-se com o provedor (geralmente via `zero onboard`).
2) Defina o modelo padrão:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## Documentação dos provedores

- [OpenAI (API + Codex)](/providers/openai)
- [Anthropic (API + Claude Code CLI)](/providers/anthropic)
- [Qwen (OAuth)](/providers/qwen)
- [OpenRouter](/providers/openrouter)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Moonshot AI (Kimi + Kimi Code)](/providers/moonshot)
- [OpenCode Zen](/providers/opencode)
- [Amazon Bedrock](/bedrock)
- [Z.AI](/providers/zai)
- [GLM models](/providers/glm)
- [MiniMax](/providers/minimax)
- [Venius (Venice AI, foco em privacidade)](/providers/venice)
- [Ollama (modelos locais)](/providers/ollama)

## Provedores de transcrição

- [Deepgram (transcrição de áudio)](/providers/deepgram)

Para o catálogo completo de provedores (xAI, Groq, Mistral, etc.) e configuração avançada, consulte [Provedores de modelos](/concepts/model-providers).
