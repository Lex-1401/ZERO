import { html, nothing } from "lit";
import { t } from "../../i18n.js";
import { icons } from "../../icons.js";

export function renderChatComposer(props: any) {
  const canCompose = props.connected;
  const isBusy = props.sending || props.stream !== null;
  const canAbort = Boolean(props.canAbort && props.onAbort);
  const placeholder = props.connected
    ? t("chat.placeholder.connected" as any)
    : t("chat.placeholder.disconnected" as any);

  return html`
    <div class="chat-compose-wrapper" style="padding: 24px; position: absolute; bottom: 0; left: 0; right: 0; pointer-events: none; background: linear-gradient(to top, var(--bg-main) 80%, transparent);">
      <div class="chat-compose" style="pointer-events: auto; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); padding: 8px; display: flex; flex-direction: column;">
          ${
            props.chatAttachments?.length
              ? html`
            <div class="chat-attachments" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px;">
                ${props.chatAttachments.map(
                  (f: any, i: number) => html`
                    <div class="attachment-chip" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); padding: 4px 8px; border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-main);">
                        <span style="max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</span>
                        <button class="btn btn--icon btn--xs" style="width: 16px; height: 16px; min-width: 16px; padding: 0; color: var(--text-muted);" @click=${() => {
                          const next = [...props.chatAttachments];
                          next.splice(i, 1);
                          props.onAttachmentsChange?.(next);
                        }}>${icons.x}</button>
                    </div>`,
                )}
            </div>`
              : nothing
          }
          <div class="chat-compose__field">
              <textarea style="background: transparent; border: none; padding: 12px; font-size: 14px; line-height: 1.5; resize: none; width: 100%; outline: none; color: var(--text-main); font-family: var(--font-sans);" rows="1" .value=${props.draft} ?disabled=${!props.connected} @keydown=${(
                e: any,
              ) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canCompose) props.onSend();
                }
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
              }} @input=${(e: any) => {
                props.onDraftChange(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
              }} placeholder=${placeholder}></textarea>
          </div>
          <div class="chat-compose__actions" style="display: flex; justify-content: space-between; padding: 0 8px 4px 8px;">
               <div style="display: flex; gap: 2px; align-items: center;">
                 ${props.models?.length ? html`<zero-model-selector .models=${props.models} .configuredProviders=${props.configuredProviders || []} .selectedModel=${props.selectedModel || ""} .usage=${props.usage || null} @select=${(e: any) => props.onModelChange?.(e.detail.model)} style="margin-right: 4px; padding-right: 8px; border-right: 1px solid var(--border-subtle);"></zero-model-selector>` : nothing}
                 <button class="btn btn--icon" title="${t("chat.compose.nova_sessao" as any)}" ?disabled=${!props.connected || (!canAbort && props.sending)} @click=${() => {
                   try {
                     if (navigator.vibrate) navigator.vibrate(50);
                   } catch (e) {}
                   canAbort ? props.onAbort?.() : props.onNewSession();
                 }}>${canAbort ? icons.stop : icons.plus}</button>
                 <input type="file" id="chat-file-input" multiple style="display: none;" @change=${(
                   e: any,
                 ) => {
                   if (e.target.files && props.onAttachmentsChange)
                     props.onAttachmentsChange([
                       ...(props.chatAttachments || []),
                       ...Array.from(e.target.files),
                     ]);
                   e.target.value = "";
                 }} />
                 <button class="btn btn--icon" title="${t("chat.compose.anexar" as any)}" ?disabled=${!props.connected || props.sending} @click=${() => (document.getElementById("chat-file-input") as any)?.click()}>${icons.paperclip}</button>
                 <button class="btn btn--icon ${props.chatRecording ? "btn--active" : ""}" title="${props.chatRecording ? t("chat.compose.gravar_stop" as any) : t("chat.compose.gravar_start" as any)}" ?disabled=${!props.connected || props.sending} @click=${props.onToggleRecording} style="position: relative; ${props.chatRecording ? "color: var(--danger);" : ""}">${props.chatRecording ? icons.stop : icons.mic}${
                   props.chatRecording
                     ? html`
                         <span
                           class="recording-pulse"
                           style="
                             position: absolute;
                             top: 0;
                             left: 0;
                             right: 0;
                             bottom: 0;
                             border: 2px solid var(--danger);
                             border-radius: 50%;
                             animation: pulse 1.5s infinite;
                             pointer-events: none;
                           "
                         ></span>
                       `
                     : nothing
                 }</button>
               </div>
              <button class="btn primary" ?disabled=${!props.connected || (!props.draft.trim() && !props.chatAttachments?.length)} @click=${() => {
                try {
                  if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                } catch (e) {}
                props.onSend();
              }}>${isBusy ? t("chat.enqueue" as any) : t("chat.send" as any)} ${icons.arrowUp}</button>
          </div>
      </div>
      ${props.queue.length ? html`<div style="margin-top: 12px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; pointer-events: auto; box-shadow: var(--shadow-vision);"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><div style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${t("chat.queue.title" as any)} (${props.queue.length})</div>${!isBusy ? html`<button class="btn primary btn--xs" style="height: 24px; padding: 0 8px; font-size:10px;" @click=${() => props.onSend()}>${t("chat.queue.process" as any)}</button>` : nothing}</div>${props.queue.map((item: any) => html`<div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: rgba(255,255,255,0.03); margin-top: 4px; border: 1px solid rgba(255,255,255,0.02);"><div style="flex: 1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8;">${item.text}</div><button class="btn btn--icon btn--xs" style="width: 20px; height: 20px; border: none; background: transparent;" @click=${() => props.onQueueRemove(item.id)} title="${t("chat.compose.cancelar" as any)}">${icons.x}</button></div>`)}</div>` : nothing}
    </div>
  `;
}
