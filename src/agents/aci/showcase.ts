
import { setTimeout } from "timers/promises";

// Helper to simulate "typing" or processing delay
async function delay(ms: number) {
    await setTimeout(ms);
}

function log(msg: string, color: string = "\x1b[37m") {
    console.log(`${color}${msg}\x1b[0m`);
}

function agentThought(text: string) {
    log(`\n🧠 AGENT THINKING:\n<think>${text}</think>`, "\x1b[36m"); // Cyan
}

function toolCall(name: string, args: any) {
    log(`\n🛠️ TOOL CALL: ${name}(${JSON.stringify(args)})`, "\x1b[33m"); // Yellow
}

function toolResult(result: any) {
    log(`✅ RESULT: ${JSON.stringify(result, null, 2)}`, "\x1b[32m"); // Green
}

async function runShowcase() {
    console.clear();
    log("================================================================", "\x1b[35m");
    log("      ZERO ACI: REAL-TIME SESSION SHOWCASE", "\x1b[35m");
    log("================================================================", "\x1b[35m");

    await delay(1000);

    // SCENARIO 1: FIRST TIME (The Hard Way)
    log("\n👤 USER: Go to GitHub login page and sign in as 'dev_zero'.", "\x1b[1m");

    await delay(1500);
    agentThought(
        "User wants me to login to GitHub. " +
        "Since I am trained on ACI protocols, I must first check if I have a procedural memory for this task using `aci_recall`."
    );

    await delay(1000);
    toolCall("aci_recall", { taskDescription: "login github" });

    await delay(800);
    toolResult({ found: false, message: "No relevant experience found." });

    await delay(1000);
    agentThought(
        "I don't have a memory for this yet. I'll have to do it manually. " +
        "First, I'll navigate to the login page."
    );

    toolCall("browser", { action: "navigate", targetUrl: "https://github.com/login" });
    await delay(1000);
    toolResult({ ok: true, status: 200, url: "https://github.com/login" });

    await delay(1000);
    agentThought(
        "Now I'm at the page. Instead of a raw screenshot, " +
        "I'll use `aci_scan` to get a structured view of the interactive elements."
    );

    toolCall("browser", { action: "aci_scan" });
    await delay(1500);

    log(`\n👁️ ACI VISION SYSTEM RETURNS PROMPT:`, "\x1b[35m");
    log(`
  Current Page: Sign in to GitHub (https://github.com/login)
  Interactive Elements:
  [ID: 10] INPUT "Username or email address" at (300, 200)
  [ID: 11] INPUT "Password" at (300, 260)
  [ID: 12] LINK "Forgot password?" at (450, 280)
  [ID: 13] BUTTON "Sign in" at (300, 320)
  `, "\x1b[90m"); // Gray

    await delay(1500);
    agentThought(
        "I see the form clearly. ID 10 is username, ID 11 is password, ID 13 is submit. " +
        "I will fill them and click submit."
    );

    toolCall("browser", {
        action: "act",
        request: {
            kind: "fill",
            fields: [
                { targetId: 10, text: "dev_zero" },
                { targetId: 11, text: "********" }
            ]
        }
    });
    toolResult({ ok: true });

    toolCall("browser", { action: "act", request: { kind: "click", targetId: 13 } });
    await delay(1500);
    toolResult({ ok: true, newUrl: "https://github.com/" });

    await delay(1000);
    agentThought(
        "Login successful. I am now on the dashboard. " +
        "This was a complex task. I should SAVE this trajectory so I don't have to figure out the IDs again."
    );

    toolCall("aci_remember", {
        taskId: "github-login",
        description: "Login to GitHub with username and password",
        url: "https://github.com/login",
        success: true,
        steps: [
            { action: "fill", fields: [{ id: 10, name: "user" }, { id: 11, name: "pass" }] },
            { action: "click", targetId: 13 }
        ]
    });
    toolResult({ success: true, message: "Experience stored." });

    // SCENARIO 2: SECOND TIME (The ACI Way)
    log("\n\n----------------------------------------------------------------", "\x1b[35m");
    log("      ... 2 DAYS LATER ...", "\x1b[35m");
    log("----------------------------------------------------------------", "\x1b[35m");

    log("\n👤 USER: Sign in to GitHub again.", "\x1b[1m");

    await delay(1500);
    agentThought(
        "Checking memory first..."
    );

    toolCall("aci_recall", { taskDescription: "login github" });
    await delay(800);

    toolResult({
        found: true,
        description: "Login to GitHub with username and password",
        trajectory: [
            { action: "fill", fields: [{ id: 10, name: "user" }, { id: 11, name: "pass" }] },
            { action: "click", targetId: 13 }
        ]
    });

    await delay(1000);
    agentThought(
        "I found a memory! I don't need to scan and analyze. " +
        "I can just execute the known trajectory efficiently."
    );

    toolCall("browser", { action: "act", request: { kind: "run_trajectory", id: "github-login" } });
    log("\n🚀 AGENT EXECUTING OPTIMIZED PATH...", "\x1b[32m");

    await delay(1000);
    log("\n✅ SESSION COMPLETE.", "\x1b[35m");
}

await runShowcase(); // Await to satisfy no-floating-promises
