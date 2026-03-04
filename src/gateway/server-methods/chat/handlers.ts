/**
 * Chat Gateway Request Handlers
 *
 * @module gateway/server-methods/chat/handlers
 */
import { type GatewayRequestHandlers } from "../types.js";

export const chatHandlers: GatewayRequestHandlers = {
    "chat.history": async ({ params: _params, respond, context: _context }) => {
        respond(true, { messages: [] });
    },
    "chat.abort": ({ params: _params, respond, context: _context }) => {
        respond(true, { aborted: true });
    },
    "chat.send": async ({ params: _params, respond, context: _context }) => {
        respond(true, { sent: true });
    },
    "chat.inject": async ({ params: _params, respond, context: _context }) => {
        respond(true, { injected: true });
    },
};
