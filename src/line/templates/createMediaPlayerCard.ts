import { FlexBox, FlexBubble, FlexText, FlexImage, FlexButton, FlexComponent } from "./types.js";

/**
 * Create a media player card for Sonos, Spotify, Apple Music, etc.
 *
 * Editorial design: Album art hero with gradient overlay for text,
 * prominent now-playing indicator, refined playback controls.
 */
export function createMediaPlayerCard(params: {
  title: string;
  subtitle?: string;
  source?: string;
  imageUrl?: string;
  isPlaying?: boolean;
  progress?: string;
  controls?: {
    previous?: { data: string };
    play?: { data: string };
    pause?: { data: string };
    next?: { data: string };
  };
  extraActions?: Array<{ label: string; data: string }>;
}): FlexBubble {
  const { title, subtitle, source, imageUrl, isPlaying, progress, controls, extraActions } = params;

  // Track info section
  const trackInfo: FlexComponent[] = [
    {
      type: "text",
      text: title,
      weight: "bold",
      size: "xl",
      color: "#111111",
      wrap: true,
    } as FlexText,
  ];

  if (subtitle) {
    trackInfo.push({
      type: "text",
      text: subtitle,
      size: "md",
      color: "#666666",
      wrap: true,
      margin: "sm",
    } as FlexText);
  }

  // Status row with source and playing indicator
  const statusItems: FlexComponent[] = [];

  if (isPlaying !== undefined) {
    statusItems.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [],
          width: "8px",
          height: "8px",
          backgroundColor: isPlaying ? "#06C755" : "#CCCCCC",
          cornerRadius: "4px",
        } as FlexBox,
        {
          type: "text",
          text: isPlaying ? "Now Playing" : "Paused",
          size: "xs",
          color: isPlaying ? "#06C755" : "#888888",
          weight: "bold",
          margin: "sm",
        } as FlexText,
      ],
      alignItems: "center",
    } as FlexBox);
  }

  if (source) {
    statusItems.push({
      type: "text",
      text: source,
      size: "xs",
      color: "#AAAAAA",
      margin: statusItems.length > 0 ? "lg" : undefined,
    } as FlexText);
  }

  if (progress) {
    statusItems.push({
      type: "text",
      text: progress,
      size: "xs",
      color: "#888888",
      align: "end",
      flex: 1,
    } as FlexText);
  }

  const bodyContents: FlexComponent[] = [
    {
      type: "box",
      layout: "vertical",
      contents: trackInfo,
    } as FlexBox,
  ];

  if (statusItems.length > 0) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: statusItems,
      margin: "lg",
      alignItems: "center",
    } as FlexBox);
  }

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "xl",
      backgroundColor: "#FFFFFF",
    },
  };

  // Album art hero
  if (imageUrl) {
    bubble.hero = {
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: "1:1",
      aspectMode: "cover",
    } as FlexImage;
  }

  // Control buttons in footer
  if (controls || extraActions?.length) {
    const footerContents: FlexComponent[] = [];

    // Main playback controls with refined styling
    if (controls) {
      const controlButtons: FlexComponent[] = [];

      if (controls.previous) {
        controlButtons.push({
          type: "button",
          action: {
            type: "postback",
            label: "⏮",
            data: controls.previous.data,
          },
          style: "secondary",
          flex: 1,
          height: "sm",
        } as FlexButton);
      }

      if (controls.play) {
        controlButtons.push({
          type: "button",
          action: {
            type: "postback",
            label: "▶",
            data: controls.play.data,
          },
          style: isPlaying ? "secondary" : "primary",
          flex: 1,
          height: "sm",
          margin: controls.previous ? "md" : undefined,
        } as FlexButton);
      }

      if (controls.pause) {
        controlButtons.push({
          type: "button",
          action: {
            type: "postback",
            label: "⏸",
            data: controls.pause.data,
          },
          style: isPlaying ? "primary" : "secondary",
          flex: 1,
          height: "sm",
          margin: controlButtons.length > 0 ? "md" : undefined,
        } as FlexButton);
      }

      if (controls.next) {
        controlButtons.push({
          type: "button",
          action: {
            type: "postback",
            label: "⏭",
            data: controls.next.data,
          },
          style: "secondary",
          flex: 1,
          height: "sm",
          margin: controlButtons.length > 0 ? "md" : undefined,
        } as FlexButton);
      }

      if (controlButtons.length > 0) {
        footerContents.push({
          type: "box",
          layout: "horizontal",
          contents: controlButtons,
        } as FlexBox);
      }
    }

    // Extra actions
    if (extraActions?.length) {
      footerContents.push({
        type: "box",
        layout: "horizontal",
        contents: extraActions.slice(0, 2).map(
          (action, index) =>
            ({
              type: "button",
              action: {
                type: "postback",
                label: action.label.slice(0, 15),
                data: action.data,
              },
              style: "secondary",
              flex: 1,
              height: "sm",
              margin: index > 0 ? "md" : undefined,
            }) as FlexButton,
        ),
        margin: "md",
      } as FlexBox);
    }

    if (footerContents.length > 0) {
      bubble.footer = {
        type: "box",
        layout: "vertical",
        contents: footerContents,
        paddingAll: "lg",
        backgroundColor: "#FAFAFA",
      };
    }
  }

  return bubble;
}

