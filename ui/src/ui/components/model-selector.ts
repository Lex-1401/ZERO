
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { GatewayModel, TelemetrySummary } from "../types";

@customElement("zero-model-selector")
export class ZeroModelSelector extends LitElement {
    @property({ type: Array }) models: GatewayModel[] = [];
    @property({ type: Array }) configuredProviders: string[] = [];
    @property({ type: String }) selectedModel = "";
    @property({ type: Object }) usage: TelemetrySummary | null = null;

    @state() private isOpen = false;

    // Disable Shadow DOM to inherit global styles
    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("click", this.handleDocumentClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("click", this.handleDocumentClick);
    }

    private handleDocumentClick = (e: MouseEvent) => {
        if (!this.isOpen) return;
        const target = e.target as HTMLElement;
        if (!this.contains(target)) {
            this.isOpen = false;
        }
    };

    private toggleOpen(e: Event) {
        e.stopPropagation();
        this.isOpen = !this.isOpen;
    }

    private selectModel(modelId: string) {
        this.selectedModel = modelId;
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent("select", {
            detail: { model: modelId },
            bubbles: true,
            composed: true
        }));
    }

    private getUsage(modelId: string) {
        if (!this.usage?.modelBreakdown) return null;
        return this.usage.modelBreakdown.find(m => m.model === modelId);
    }

    private getMaxUsage() {
        if (!this.usage?.modelBreakdown) return 0;
        return Math.max(...this.usage.modelBreakdown.map(m => m.count));
    }

    render() {
        const availableModels = this.models.filter(m => this.configuredProviders.includes(m.provider));
        const otherModels = this.models.filter(m => !this.configuredProviders.includes(m.provider));

        // Sort available models by usage (descending)
        availableModels.sort((a, b) => {
            const usageA = this.getUsage(a.id)?.count || 0;
            const usageB = this.getUsage(b.id)?.count || 0;
            return usageB - usageA;
        });

        const selectedName = this.models.find(m => m.id === this.selectedModel)?.name || "Selecionar Modelo";
        const maxUsage = this.getMaxUsage();

        const renderModelItem = (m: GatewayModel) => {
            const usage = this.getUsage(m.id);
            const count = usage?.count || 0;
            const percent = maxUsage > 0 ? (count / maxUsage) * 100 : 0;
            const isSelected = this.selectedModel === m.id;

            return html`
        <div 
          class="model-item ${isSelected ? "selected" : ""}" 
          @click=${() => this.selectModel(m.id)}
          style="padding: 10px 12px; cursor: pointer; border-radius: 8px; transition: background 0.1s; display: flex; flex-direction: column; gap: 4px;"
        >
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500; font-size: 13px; color: ${isSelected ? "var(--text-main)" : "var(--text-muted)"};">
              ${m.name}
            </span>
            ${count > 0 ? html`
              <span style="font-size: 11px; color: var(--text-dim); font-family: monospace;">
                ${new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(count)}
              </span>
            ` : nothing}
          </div>
          
          ${maxUsage > 0 ? html`
            <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; width: 100%;">
              <div style="height: 100%; width: ${Math.max(2, percent)}%; background: ${isSelected ? "var(--accent-main)" : "var(--text-dim)"}; opacity: ${count > 0 ? 0.8 : 0.1}; border-radius: 2px;"></div>
            </div>
          ` : nothing}
        </div>
      `;
        };

        return html`
      <div style="position: relative;">
        <!-- Trigger Button -->
        <button 
          @click=${this.toggleOpen}
          style="appearance: none; background: transparent; border: none; font-size: 11px; font-weight: 500; color: var(--text-muted); padding: 4px 8px; cursor: pointer; outline: none; display: flex; align-items: center; gap: 6px; border-radius: 6px; transition: all 0.2s; background: rgba(255,255,255,0.03);"
          class="hover-lift"
        >
          <span style="max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${selectedName}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <!-- Dropdown Menu -->
        ${this.isOpen ? html`
          <div 
            class="model-dropdown-menu"
            style="
              position: absolute; 
              bottom: 100%; 
              left: 0; 
              margin-bottom: 8px;
              width: 260px; 
              max-height: 400px;
              overflow-y: auto;
              background: #1a1a1a; 
              border: 1px solid rgba(255,255,255,0.1); 
              border-radius: 12px; 
              padding: 6px; 
              z-index: 1000; 
              box-shadow: 0 10px 40px rgba(0,0,0,0.5);
              backdrop-filter: blur(10px);
            "
          >
            ${availableModels.length > 0 ? html`
              <div style="font-size: 10px; font-weight: 700; color: var(--text-dim); padding: 8px 12px 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                Disponíveis
              </div>
              ${availableModels.map(renderModelItem)}
            ` : nothing}

            ${otherModels.length > 0 ? html`
              <div style="font-size: 10px; font-weight: 700; color: var(--text-dim); padding: 12px 12px 4px; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4px;">
                Outros Modelos
              </div>
              ${otherModels.map(renderModelItem)}
            ` : nothing}
          </div>
        ` : nothing}
      </div>
      <style>
        .model-item:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .model-item.selected {
          background: rgba(var(--accent-rgb), 0.1) !important;
        }
      </style>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "zero-model-selector": ZeroModelSelector;
    }
}
