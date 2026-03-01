import { FlexBox, FlexBubble, FlexText, FlexImage, Action } from "./types.js";

/**
 * Create an image card with image, title, and optional body text
 */
export function createImageCard(
  imageUrl: string,
  title: string,
  body?: string,
  options?: {
    aspectRatio?: "1:1" | "1.51:1" | "1.91:1" | "4:3" | "16:9" | "20:13" | "2:1" | "3:1";
    aspectMode?: "cover" | "fit";
    action?: Action;
  },
): FlexBubble {
  const bubble: FlexBubble = {
    type: "bubble",
    hero: {
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: options?.aspectRatio ?? "20:13",
      aspectMode: options?.aspectMode ?? "cover",
      action: options?.action,
    } as FlexImage,
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "xl",
          wrap: true,
        } as FlexText,
      ],
      paddingAll: "lg",
    },
  };

  if (body && bubble.body) {
    (bubble.body as FlexBox).contents.push({
      type: "text",
      text: body,
      size: "md",
      wrap: true,
      margin: "md",
      color: "#666666",
    } as FlexText);
  }

  return bubble;
}

