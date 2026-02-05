# 🔧 FIX TEMPLATE: Telegram Bot Tests

## Problema Identificado

**Root Cause:** Mocks não estão capturando handlers registrados via `registerTelegramHandlers()`

**Padrão de Falha:**

```
❌ expected "vi.fn()" to be called 1 times, but got 0 times
```

**Arquivos Afetados:** ~90 testes do Telegram Bot

---

## Análise Técnica

### Fluxo do Código Real

```typescript
// 1. Bot é criado
const bot = new Bot(token);

// 2. Handlers são registrados DEPOIS
registerTelegramHandlers({ bot, processMessage, ... });

// 3. Dentro de registerTelegramHandlers
bot.on("message", async (ctx) => {
  await processMessage(ctx);
});

bot.on("callback_query", async (ctx) => {
  // Handle callback
});
```

### Problema no Mock

```typescript
// Mock atual (NÃO FUNCIONA)
const onSpy = vi.fn();

vi.mock("grammy", () => ({
  Bot: class {
    on = onSpy;  // ❌ Spy é uma referência estática
  }
}));

// Quando bot.on() é chamado, onSpy não é atualizado
```

---

## Soluções Possíveis

### Opção 1: Mock Dinâmico (RECOMENDADO)

```typescript
// Criar um spy que captura chamadas dinâmicas
const handlers = new Map<string, Function>();

const onSpy = vi.fn((event: string, handler: Function) => {
  handlers.set(event, handler);
});

vi.mock("grammy", () => ({
  Bot: class {
    on = onSpy;  // ✅ Agora captura corretamente
    
    // Método helper para testes
    __getHandler(event: string) {
      return handlers.get(event);
    }
  }
}));

// No teste
const handler = bot.__getHandler("message");
await handler(mockCtx);
```

### Opção 2: Mock de Módulo Completo

```typescript
// Mock registerTelegramHandlers diretamente
vi.mock("./bot-handlers.js", () => ({
  registerTelegramHandlers: vi.fn((opts) => {
    // Registrar handlers manualmente para teste
    opts.bot.on("message", opts.processMessage);
  })
}));
```

### Opção 3: Refatorar para Testabilidade

```typescript
// Expor handlers como funções exportadas
export function createMessageHandler(opts) {
  return async (ctx) => {
    await processMessage(ctx);
  };
}

// No bot.ts
const messageHandler = createMessageHandler({ processMessage, ... });
bot.on("message", messageHandler);

// No teste
import { createMessageHandler } from "./bot-handlers.js";
const handler = createMessageHandler({ processMessage: mockProcess });
await handler(mockCtx);
```

---

## Implementação Recomendada

### Passo 1: Atualizar Mock do Bot

```typescript
// bot.create-telegram-bot.installs-grammy-throttler.test.ts

const handlers = new Map<string, Function>();
const onSpy = vi.fn((event: string, handler: Function) => {
  handlers.set(event, handler);
  return undefined;
});

vi.mock("grammy", () => ({
  Bot: class {
    api = apiStub;
    use = middlewareUseSpy;
    on = onSpy;  // ✅ Agora captura handlers
    stop = stopSpy;
    command = commandSpy;
    
    constructor(
      public token: string,
      public options?: {
        client?: { fetch?: typeof fetch; timeoutSeconds?: number };
      },
    ) {
      botCtorSpy(token, options);
    }
  },
  InputFile: class {},
  webhookCallback: vi.fn(),
}));

// Helper para pegar handlers
const getHandler = (event: string) => {
  const handler = handlers.get(event);
  if (!handler) throw new Error(`Handler not found for event: ${event}`);
  return handler as (ctx: Record<string, unknown>) => Promise<void>;
};
```

### Passo 2: Atualizar Testes

```typescript
// ANTES (não funciona)
it("routes callback_query payloads as messages", async () => {
  createTelegramBot({ token: "tok" });
  const callbackHandler = onSpy.mock.calls.find(
    (call) => call[0] === "callback_query"
  )?.[1];
  // ❌ callbackHandler é undefined
});

// DEPOIS (funciona)
it("routes callback_query payloads as messages", async () => {
  createTelegramBot({ token: "tok" });
  const callbackHandler = getHandler("callback_query");
  // ✅ callbackHandler existe
  
  await callbackHandler({
    callbackQuery: { /* ... */ },
    me: { username: "zero_bot" },
    getFile: async () => ({ download: async () => new Uint8Array() }),
  });
  
  expect(replySpy).toHaveBeenCalledTimes(1);
});
```

---

## Checklist de Implementação

- [ ] Atualizar mock do Bot para capturar handlers dinamicamente
- [ ] Criar helper `getHandler()` para recuperar handlers registrados
- [ ] Atualizar todos os testes para usar `getHandler()` ao invés de `onSpy.mock.calls`
- [ ] Remover função `getOnHandler()` antiga (linha 132-136)
- [ ] Rodar testes e verificar se passam
- [ ] Aplicar mesmo padrão para outros arquivos de teste do Telegram

---

## Arquivos a Modificar

1. ✅ `bot.create-telegram-bot.installs-grammy-throttler.test.ts`
2. ⚠️ `bot.create-telegram-bot.matches-tg-prefixed-allowfrom-entries-case-insensitively.test.ts`
3. ⚠️ `bot.create-telegram-bot.matches-usernames-case-insensitively-grouppolicy-is.test.ts`
4. ⚠️ `bot.create-telegram-bot.routes-dms-by-telegram-accountid-binding.test.ts`
5. ⚠️ `bot.create-telegram-bot.blocks-all-group-messages-grouppolicy-is.test.ts`
6. ⚠️ `bot.create-telegram-bot.dedupes-duplicate-callback-query-updates-by-update.test.ts`
7. ⚠️ `bot.create-telegram-bot.sends-replies-without-native-reply-threading.test.ts`
8. ⚠️ `bot.create-telegram-bot.applies-topic-skill-filters-system-prompts.test.ts`
9. ⚠️ `bot.create-telegram-bot.accepts-group-messages-mentionpatterns-match-without-botusername.test.ts`

---

## Estimativa de Tempo

- **Implementação do Fix:** 2-3 horas
- **Teste e Validação:** 1-2 horas
- **Total:** 3-5 horas

---

## Próximos Passos

1. Implementar Opção 1 (Mock Dinâmico) no primeiro arquivo de teste
2. Validar que os 3 testes passam
3. Aplicar o mesmo padrão nos outros 8 arquivos
4. Rodar suite completa do Telegram
5. Documentar mudanças no README

---

**Status:** 🟡 READY TO IMPLEMENT  
**Prioridade:** 🔴 ALTA  
**Impacto:** ~90 testes corrigidos
