# Zero Script & Digital Roles

Zero Script allows you to define lightweight "Micro-Agents" or "Digital Roles" using a simple JSON configuration file. These roles encapsulate logic, personality, tools, and background schedules, allowing you to switch contexts instantly.

## 1. Defining a Role

Create a JSON file in `~/.zero/roles/`. For example `~/.zero/roles/analyst.json`.

```json
{
  "name": "Market Analyst",
  "description": "Expert financial analyst that monitors market trends.",
  "systemPrompt": "You are a senior financial analyst. Always provide data-backed insights. Use tools to verify market data before answering.",
  "skills": ["financial-analysis", "web-search"],
  "model": {
    "thinking": "gemini-2.0-flash-thinking-exp"
  },
  "cronJobs": [
    {
      "schedule": "0 9 * * 1-5",
      "action": "message",
      "message": "Market open: Check major indices and report significant pre-market movers.",
      "description": "Morning market briefing"
    }
  ]
}
```

### Fields

- `name`: Unique identifier.
- `description`: Human-readable description.
- `systemPrompt`: Additional instructions injected into the agent's core prompt.
- `skills`: List of skills to activate (must correspond to `skills/*.md` or built-ins).
- `model`: (Optional) Model preferences.
- `cronJobs`: (Optional) Background tasks.

## 2. Running a Role

Currently, you can run a role by passing the `--role` flag to the session runner (feature in progress) or by ensuring the role is loaded in your `zero.config.json` (planned).

*Dev Note:* To test manually, you can inject the role in `src/agents/pi-embedded-runner/run/attempt.ts` or use the experimental `zero role run <name>` command (if implemented).

## 3. Active Scheduling (Cron)

Roles can define their own schedule. When a role is active or synchronized, its cron jobs are added to the system scheduler.

- `schedule`: Cron expression (e.g. `0 9 * * 1-5`).
- `action`: `message` to prompt the agent, or `tool` to request a tool execution.
- `message`: The text to prompt the agent with.

## 4. Simplified Model API

To add new models for your roles, edit `~/.zero/models.json`:

```json
{
  "models": [
    {
      "id": "my-custom-model",
      "provider": "openai",
      "model": "gpt-4o-custom"
    }
  ]
}
```

These models are then available to referenced in your Role definition via `"model": { "chat": "my-custom-model" }`.
