---
description: Perform a UX audit of the ZERO Chat and Playground interfaces
---

# UX Audit Workflow

This workflow guides you through auditing the user interface of ZERO to ensure it meets the "Premium Native Style" and "Altair Edition" standards.

## 1. Prerequisites

- Ensure the gateway is running: `npm run gateway:dev`
- Ensure the UI is running: `npm run dev` in `ui/` directory
- Access <http://localhost:5173>

## 2. Checklist for Chat Interface

- [ ] **Loading States**: Verify that sending a message shows a "dots" reading indicator immediately before the stream starts.
- [ ] **Empty States**: Verify the "Welcome Stack" appears when there are no messages.
- [ ] **Code Interactivity**: Send a message requesting code. Verify that code blocks have a "Copy" button in the header.
- [ ] **Copy Feedback**: Click the "Copy" button; verify it changes to a checkmark or provides visual feedback.
- [ ] **Error Handling**: Simulate a backend error (e.g., stop the gateway). Verify that a clear, red "danger" callout appears at the top.
- [ ] **Suggestion Chips**: Click on a starter chip (e.g., "Verificar status"). It should send the message immediately.

## 3. Checklist for Playground (Laboratório)

- [ ] **Markdown Rendering**: Verify that prompts with markdown output are rendered correctly (not as plain text).
- [ ] **Code Blocks**: Verify that code blocks in the playground output also have "Copy" buttons.
- [ ] **Responsiveness**: Resize the browser window and ensure the sidebar and main areas adjust gracefully.

## 4. Design Guidelines

- **Color Palette**: Stick to the SF-like macOS Dark/Light palette defined in `design-system.css`.
- **Glassmorphism**: Use `backdrop-filter: var(--glass-blur)` for headers/composers.
- **Grids**: Ensure all components follow the 4pt grid system (`--s-1`, `--s-2`, etc.).
