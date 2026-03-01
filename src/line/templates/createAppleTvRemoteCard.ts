import { FlexBox, FlexBubble, FlexText, FlexButton, FlexComponent } from "./types.js";

/**
 * Create an Apple TV remote card with a D-pad and control rows.
 */
export function createAppleTvRemoteCard(params: {
  deviceName: string;
  status?: string;
  actionData: {
    up: string;
    down: string;
    left: string;
    right: string;
    select: string;
    menu: string;
    home: string;
    play: string;
    pause: string;
    volumeUp: string;
    volumeDown: string;
    mute: string;
  };
}): FlexBubble {
  const { deviceName, status, actionData } = params;

  const headerContents: FlexComponent[] = [
    {
      type: "text",
      text: deviceName,
      weight: "bold",
      size: "xl",
      color: "#111111",
      wrap: true,
    } as FlexText,
  ];

  if (status) {
    headerContents.push({
      type: "text",
      text: status,
      size: "sm",
      color: "#666666",
      wrap: true,
      margin: "sm",
    } as FlexText);
  }

  const makeButton = (
    label: string,
    data: string,
    style: "primary" | "secondary" = "secondary",
  ): FlexButton => ({
    type: "button",
    action: {
      type: "postback",
      label,
      data,
    },
    style,
    height: "sm",
    flex: 1,
  });

  const dpadRows: FlexComponent[] = [
    {
      type: "box",
      layout: "horizontal",
      contents: [{ type: "filler" }, makeButton("↑", actionData.up), { type: "filler" }],
    } as FlexBox,
    {
      type: "box",
      layout: "horizontal",
      contents: [
        makeButton("←", actionData.left),
        makeButton("OK", actionData.select, "primary"),
        makeButton("→", actionData.right),
      ],
      margin: "md",
    } as FlexBox,
    {
      type: "box",
      layout: "horizontal",
      contents: [{ type: "filler" }, makeButton("↓", actionData.down), { type: "filler" }],
      margin: "md",
    } as FlexBox,
  ];

  const menuRow: FlexComponent = {
    type: "box",
    layout: "horizontal",
    contents: [makeButton("Menu", actionData.menu), makeButton("Home", actionData.home)],
    margin: "lg",
  } as FlexBox;

  const playbackRow: FlexComponent = {
    type: "box",
    layout: "horizontal",
    contents: [makeButton("Play", actionData.play), makeButton("Pause", actionData.pause)],
    margin: "md",
  } as FlexBox;

  const volumeRow: FlexComponent = {
    type: "box",
    layout: "horizontal",
    contents: [
      makeButton("Vol +", actionData.volumeUp),
      makeButton("Mute", actionData.mute),
      makeButton("Vol -", actionData.volumeDown),
    ],
    margin: "md",
  } as FlexBox;

  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: headerContents,
        } as FlexBox,
        {
          type: "separator",
          margin: "lg",
          color: "#EEEEEE",
        },
        ...dpadRows,
        menuRow,
        playbackRow,
        volumeRow,
      ],
      paddingAll: "xl",
      backgroundColor: "#FFFFFF",
    },
  };
}

