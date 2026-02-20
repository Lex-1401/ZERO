import { type ReactiveController, type ReactiveControllerHost } from "lit";

export class PlaygroundStore implements ReactiveController {
    host: ReactiveControllerHost;

    systemPrompt = "Você é um assistente de IA útil.";
    userPrompt = "Olá!";
    output = "";
    model = "gpt-4";
    temperature = 0.7;
    maxTokens = 1024;
    loading = false;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() { }
    hostDisconnected() { }

    requestUpdate() {
        this.host.requestUpdate();
    }
}
