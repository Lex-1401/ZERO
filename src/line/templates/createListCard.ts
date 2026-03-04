import { ListItem, FlexBox, FlexBubble, FlexText, FlexComponent } from "./types.js";

/**
 * Create a list card with title and multiple items
 *
 * Editorial design: Numbered/bulleted list with clear visual hierarchy,
 * accent dots for each item, and generous spacing.
 */
export function createListCard(title: string, items: ListItem[]): FlexBubble {
  const itemContents: FlexComponent[] = items.slice(0, 8).map((item, index) => {
    const itemContents: FlexComponent[] = [
      {
        type: "text",
        text: item.title,
        size: "md",
        weight: "bold",
        color: "#1a1a1a",
        wrap: true,
      } as FlexText,
    ];

    if (item.subtitle) {
      itemContents.push({
        type: "text",
        text: item.subtitle,
        size: "sm",
        color: "#888888",
        wrap: true,
        margin: "xs",
      } as FlexText);
    }

    const itemBox: FlexBox = {
      type: "box",
      layout: "horizontal",
      contents: [
        // Accent dot
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "vertical",
              contents: [],
              width: "8px",
              height: "8px",
              backgroundColor: index === 0 ? "#06C755" : "#DDDDDD",
              cornerRadius: "4px",
            } as FlexBox,
          ],
          width: "20px",
          alignItems: "center",
          paddingTop: "sm",
        } as FlexBox,
        // Item content
        {
          type: "box",
          layout: "vertical",
          contents: itemContents,
          flex: 1,
        } as FlexBox,
      ],
      margin: index > 0 ? "lg" : undefined,
    };

    if (item.action) {
      itemBox.action = item.action;
    }

    return itemBox;
  });

  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "xl",
          color: "#111111",
          wrap: true,
        } as FlexText,
        {
          type: "separator",
          margin: "lg",
          color: "#EEEEEE",
        },
        {
          type: "box",
          layout: "vertical",
          contents: itemContents,
          margin: "lg",
        } as FlexBox,
      ],
      paddingAll: "xl",
      backgroundColor: "#FFFFFF",
    },
  };
}
