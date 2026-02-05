export function handleCodeCopyClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest(".copy-code-btn");
    if (copyBtn) {
        const wrapper = copyBtn.closest(".code-block-wrapper");
        // Find the code element inside the pre
        const codeBlock = wrapper?.querySelector("pre code");
        const text = codeBlock?.textContent || "";

        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                // Visual feedback
                const btn = copyBtn as HTMLButtonElement;
                const originalHtml = btn.innerHTML;
                const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
                btn.innerHTML = checkIcon;
                btn.style.color = "var(--accent-success)";

                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.style.color = "";
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy code:", err);
            });
        }
    }
}
