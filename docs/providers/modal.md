---
summary: "Use high-performance models via Modal Labs in ZERO"
read_when:
  - You want to use Modal Labs as a model provider for GLM-5 FP8
---
# Modal Labs

Modal Labs provides high-performance inference endpoints. ZERO supports Modal natively, specifically optimized for extreme-low-latency models like **GLM-5 FP8**.

## Quick setup

1) Set your Modal API Key (optional if using public endpoints, but recommended).
2) Run onboarding:

```bash
zero onboard --auth-choice modal-api-key
```

The default model is set to:

```
modal/glm-5-fp8
```

## Config example

```json5
{
  models: {
    mode: "merge",
    providers: {
      modal: {
        baseUrl: "https://api.us-west-2.modal.direct/v1",
        api: "openai-completions",
        models: [
          {
            id: "glm-5-fp8",
            name: "GLM-5 FP8 (Modal)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## Model catalog

| Model ID | Context window | Max tokens | Reasoning | Input |
| --- | --- | --- | --- | --- |
| `glm-5-fp8` | 128000 | 8192 | true | text |

## Benefits

- **Extreme Low Latency:** Optimized for real-time agentic interactions.
- **Quantization (FP8):** Delivers near-original performance with much faster generation times.
- **Agentic Ready:** High reliability for tool calling and complex reasoning.
