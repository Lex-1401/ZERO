import { FlexBubble, FlexCarousel } from "./types.js";

/**
 * Create a carousel container from multiple bubbles
 * LINE allows max 12 bubbles in a carousel
 */
export function createCarousel(bubbles: FlexBubble[]): FlexCarousel {
  return {
    type: "carousel",
    contents: bubbles.slice(0, 12),
  };
}

