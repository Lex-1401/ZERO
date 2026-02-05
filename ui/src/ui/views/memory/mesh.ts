import { LitElement, html, css, PropertyValueMap } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import * as THREE from "three";
import { ForceGraph3D } from "3d-force-graph";

/**
 * 3D Knowledge Mesh Visualizer
 * Renders the agent's memory graph using Three.js and Force Directed Layout.
 */
@customElement("zero-memory-mesh")
export class ZeroMemoryMesh extends LitElement {
  @query("#container") container!: HTMLDivElement;

  @property({ type: Array }) nodes: any[] = [];
  @property({ type: Array }) links: any[] = [];

  private graph: any;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      background: var(--bg-main, #000);
      overflow: hidden;
      border-radius: 12px;
    }
    #container {
      width: 100%;
      height: 100%;
    }
    .overlay {
      position: absolute;
      top: 16px;
      left: 16px;
      pointer-events: none;
    }
    h3 {
      margin: 0;
      color: var(--text-main, #fff);
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p {
      margin: 4px 0 0;
      color: var(--text-muted, #888);
      font-size: 11px;
    }
  `;

  firstUpdated() {
    this.initGraph();
  }

  updated(changedProperties: PropertyValueMap<any>) {
    if (changedProperties.has("nodes") || changedProperties.has("links")) {
      this.updateGraphData();
    }
  }

  initGraph() {
    // Generate dummy data if empty (for demo/development)
    const initialData = this.nodes.length ? { nodes: this.nodes, links: this.links } : this.generateDummyData();

    this.graph = ForceGraph3D()(this.container)
      .graphData(initialData)
      .nodeLabel("id")
      .nodeAutoColorBy("group")
      .linkDirectionalParticles("value")
      .linkDirectionalParticleSpeed((d: any) => d.value * 0.001)
      .backgroundColor("#00000000") // Transparent
      .showNavInfo(false);

    // Custom node rendering for "Altair" style pixels
    this.graph.nodeThreeObject((node: any) => {
      const geometry = new THREE.SphereGeometry(4);
      const material = new THREE.MeshLambertMaterial({
        color: node.color || "#007aff",
        transparent: true,
        opacity: 0.8
      });
      return new THREE.Mesh(geometry, material);
    });
  }

  updateGraphData() {
    if (this.graph) {
      this.graph.graphData({
        nodes: this.nodes,
        links: this.links
      });
    }
  }

  // Fallback data to show something "alive" immediately
  generateDummyData() {
    const N = 80;
    const gData = {
      nodes: [...Array(N).keys()].map(i => ({ id: i, group: Math.ceil(Math.random() * 5) })),
      links: [...Array(N).keys()]
        .filter(id => id)
        .map(id => ({
          source: id,
          target: Math.round(Math.random() * (id - 1)),
          value: Math.random() * 5 // link thickness/particle speed
        }))
    };
    return gData;
  }

  render() {
    return html`
      <div id="container"></div>
      <div class="overlay">
        <h3>Malha de Conhecimento</h3>
        <p>${this.nodes.length || "80"} Entidades Ativas</p>
      </div>
    `;
  }
}
