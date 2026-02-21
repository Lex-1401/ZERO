import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { ZEROApp } from "./app";

const originalConnect = ZEROApp.prototype.connect;

function createTestApp() {
    const app = document.createElement("zero-app") as ZEROApp;
    app.style.display = "block";
    app.style.width = "720px";
    app.style.height = "1080px";
    return app;
}

beforeAll(() => {
    ZEROApp.prototype.connect = () => {
        // block websocket in tests
    };
});

afterAll(() => {
    ZEROApp.prototype.connect = originalConnect;
});

describe("VRT Theme Switching (Light/Dark Mode)", () => {
    test("maintains UI tree height consistency across theme switches", async () => {
        const app = createTestApp();
        document.body.appendChild(app);
        await app.updateComplete;

        // By default, the app applies the configured theme. Let's force dark mode.
        app.theme = "dark";
        await app.updateComplete;

        // Allow DOM to settle
        await new Promise((resolve) => setTimeout(resolve, 50));

        const darkRect = app.getBoundingClientRect();
        const darkHeight = darkRect.height;

        // Switch to Light mode
        app.theme = "light";
        await app.updateComplete;
        await new Promise((resolve) => setTimeout(resolve, 50));

        const lightRect = app.getBoundingClientRect();
        const lightHeight = lightRect.height;

        // VRT check: Height must not artificially collapse due to CSS variable fallback failures
        expect(lightHeight).toBe(darkHeight);
        // Real pixel measurement sanity check
        expect(lightHeight).toBeGreaterThan(0);

        document.body.removeChild(app);
    });
});
