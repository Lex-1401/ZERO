import { Type, type Static } from "@sinclair/typebox";

export const HttpClientSchema = Type.Object({
  method: Type.Optional(
    Type.String({
      description: "HTTP method: GET, POST, PUT, DELETE, PATCH, HEAD, or OPTIONS. Default: GET.",
      default: "GET",
    }),
  ),
  url: Type.String({ description: "The request URL." }),
  headers: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description: "HTTP headers as key-value pairs.",
    }),
  ),
  body: Type.Optional(
    Type.String({
      description: "The request body as a string. (For JSON, stringify the object).",
    }),
  ),
  auth: Type.Optional(
    Type.String({
      description:
        "Auth profile name to use. Inject tokens securely from ONE configured credentials.",
    }),
  ),
  timeout: Type.Optional(
    Type.Number({
      description: "Request timeout in seconds. Default: 30",
      default: 30,
    }),
  ),
});

export type HttpClientParams = Static<typeof HttpClientSchema>;
