import { describe, it, expect, beforeEach } from "vitest";

import "./app.js";

describe("Zero App Integration", () => {
    beforeEach(async () => {
        document.body.innerHTML = "<zero-app></zero-app>";
        const app = document.querySelector("zero-app") as any;
        if (app) await app.updateComplete;
    });

    it("should initialize all stores", async () => {
        const app = document.querySelector("zero-app") as any;
        expect(app).not.toBeNull();
        await app.updateComplete;

        expect(app.chatStore).toBeDefined();
        expect(app.configStore).toBeDefined();
        expect(app.cronStore).toBeDefined();
        expect(app.playgroundStore).toBeDefined();
        expect(app.sessionStore).toBeDefined();
    });

    it("should default to chat or overview tab", async () => {
        const app = document.querySelector("zero-app") as any;
        await app.updateComplete;
        // Depending on routing/settings, it might be overview
        expect(["chat", "overview"]).toContain(app.tab);
    });

    it("should persist playground state when switching tabs", async () => {
        const app = document.querySelector("zero-app") as any;
        await app.updateComplete;

        // 1. Switch to Playground
        app.tab = "playground";
        await app.updateComplete;

        // 2. Type in playground (simulating store update)
        app.playgroundStore.userPrompt = "Integration Test State";
        app.playgroundStore.requestUpdate();
        await app.updateComplete;

        // 3. Switch away to Config
        app.tab = "config";
        await app.updateComplete;

        // 4. Switch back to Playground
        app.tab = "playground";
        await app.updateComplete;

        // 5. Verify state persisted
        expect(app.playgroundStore.userPrompt).toBe("Integration Test State");
    });

    it("should allow navigating between views via stores", async () => {
        const app = document.querySelector("zero-app") as any;
        await app.updateComplete;

        app.setTab("logs");
        await app.updateComplete;
        expect(app.tab).toBe("logs");

        app.setTab("chat");
        await app.updateComplete;
        expect(app.tab).toBe("chat");
    });
});
