import { FlexBox, FlexBubble, FlexText, FlexComponent } from "./types.js";

/**
 * Create a notification bubble (for alerts, status updates)
 *
 * Editorial design: Bold status indicator with accent color,
 * clear typography, optional icon for context.
 */
export function createNotificationBubble(
  text: string,
  options?: {
    icon?: string;
    type?: "info" | "success" | "warning" | "error";
    title?: string;
  },
): FlexBubble {
  // Color based on notification type
  const colors = {
    info: { accent: "#3B82F6", bg: "#EFF6FF" },
    success: { accent: "#06C755", bg: "#F0FDF4" },
    warning: { accent: "#F59E0B", bg: "#FFFBEB" },
    error: { accent: "#EF4444", bg: "#FEF2F2" },
  };
  const typeColors = colors[options?.type ?? "info"];

  const contents: FlexComponent[] = [];

  // Accent bar
  contents.push({
    type: "box",
    layout: "vertical",
    contents: [],
    width: "4px",
    backgroundColor: typeColors.accent,
    cornerRadius: "2px",
  } as FlexBox);

  // Content section
  const textContents: FlexComponent[] = [];

  if (options?.title) {
    textContents.push({
      type: "text",
      text: options.title,
      size: "md",
      weight: "bold",
      color: "#111111",
      wrap: true,
    } as FlexText);
  }

  textContents.push({
    type: "text",
    text,
    size: options?.title ? "sm" : "md",
    color: options?.title ? "#666666" : "#333333",
    wrap: true,
    margin: options?.title ? "sm" : undefined,
  } as FlexText);

  contents.push({
    type: "box",
    layout: "vertical",
    contents: textContents,
    flex: 1,
    paddingStart: "lg",
  } as FlexBox);

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "horizontal",
      contents,
      paddingAll: "xl",
      backgroundColor: typeColors.bg,
    },
  };
}

