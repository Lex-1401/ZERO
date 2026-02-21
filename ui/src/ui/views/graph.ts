import { LitElement, html, css, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icons } from "../icons";

// --- Types ---
type GraphNode = { id: string; name: string; type: string; description?: string; x?: number; y?: number; vx?: number; vy?: number };
type GraphEdge = { source_id: string; target_id: string; relation: string; description?: string };

// --- Force Graph Component ---
@customElement("zero-force-graph")
export class ZEROForceGraph extends LitElement {
  @property({ type: Object }) data: { nodes: GraphNode[]; edges: GraphEdge[] } | null = null;
  @property({ type: Array }) thinkingNodeIds: string[] = [];

  @state() private nodes: GraphNode[] = [];
  @state() private links: { source: GraphNode; target: GraphNode; relation: string }[] = [];
  @state() private simulationRunning = false;
  @state() private transform = { x: 0, y: 0, k: 1 };

  private isDragging = false;
  private lastMouse = { x: 0, y: 0 };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: var(--bg-main, #000);
      position: relative;
      overflow: hidden;
    }
    
    svg {
      width: 100%;
      height: 100%;
      cursor: grab;
      background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    
    svg:active {
      cursor: grabbing;
    }

    .node-circle {
      fill: var(--bg-surface, #1e1e1e);
      stroke: var(--border-subtle, #333);
      stroke-width: 1.5px;
      transition: all 0.2s ease;
    }
    
    .node-circle:hover {
        fill: var(--bg-surface-2, #2c2c2c);
        stroke: var(--accent-blue, #007aff);
        stroke-width: 2px;
        filter: drop-shadow(0 0 4px rgba(0, 122, 255, 0.5));
    }

    .node-circle.active {
        stroke: var(--accent-magenta, #ff2d55);
        stroke-width: 2px;
        filter: drop-shadow(0 0 6px rgba(255, 45, 85, 0.5));
    }
    
    .node-label {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 10px;
      font-weight: 500;
      fill: var(--text-muted, #888);
      pointer-events: none;
      text-anchor: middle;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    }
    
    .edge-path {
      stroke: var(--border-subtle, #333);
      stroke-width: 1px;
      fill: none;
      opacity: 0.6;
    }

    .edge-label {
        font-family: monospace;
        font-size: 8px;
        fill: var(--text-dim, #555);
        text-anchor: middle;
        opacity: 0;
        transition: opacity 0.2s;
    }
    
    g:hover .edge-label {
        opacity: 1;
    }
    
    .controls {
        position: absolute;
        bottom: 24px;
        right: 24px;
        background: var(--bg-surface, #1e1e1e);
        border: 1px solid var(--border-subtle, #333);
        border-radius: 8px;
        padding: 4px;
        display: flex;
        gap: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    button {
        background: transparent;
        border: none;
        color: var(--text-main, #fff);
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
    }
    button:hover { background: rgba(255,255,255,0.1); }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has("data") && this.data) {
      this.initSimulation();
    }
  }

  firstUpdated() {
    new ResizeObserver(() => this.initSimulation()).observe(this);
  }

  private initSimulation() {
    if (!this.data) return;

    const width = this.clientWidth || 800;
    const height = this.clientHeight || 600;

    const nodeMap = new Map<string, GraphNode>();
    this.nodes = this.data.nodes.map((n) => {
      const node = {
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      };
      nodeMap.set(n.id, node);
      return node;
    });

    this.links = this.data.edges.map(e => {
      const source = nodeMap.get(e.source_id);
      const target = nodeMap.get(e.target_id);
      if (source && target) return { source, target, relation: e.relation };
      return null;
    }).filter(Boolean) as any[];

    this.startTick();
  }

  private startTick() {
    if (this.simulationRunning) return;
    this.simulationRunning = true;

    const tick = () => {
      if (!this.isConnected) { this.simulationRunning = false; return; }

      let totalVel = 0;
      const k = 140;
      const repulsion = 40000;
      const gravity = 0.05;
      const damping = 0.8;
      const width = this.clientWidth || 800;
      const height = this.clientHeight || 600;
      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < this.nodes.length; i++) {
        const n1 = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n2 = this.nodes[j];
          const dx = n1.x! - n2.x!;
          const dy = n1.y! - n2.y!;
          const d2 = dx * dx + dy * dy || 1;
          const d = Math.sqrt(d2);

          if (d < 400) {
            const f = repulsion / d2;
            const fx = (dx / d) * f;
            const fy = (dy / d) * f;
            n1.vx! += fx; n1.vy! += fy;
            n2.vx! -= fx; n2.vy! -= fy;
          }
        }
        n1.vx! += (cx - n1.x!) * gravity;
        n1.vy! += (cy - n1.y!) * gravity;
      }

      for (const link of this.links) {
        const n1 = link.source;
        const n2 = link.target;
        const dx = n1.x! - n2.x!;
        const dy = n1.y! - n2.y!;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - k) * 0.08;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        n1.vx! -= fx; n1.vy! -= fy;
        n2.vx! += fx; n2.vy! += fy;
      }

      for (const n of this.nodes) {
        n.vx! *= damping;
        n.vy! *= damping;
        n.x! += n.vx!;
        n.y! += n.vy!;
        totalVel += Math.abs(n.vx!) + Math.abs(n.vy!);
      }

      this.requestUpdate();
      if (totalVel > 1 && this.simulationRunning) requestAnimationFrame(tick);
      else this.simulationRunning = false;
    };
    requestAnimationFrame(tick);
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(5, this.transform.k + delta));
    this.transform = { ...this.transform, k: newScale };
  }

  private onMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent) {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.transform = { ...this.transform, x: this.transform.x + dx, y: this.transform.y + dy };
      this.lastMouse = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseUp() { this.isDragging = false; }

  render() {
    if (!this.data) return html``;
    const { x, y, k } = this.transform;

    return html`
        <svg 
            @wheel=${this.onWheel} 
            @mousedown=${this.onMouseDown}
            @mousemove=${this.onMouseMove}
            @mouseup=${this.onMouseUp}
            @mouseleave=${this.onMouseUp}
        >
          <g transform="translate(${x},${y}) scale(${k})">
            ${this.links.map(l => html`
                <line x1=${l.source.x} y1=${l.source.y} x2=${l.target.x} y2=${l.target.y} class="edge-path" />
                <text x=${(l.source.x! + l.target.x!) / 2} y=${(l.source.y! + l.target.y!) / 2 - 5} class="edge-label">${l.relation}</text>
            `)}
            ${this.nodes.map(n => html`
                <g transform="translate(${n.x}, ${n.y})">
                    <circle r="12" class="node-circle ${this.thinkingNodeIds.includes(n.id) ? "active" : ""}" />
                    <text dy="26" class="node-label">${n.name}</text>
                </g>
            `)}
          </g>
        </svg>
        <div class="controls">
            <button @click=${() => this.initSimulation()} title="Reorganizar">${icons.rotateCcw || "R"}</button>
            <button @click=${() => this.transform = { x: 0, y: 0, k: 1 }} title="Centralizar">${icons.maximize || "C"}</button>
        </div>
      `;
  }
}

// --- Main Render Function ---

export function renderGraph(props: {
  loading: boolean;
  data: { nodes: unknown[]; edges: unknown[] } | null;
  error: string | null;
  mode: "memory" | "actions";
  thinkingNodeIds?: string[];
  onRefresh: () => void;
  onModeChange: (mode: "memory" | "actions") => void;
}) {
  if (props.loading && !props.data) {
    return html`
      <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-dim);">
        <div class="animate-spin" style="margin-bottom: 12px; font-size: 24px;">${icons.loader}</div>
        <div style="font-size: 13px;">Mapeando Caminhos Neurais...</div>
      </div>
    `;
  }

  if (props.error) {
    return html`
       <div class="group-list" style="margin: 40px; border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px;">
            <div style="color: var(--danger); font-size: 12px; font-weight: 700;">Erro de Visualização</div>
            <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${props.error}</div>
            <button class="btn btn--sm primary" style="margin-top: 12px;" @click=${props.onRefresh}>Tentar Novamente</button>
        </div>
    `;
  }

  const { mode } = props;

  return html`
    <div class="animate-fade-in" style="height: 100%; display: flex; flex-direction: column; position: relative;">
        <!-- Floating Toolbar -->
        <div style="position: absolute; top: 24px; left: 24px; z-index: 10; display: flex; gap: 12px; align-items: center;">
           
           <div class="badge" style="height: 32px; padding: 0 12px; gap: 8px; display: flex; align-items: center; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
             <div class="status-orb success" style="box-shadow: 0 0 8px rgba(40, 205, 65, 0.6);"></div>
             <span style="font-weight: 600; color: var(--text-main);">Grafo Neural</span>
             <span style="opacity: 0.2; height: 12px; width: 1px; background: currentColor;"></span>
             <span style="font-family: var(--font-mono); font-size: 11px; opacity: 0.7;">${props.data?.nodes?.length ?? 0} NÓS</span>
           </div>
           
           <div class="segmented-control">
              <button 
                class="segmented-control__btn ${mode === "memory" ? "active" : ""}" 
                @click=${() => props.onModeChange("memory")}
              >Memória</button>
              <button 
                class="segmented-control__btn ${mode === "actions" ? "active" : ""}" 
                @click=${() => props.onModeChange("actions")}
              >Ações</button>
           </div>
        </div>
        
        <zero-force-graph .data=${props.data} .thinkingNodeIds=${props.thinkingNodeIds ?? []} style="flex: 1; border-radius: 0; border: none;"></zero-force-graph>
    </div>
  `;
}
