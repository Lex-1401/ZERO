import { FlexBox, FlexBubble, FlexText, FlexComponent } from "./types.js";

/**
 * Create a receipt/summary card (for orders, transactions, data tables)
 *
 * Editorial design: Clean table layout with alternating row backgrounds,
 * prominent total section, and clear visual hierarchy.
 */
export function createReceiptCard(params: {
  title: string;
  subtitle?: string;
  items: Array<{ name: string; value: string; highlight?: boolean }>;
  total?: { label: string; value: string };
  footer?: string;
}): FlexBubble {
  const { title, subtitle, items, total, footer } = params;

  const itemRows: FlexComponent[] = items.slice(0, 12).map(
    (item, index) =>
      ({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: item.name,
            size: "sm",
            color: item.highlight ? "#111111" : "#666666",
            weight: item.highlight ? "bold" : "regular",
            flex: 3,
            wrap: true,
          } as FlexText,
          {
            type: "text",
            text: item.value,
            size: "sm",
            color: item.highlight ? "#06C755" : "#333333",
            weight: item.highlight ? "bold" : "regular",
            flex: 2,
            align: "end",
            wrap: true,
          } as FlexText,
        ],
        paddingAll: "md",
        backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
      }) as FlexBox,
  );

  // Header section
  const headerContents: FlexComponent[] = [
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
    headerContents.push({
      type: "text",
      text: subtitle,
      size: "sm",
      color: "#888888",
      margin: "sm",
      wrap: true,
    } as FlexText);
  }

  const bodyContents: FlexComponent[] = [
    {
      type: "box",
      layout: "vertical",
      contents: headerContents,
      paddingBottom: "lg",
    } as FlexBox,
    {
      type: "separator",
      color: "#EEEEEE",
    },
    {
      type: "box",
      layout: "vertical",
      contents: itemRows,
      margin: "md",
      cornerRadius: "md",
      borderWidth: "light",
      borderColor: "#EEEEEE",
    } as FlexBox,
  ];

  // Total section with emphasis
  if (total) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: total.label,
          size: "lg",
          weight: "bold",
          color: "#111111",
          flex: 2,
        } as FlexText,
        {
          type: "text",
          text: total.value,
          size: "xl",
          weight: "bold",
          color: "#06C755",
          flex: 2,
          align: "end",
        } as FlexText,
      ],
      margin: "xl",
      paddingAll: "lg",
      backgroundColor: "#F0FDF4",
      cornerRadius: "lg",
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
