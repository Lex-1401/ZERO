import { describe, expect, it, vi } from "vitest";

import { createEditorSubmitHandler } from "./tui.js";

describe("createEditorSubmitHandler", () => {
  it("adds submitted messages to editor history", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand: vi.fn(),
      sendMessage: vi.fn(),
      handleBangLine: vi.fn(),
    });

    await handler("hello world");

    expect(editor.setText).toHaveBeenCalledWith("");
    expect(editor.addToHistory).toHaveBeenCalledWith("hello world");
  });

  it("trims input before adding to history", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand: vi.fn(),
      sendMessage: vi.fn(),
      handleBangLine: vi.fn(),
    });

    await handler("   hi   ");

    expect(editor.addToHistory).toHaveBeenCalledWith("hi");
  });

  it("does not add empty-string submissions to history", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand: vi.fn(),
      sendMessage: vi.fn(),
      handleBangLine: vi.fn(),
    });

    await handler("");

    expect(editor.addToHistory).not.toHaveBeenCalled();
  });

  it("does not add whitespace-only submissions to history", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand: vi.fn(),
      sendMessage: vi.fn(),
      handleBangLine: vi.fn(),
    });

    await handler("   ");

    expect(editor.addToHistory).not.toHaveBeenCalled();
  });

  it("routes slash commands to handleCommand", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleCommand = vi.fn();
    const sendMessage = vi.fn();

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand,
      sendMessage,
      handleBangLine: vi.fn(),
    });

    await handler("/models");

    expect(editor.addToHistory).toHaveBeenCalledWith("/models");
    expect(handleCommand).toHaveBeenCalledWith("/models");
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("routes normal messages to sendMessage", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleCommand = vi.fn();
    const sendMessage = vi.fn();

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand,
      sendMessage,
      handleBangLine: vi.fn(),
    });

    await handler("hello");

    expect(editor.addToHistory).toHaveBeenCalledWith("hello");
    expect(sendMessage).toHaveBeenCalledWith("hello");
    expect(handleCommand).not.toHaveBeenCalled();
  });

  it("routes bang-prefixed lines to handleBangLine", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleBangLine = vi.fn();

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand: vi.fn(),
      sendMessage: vi.fn(),
      handleBangLine,
    });

    await handler("!ls");

    expect(handleBangLine).toHaveBeenCalledWith("!ls");
  });

  it("treats a lone ! as a normal message", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const sendMessage = vi.fn();

    const handler = createEditorSubmitHandler({
      editor,
      handleCommand: vi.fn(),
      sendMessage,
      handleBangLine: vi.fn(),
    });

    await handler("!");

    expect(sendMessage).toHaveBeenCalledWith("!");
  });
});
