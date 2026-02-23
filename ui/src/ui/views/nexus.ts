import { html, nothing } from "lit";
import { t } from "../i18n";

import type { GatewayHelloOk } from "../gateway";
import { formatAgo, formatDurationMs } from "../format";
import type { UiSettings } from "../storage";
import { icons } from "../icons";

export type NexusProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

export function renderNexus(props: NexusProps) {
  const snapshot = props.hello?.snapshot as
    | { uptimeMs?: number; policy?: { tickIntervalMs?: number } }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : "n/d";
  const tick = snapshot?.policy?.tickIntervalMs
    ? `${snapshot.policy.tickIntervalMs}ms`
    : "n/d";

  return html`
    <div class="nexus-view animate-fade-in" style="max-width: 1080px; margin: 0 auto; padding: 24px;">
      
      <div style="display: grid; grid-template-columns: minmax(400px, 640px) 340px; gap: 40px; align-items: start;">
        
        <div>
          <div class="section-title">${t("nexus.core" as any)}</div>
          <div class="group-list">
            <div class="group-item">
              <div class="group-label">
                <div class="group-title">${t("nexus.endpoint" as any)}</div>
                <div class="group-desc">${t("nexus.endpoint.desc" as any)}</div>
              </div>
              <div class="group-content">
                <input
                  class="input-native"
                  spellcheck="false"
                  style="width: 240px;"
                  type="text"
                  .value=${props.settings.gatewayUrl}
                  @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSettingsChange({ ...props.settings, gatewayUrl: v });
    }}
                  placeholder="ws://127.0.0.1:18789"
                />
              </div>
            </div>

            <div class="group-item">
              <div class="group-label">
                <div class="group-title">${t("nexus.token" as any)}</div>
                <div class="group-desc">${t("nexus.token.desc" as any)}</div>
              </div>
              <div class="group-content">
                <input
                  class="input-native"
                  type="password"
                  style="width: 240px;"
                  .value=${props.settings.token}
                  @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSettingsChange({ ...props.settings, token: v });
    }}
                  placeholder="${t("nexus.token.placeholder" as any)}"
                />
              </div>
            </div>

            <div class="group-item">
              <div class="group-label">
                <div class="group-title">${t("nexus.masterkey" as any)}</div>
                <div class="group-desc">${t("nexus.masterkey.desc" as any)}</div>
              </div>
              <div class="group-content">
                <input
                  class="input-native"
                  type="password"
                  style="width: 240px;"
                  .value=${props.password}
                  @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onPasswordChange(v);
    }}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-3" style="margin-top: 12px;">
            <button 
              class="btn primary active-push" 
              style="width: 180px; height: 32px;"
              @click=${() => props.onConnect()} 
              ?disabled=${props.connected}
            >
              ${props.connected ? t("nexus.connected" as any) : t("nexus.connect" as any)}
            </button>
            <button class="btn active-push" @click=${() => props.onRefresh()}>
              ${icons.rotateCcw} ${t("nexus.sync" as any)}
            </button>
          </div>

          ${props.lastError ? html`
            <div class="group-list" style="margin-top: 32px; border-color: rgba(255, 59, 48, 0.3);">
              <div class="group-item" style="background: rgba(255, 59, 48, 0.05);">
                <div class="group-label">
                  <div class="group-title" style="color: var(--danger);">${t("nexus.connection_status" as any)}</div>
                  <div class="group-desc">${props.lastError.includes("1006") ? t("nexus.waiting_gateway" as any) : props.lastError}</div>
                </div>
              </div>
            </div>
          ` : nothing}

          <div class="section-title" style="margin-top: 48px;">${t("nexus.metrics" as any)}</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div class="group-list hover-lift ${!props.hello ? 'skeleton' : ''}" style="padding: 16px; min-height: 120px; transition: transform 0.2s ease;">
                <div class="text-xs font-bold text-dim uppercase tracking-wider">${t("nexus.instances" as any)}</div>
                <div style="font-size: 32px; font-weight: 800; margin-top: 8px;">${props.presenceCount}</div>
                <div class="text-xs text-dim mt-2">${t("nexus.instances.desc" as any)}</div>
            </div>
            <div class="group-list hover-lift ${!props.hello ? 'skeleton' : ''}" style="padding: 16px; min-height: 120px; transition: transform 0.2s ease;">
                <div class="text-xs font-bold text-dim uppercase tracking-wider">${t("nexus.memory" as any)}</div>
                <div style="font-size: 32px; font-weight: 800; margin-top: 8px;">${props.sessionsCount ?? "0"}</div>
                <div class="text-xs text-dim mt-2">${t("nexus.memory.desc" as any)}</div>
            </div>
            <div class="group-list hover-lift ${!props.hello ? 'skeleton' : ''}" style="padding: 16px; min-height: 120px; border-left: 3px solid var(--accent-blue); transition: transform 0.2s ease;">
                <div class="text-xs font-bold text-dim uppercase tracking-wider">${t("nexus.status" as any)}</div>
                <div style="font-size: 18px; font-weight: 800; margin-top: 14px; letter-spacing: -0.05em;">${t("nexus.status.sovereign" as any)}</div>
                <div class="text-xs text-dim mt-2">${t("nexus.status.local" as any)}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="section-title" style="text-align: center;">${t("nexus.telemetry" as any)}</div>
          <div class="group-list" style="padding: 32px 24px; display: flex; flex-direction: column; align-items: center; min-height: 380px; justify-content: center; background: radial-gradient(circle at center, rgba(0,122,255,0.05) 0%, transparent 70%);">
            
            <div style="position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
                <!-- Animated Background Glow -->
                <div style="
                    position: absolute; 
                    inset: -10px; 
                    background: radial-gradient(circle, ${props.connected ? "rgba(52, 199, 89, 0.15)" : "rgba(255, 255, 255, 0.03)"} 0%, transparent 70%); 
                    border-radius: 50%;
                    animation: ${props.connected ? "pulse 4s infinite" : "pulse 8s infinite"};
                "></div>
                
                <!-- Inner Circle -->
                <div style="
                    position: absolute;
                    inset: 30px;
                    border: 1px solid ${props.connected ? "rgba(52, 199, 89, 0.4)" : "var(--glass-border)"};
                    border-radius: 50%;
                    background: ${props.connected ? "rgba(52, 199, 89, 0.05)" : "rgba(255, 255, 255, 0.01)"};
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: ${props.connected ? "0 0 30px rgba(52, 199, 89, 0.1), inset 0 0 15px rgba(52, 199, 89, 0.05)" : "0 0 20px rgba(0,0,0,0.2)"};
                    transition: all 0.5s var(--ease-out);
                ">
                    <div style="color: ${props.connected ? "var(--success)" : "var(--text-muted)"}; transform: scale(1.6); filter: ${props.connected ? "drop-shadow(0 0 8px var(--success))" : "none"}; transition: all 0.5s ease;">
                        ${props.connected ? icons.zap : icons.plug}
                    </div>
                </div>
            </div>

            <div style="margin-top: 32px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700;">
                    ${props.connected ? t("nexus.online" as any) : t("nexus.offline" as any)}
                </div>
                <div class="text-xs text-dim mt-1" style="max-width: 200px;">
                    ${props.connected ? t("nexus.telemetry.desc" as any) : t("nexus.offline.desc" as any)}
                </div>
            </div>

            <!-- Autopilot & Vision Module -->
            <div style="margin-top: 24px; display: flex; gap: 8px; width: 100%;">
               <button class="btn primary" style="flex: 1; background: var(--accent-red); border-color: rgba(0,0,0,0.1); justify-content: center; box-shadow: 0 4px 12px rgba(255, 59, 48, 0.2);"
                  @click=${() => { /* Vision module handled via state */ }}>
                  <span style="margin-right: 6px; font-size: 10px; opacity: 0.8;">RADAR</span> ${t("nexus.autopilot" as any)}
               </button>
               <button class="btn" style="flex: 1; justify-content: center;"
                  @click=${() => document.body.classList.toggle("focus-mode")}>
                  ${icons.maximize} ${t("nexus.focus" as any)}
               </button>
            </div>

            <div style="width: 100%; margin-top: 40px; border-top: 1px solid var(--border-subtle); padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="text-align: center;">
                    <div class="text-xs font-bold text-dim uppercase">${t("common.uptime" as any)}</div>
                    <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${uptime}</div>
                </div>
                <div style="text-align: center;">
                    <div class="text-xs font-bold text-dim uppercase">${t("common.rate" as any)}</div>
                    <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${tick}</div>
                </div>
            </div>
          </div>
          
          <div class="section-title">${t("nexus.system.info" as any)}</div>
          <div class="group-list">
            <div class="group-item">
                <div class="group-label">
                    <div class="group-title">${t("nexus.sync.time" as any)}</div>
                    <div class="group-desc">${props.lastChannelsRefresh ? formatAgo(props.lastChannelsRefresh) : t("common.never" as any)}</div>
                </div>
            </div>
            <div class="group-item">
                <div class="group-label">
                    <div class="group-title">${t("nexus.version" as any)}</div>
                    <div class="group-desc">Altair 1.4.0-stable</div>
                </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;
}
