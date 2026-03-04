import { FlexBox, FlexBubble, FlexText } from "./types.js";

/**
 * Create an info card with title, body, and optional footer
 *
 * Editorial design: Clean hierarchy with accent bar, generous spacing,
 * and subtle background zones for visual separation.
 */
export function createInfoCard(title: string, body: string, footer?: string): FlexBubble {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        // Title with accent bar
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "box",
              layout: "vertical",
              contents: [],
              width: "4px",
              backgroundColor: "#06C755",
              cornerRadius: "2px",
            } as FlexBox,
            {
              type: "text",
              text: title,
              weight: "bold",
              size: "xl",
              color: "#111111",
              wrap: true,
              flex: 1,
              margin: "lg",
            } as FlexText,
          ],
        } as FlexBox,
        // Body text in subtle container
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: body,
              size: "md",
              color: "#444444",
              wrap: true,
              lineSpacing: "6px",
            } as FlexText,
          ],
          margin: "xl",
          paddingAll: "lg",
          backgroundColor: "#F8F9FA",
          cornerRadius: "lg",
        } as FlexBox,
      ],
      paddingAll: "xl",
      backgroundColor: "#FFFFFF",
    },
  };

  if (footer) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: footer,
          size: "xs",
          color: "#AAAAAA",
          wrap: true,
          align: "center",
        } as FlexText,
      ],
      paddingAll: "lg",
      backgroundColor: "#FAFAFA",
    };
  }

  return bubble;
}
