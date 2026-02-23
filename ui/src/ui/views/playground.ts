import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { icons } from "../icons";
import { toSanitizedMarkdownHtml } from "../markdown";
import { handleCodeCopyClick } from "../chat/code-copy";

export type PlaygroundProps = {
    systemPrompt: string;
    userPrompt: string;
    output: string;
    model: string | null;
    temperature: number | undefined;
    maxTokens: number | undefined;
    loading: boolean;
    onSystemPromptChange: (val: string) => void;
    onUserPromptChange: (val: string) => void;
    onModelChange: (val: string) => void;
    onTemperatureChange: (val: number) => void;
    onMaxTokensChange: (val: number) => void;
    onRun: () => void;
    onClear: () => void;
};

export function renderPlayground(props: PlaygroundProps) {
    return html`
    <div class="playground-layout animate-fade-in">
      
      <!-- Params Sidebar -->
      <aside class="playground-sidebar">
        <div class="section-title playground-header" style="margin: 0; padding: 24px;">Controles de Inferência</div>
        
        <div style="flex: 1; overflow-y: auto; padding: 0 24px 40px 24px;">
            <div class="group-list">
                <div class="group-item" style="display: block;">
                    <div class="group-label" style="margin-bottom: 8px;"><div class="group-title">Modelo</div></div>
                    <div class="group-content" style="width: 100%;">
                        <select class="select-native" style="width: 100%;" .value=${props.model} @change=${(e: Event) => props.onModelChange((e.target as HTMLSelectElement).value)}>
                            <option value="" disabled ?selected=${!props.model}>Selecione um modelo...</option>
                            <option value="llama3.2:latest">Llama 3.2 (Local)</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                            <option value="llama3-70b-8192">Llama 3 70B</option>
                            <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                        </select>
                    </div>
                </div>

                <div class="group-item" style="display: block;">
                    <div class="group-label" style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <div class="group-title">Temperatura</div>
                        <div class="group-desc">${(props.temperature ?? 0.7).toFixed(2)}</div>
                    </div>
                    <div class="group-content" style="width: 100%;">
                        <input type="range" class="range-native" min="0" max="2" step="0.01" style="width: 100%;" .value=${String(props.temperature ?? 0.7)} @input=${(e: Event) => props.onTemperatureChange(parseFloat((e.target as HTMLInputElement).value))} />
                    </div>
                </div>

                <div class="group-item" style="display: block;">
                     <div class="group-label" style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <div class="group-title">Máximo de Tokens</div>
                         <div class="group-desc">${props.maxTokens ?? 1024}</div>
                    </div>
                    <div class="group-content" style="width: 100%;">
                        <input class="input-native" type="number" min="1" max="128000" style="width: 100%;" .value=${String(props.maxTokens ?? 1024)} @input=${(e: Event) => props.onMaxTokensChange(parseInt((e.target as HTMLInputElement).value))} />
                    </div>
                </div>
            </div>

            <button class="btn primary" style="width: 100%; height: 36px; justify-content: center; font-weight: 500; font-size: 13px; box-shadow: var(--shadow-low);" ?disabled=${props.loading} @click=${props.onRun}>
                ${props.loading ? html`<span class="animate-spin" style="margin-right: 8px;">${icons.loader}</span>` : html`<span style="margin-right: 8px;">${icons.play}</span>`}
                ${props.loading ? "Processando..." : "Executar Prompt"}
             </button>
        </div>
      </aside>
  
      <div class="playground-main">
        
        <!-- Input Panes -->
        <div class="playground-inputs">
            
            <!-- System Prompt -->
            <div class="playground-pane" style="border-right: 1px solid var(--border-subtle);">
                <div class="playground-pane-header">
                    <div class="section-title" style="margin: 0; font-size: 13px;">Prompt de Sistema</div>
                </div>
                <div class="playground-pane-content">
                    <textarea class="playground-textarea" .value=${props.systemPrompt} @input=${(e: Event) => props.onSystemPromptChange((e.target as HTMLTextAreaElement).value)} placeholder="Defina a persona e as restrições do sistema..."></textarea>
                </div>
            </div>

            <!-- User Prompt -->
             <div class="playground-pane">
                <div class="playground-pane-header">
                    <div class="section-title" style="margin: 0; font-size: 13px;">Entrada de Usuário</div>
                </div>
                <div class="playground-pane-content">
                    <textarea class="playground-textarea" .value=${props.userPrompt} @input=${(e: Event) => props.onUserPromptChange((e.target as HTMLTextAreaElement).value)} placeholder="Digite sua instrução..."></textarea>
                </div>
            </div>

        </div>

        <!-- Output Pane -->
        <div class="playground-output">
             <div class="playground-pane-header">
                <div class="section-title" style="margin: 0; font-size: 13px;">Saída do Modelo</div>
                <div style="display: flex; gap: 8px;">
                     <button class="btn btn--icon btn--sm" title="Copiar" @click=${() => navigator.clipboard.writeText(props.output)}>${icons.copy}</button>
                     <button class="btn btn--icon btn--sm" title="Limpar" @click=${props.onClear}>${icons.trash}</button>
                </div>
            </div>
            
            <div class="chat-text" @click=${handleCodeCopyClick} style="flex: 1; overflow-y: auto; padding: 24px; font-size: 13px; line-height: 1.6; color: var(--text-main);">
                ${props.output ? html`<div>${unsafeHTML(toSanitizedMarkdownHtml(props.output))}</div>` : html`
                    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-dim); opacity: 0.5; gap: 16px;">
                        <div style="transform: scale(2); opacity: 0.5;">${icons.brain}</div>
                        <div>Aguardando execução...</div>
                    </div>
                `}
                ${props.loading ? html`<span class="cursor" style="display: inline-block; width: 8px; height: 14px; background: var(--accent-main); margin-left: 4px; animation: blink 1s step-end infinite;"></span>` : nothing}
            </div>
        </div>

      </div>
    </div>
    
    <style>
        @keyframes blink { 50% { opacity: 0; } }
    </style>
  `;
}
