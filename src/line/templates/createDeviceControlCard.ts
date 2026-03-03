import type { messagingApi } from "@line/bot-sdk";
import {
  FlexBox,
  FlexBubble,
  FlexCarousel,
  FlexContainer,
  FlexText,
  FlexImage,
  FlexButton,
  FlexComponent,
  Action,
} from "./types.js";

/**
 * Create a device control card for Apple TV, smart home devices, etc.
 *
 * Editorial design: Device-focused header with status indicator,
 * clean control grid with clear visual hierarchy.
 */
export function createDeviceControlCard(params: {
  deviceName: string;
  deviceType?: string;
  status?: string;
  isOnline?: boolean;
  imageUrl?: string;
  controls: Array<{
    label: string;
    icon?: string;
    data: string;
    style?: "primary" | "secondary";
  }>;
}): FlexBubble {
  const { deviceName, deviceType, status, isOnline, imageUrl, controls } = params;

  // Device header with status indicator
  const headerContents: FlexComponent[] = [
    {
      type: "box",
      layout: "horizontal",
      contents: [
        // Status dot
        {
          type: "box",
          layout: "vertical",
          contents: [],
          width: "10px",
          height: "10px",
          backgroundColor: isOnline !== false ? "#06C755" : "#FF5555",
          cornerRadius: "5px",
        } as FlexBox,
        {
          type: "text",
          text: deviceName,
          weight: "bold",
          size: "xl",
          color: "#111111",
          wrap: true,
          flex: 1,
          margin: "md",
        } as FlexText,
      ],
      alignItems: "center",
    } as FlexBox,
  ];

  if (deviceType) {
    headerContents.push({
      type: "text",
      text: deviceType,
      size: "sm",
      color: "#888888",
      margin: "sm",
    } as FlexText);
  }

  if (status) {
    headerContents.push({
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: status,
          size: "sm",
          color: "#444444",
          wrap: true,
        } as FlexText,
      ],
      margin: "lg",
      paddingAll: "md",
      backgroundColor: "#F8F9FA",
      cornerRadius: "md",
    } as FlexBox);
  }

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: headerContents,
      paddingAll: "xl",
      backgroundColor: "#FFFFFF",
    },
  };

  if (imageUrl) {
    bubble.hero = {
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: "16:9",
      aspectMode: "cover",
    } as FlexImage;
  }

  // Control buttons in refined grid layout (2 per row)
  if (controls.length > 0) {
    const rows: FlexComponent[] = [];
    const limitedControls = controls.slice(0, 6);

    for (let i = 0; i < limitedControls.length; i += 2) {
      const rowButtons: FlexComponent[] = [];

      for (let j = i; j < Math.min(i + 2, limitedControls.length); j++) {
        const ctrl = limitedControls[j];
        const buttonLabel = ctrl.icon ? `${ctrl.icon} ${ctrl.label}` : ctrl.label;

        rowButtons.push({
          type: "button",
          action: {
            type: "postback",
            label: buttonLabel.slice(0, 18),
            data: ctrl.data,
          },
          style: ctrl.style ?? "secondary",
          flex: 1,
          height: "sm",
          margin: j > i ? "md" : undefined,
        } as FlexButton);
      }

      // If odd number of controls in last row, add spacer
      if (rowButtons.length === 1) {
        rowButtons.push({
          type: "filler",
        });
      }

      rows.push({
        type: "box",
        layout: "horizontal",
        contents: rowButtons,
        margin: i > 0 ? "md" : undefined,
      } as FlexBox);
    }

    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: rows,
      paddingAll: "lg",
      backgroundColor: "#FAFAFA",
    };
  }

  return bubble;
}

/**
 * Wrap a FlexContainer in a FlexMessage
 */
export function toFlexMessage(altText: string, contents: FlexContainer): messagingApi.FlexMessage {
  return {
    type: "flex",
    altText,
    contents,
  };
}

// Re-export specific template function, types are managed in types.js
