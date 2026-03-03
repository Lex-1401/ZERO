import { FlexBox, FlexBubble, FlexText, FlexComponent } from "./types.js";

/**
 * Create a calendar agenda card showing multiple events
 *
 * Editorial timeline design: Time-focused left column with event details
 * on the right. Visual accent bars indicate event priority/recency.
 */
export function createAgendaCard(params: {
  title: string;
  subtitle?: string;
  events: Array<{
    title: string;
    time?: string;
    location?: string;
    calendar?: string;
    isNow?: boolean;
  }>;
  footer?: string;
}): FlexBubble {
  const { title, subtitle, events, footer } = params;

  // Header with title and optional subtitle
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

  // Event timeline items
  const eventItems: FlexComponent[] = events.slice(0, 6).map((event, index) => {
    const isActive = event.isNow || index === 0;
    const accentColor = isActive ? "#06C755" : "#E5E5E5";

    // Time column (fixed width)
    const timeColumn: FlexBox = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: event.time ?? "—",
          size: "sm",
          weight: isActive ? "bold" : "regular",
          color: isActive ? "#06C755" : "#666666",
          align: "end",
          wrap: true,
        } as FlexText,
      ],
      width: "65px",
      justifyContent: "flex-start",
    };

    // Accent dot
    const dotColumn: FlexBox = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [],
          width: "10px",
          height: "10px",
          backgroundColor: accentColor,
          cornerRadius: "5px",
        } as FlexBox,
      ],
      width: "24px",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: "xs",
    };

    // Event details column
    const detailContents: FlexComponent[] = [
      {
        type: "text",
        text: event.title,
        size: "md",
        weight: "bold",
        color: "#1a1a1a",
        wrap: true,
      } as FlexText,
    ];

    // Secondary info line
    const secondaryParts: string[] = [];
    if (event.location) secondaryParts.push(event.location);
    if (event.calendar) secondaryParts.push(event.calendar);

    if (secondaryParts.length > 0) {
      detailContents.push({
        type: "text",
        text: secondaryParts.join(" · "),
        size: "xs",
        color: "#888888",
        wrap: true,
        margin: "xs",
      } as FlexText);
    }

    const detailColumn: FlexBox = {
      type: "box",
      layout: "vertical",
      contents: detailContents,
      flex: 1,
    };

    return {
      type: "box",
      layout: "horizontal",
      contents: [timeColumn, dotColumn, detailColumn],
      margin: index > 0 ? "xl" : undefined,
      alignItems: "flex-start",
    } as FlexBox;
  });

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
      contents: eventItems,
      paddingTop: "xl",
    } as FlexBox,
  ];

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
          align: "center",
          wrap: true,
        } as FlexText,
      ],
      paddingAll: "lg",
      backgroundColor: "#FAFAFA",
    };
  }

  return bubble;
}
