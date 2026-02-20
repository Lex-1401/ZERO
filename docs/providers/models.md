---
summary: "Provedores de modelos (LLMs) suportados pelo ZERO"
read_when:
  - Você deseja escolher um provedor de modelo
  - Você deseja exemplos rápidos de configuração para autenticação LLM + seleção de modelo
---
# Provedores de Modelos

O ZERO pode usar muitos provedores de LLM. Escolha um, autentique-se e defina o modelo padrão como `provedor/modelo`.

## Destaque: Venius (Venice AI)

Venius é nossa configuração recomendada da Venice AI para inferência com foco em privacidade, com a opção de usar o Opus para as tarefas mais difíceis.

- Padrão: `venice/llama-3.3-70b`
- Melhor geral: `venice/claude-opus-45` (O Opus continua sendo o mais forte)

Consulte [Venice AI](/providers/venice).

## Início rápido (duas etapas)

1) Autentique-se com o provedor (geralmente via `zero onboard`).
2) Defina o modelo padrão:

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## Provedores suportados (conjunto inicial)

- [OpenAI (API + Codex)](/providers/openai)
- [Anthropic (API + Claude Code CLI)](/providers/anthropic)
- [OpenRouter](/providers/openrouter)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Moonshot AI (Kimi + Kimi Code)](/providers/moonshot)
- [Synthetic](/providers/synthetic)
- [OpenCode Zen](/providers/opencode)
- [Z.AI](/providers/zai)
- [GLM models](/providers/glm)
- [MiniMax](/providers/minimax)
- [Venius (Venice AI)](/providers/venice)
- [Amazon Bedrock](/bedrock)

Para o catálogo completo de provedores (xAI, Groq, Mistral, etc.) e configuração avançada, consulte [Provedores de modelos](/concepts/model-providers).
