
export function createEditorSubmitHandler(params: {
    editor: any;
    handleCommand: (value: string) => Promise<void> | void;
    sendMessage: (value: string) => Promise<void> | void;
    handleBangLine: (value: string) => Promise<void> | void;
}) {
    return (text: string) => {
        if (text.startsWith("/")) return params.handleCommand(text);
        if (text.startsWith("!")) return params.handleBangLine(text);
        return params.sendMessage(text);
    };
}
