import type { IncomingMessage, ServerResponse } from "node:http";

export type RouterContext = {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
};

export type Handler = (ctx: RouterContext) => Promise<boolean | void>;

export type Middleware = (
  ctx: RouterContext,
  next: () => Promise<boolean | void>,
) => Promise<boolean | void>;

type Route = {
  method: string | null;
  path: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
};

export class Router {
  private routes: Route[] = [];
  private middlewares: Middleware[] = [];

  /**
   * Registers a global middleware.
   */
  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  get(path: string, handler: Handler) {
    this.addRoute("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.addRoute("POST", path, handler);
  }

  all(path: string, handler: Handler) {
    this.addRoute(null, path, handler);
  }

  private addRoute(method: string | null, path: string, handler: Handler) {
    const keys: string[] = [];
    const pattern = path
      .replace(/:([^/]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
      })
      .replace(/\*/g, ".*");

    this.routes.push({
      method,
      path,
      regex: new RegExp(`^${pattern}$`),
      keys,
      handler,
    });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;
    const method = req.method;
    // console.log(`[Router] handling ${method} ${pathname}`);

    for (const route of this.routes) {
      if (route.method && route.method !== method) continue;

      const match = pathname.match(route.regex);
      // if (match) console.log(`[Router] matched ${route.path}`);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });

        const ctx: RouterContext = { req, res, params };

        // Construct the middleware chain
        const pipeline = [...this.middlewares];
        let index = 0;

        const next = async (): Promise<boolean | void> => {
          if (index < pipeline.length) {
            return pipeline[index++](ctx, next);
          } else {
            return route.handler(ctx);
          }
        };

        const result = await next();
        if (result !== false) return true;
      }
    }

    return false;
  }
}
