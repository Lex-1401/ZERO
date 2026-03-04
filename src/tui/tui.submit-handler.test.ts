import { describe, expect, it, vi } from "vitest";

import { createEditorSubmitHandler } from "./tui.js";

describe("createEditorSubmitHandler", () => {
  it("routes lines starting with ! to handleBangLine", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleCommand = vi.fn();
    const sendMessage = vi.fn();
    const handleBangLine = vi.fn();

    const onSubmit = createEditorSubmitHandler({
      editor,
      handleCommand,
      sendMessage,
      handleBangLine,
    });

    await onSubmit("!ls");

    expect(handleBangLine).toHaveBeenCalledTimes(1);
    expect(handleBangLine).toHaveBeenCalledWith("!ls");
    expect(sendMessage).not.toHaveBeenCalled();
    expect(handleCommand).not.toHaveBeenCalled();
  });

  it("treats a lone ! as a normal message", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleCommand = vi.fn();
    const sendMessage = vi.fn();
    const handleBangLine = vi.fn();

    const onSubmit = createEditorSubmitHandler({
      editor,
      handleCommand,
      sendMessage,
      handleBangLine,
    });

    await onSubmit("!");

    expect(handleBangLine).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith("!");
  });

  it("does not treat leading whitespace before ! as a bang command", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleCommand = vi.fn();
    const sendMessage = vi.fn();
    const handleBangLine = vi.fn();

    const onSubmit = createEditorSubmitHandler({
      editor,
      handleCommand,
      sendMessage,
      handleBangLine,
    });

    await onSubmit("  !ls");

    expect(handleBangLine).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith("!ls");
    expect(editor.addToHistory).toHaveBeenCalledWith("!ls");
  });

  it("trims normal messages before sending and adding to history", async () => {
    const editor = {
      setText: vi.fn(),
      addToHistory: vi.fn(),
    };
    const handleCommand = vi.fn();
    const sendMessage = vi.fn();
    const handleBangLine = vi.fn();

    const onSubmit = createEditorSubmitHandler({
      editor,
      handleCommand,
      sendMessage,
      handleBangLine,
    });

    await onSubmit("  hello  ");

    expect(sendMessage).toHaveBeenCalledWith("hello");
    expect(editor.addToHistory).toHaveBeenCalledWith("hello");
  });
});
