import type { Context, Hono } from "hono";

export const KILN_HTTP_PACKAGE = "@kiln/http";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type InlineHandler<Env extends object = Record<string, unknown>> = (
  context: Context<{ Bindings: Env }>,
) => Response | Promise<Response>;

export class RouteDefinition<Env extends object = Record<string, unknown>> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: InlineHandler<Env>;
  nameValue?: string;

  constructor(method: HttpMethod, path: string, handler: InlineHandler<Env>) {
    this.method = method;
    this.path = path;
    this.handler = handler;
  }

  name(name: string): this {
    this.nameValue = name;
    return this;
  }
}

export interface RouteRecord<Env extends object = Record<string, unknown>> {
  method: HttpMethod;
  path: string;
  handler: InlineHandler<Env>;
  name?: string;
}

export class RouteCollection<Env extends object = Record<string, unknown>> {
  readonly routes: RouteDefinition<Env>[] = [];
  private readonly prefixes: string[] = [];

  get(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("GET", path, handler);
  }

  post(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("POST", path, handler);
  }

  put(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("PUT", path, handler);
  }

  patch(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("PATCH", path, handler);
  }

  delete(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("DELETE", path, handler);
  }

  prefix(prefix: string): { group: (callback: () => void) => void } {
    return {
      group: (callback) => {
        this.prefixes.push(prefix);

        try {
          callback();
        } finally {
          this.prefixes.pop();
        }
      },
    };
  }

  register(hono: Hono<{ Bindings: Env }>): void {
    for (const route of this.routes) {
      if (route.method === "GET") {
        hono.get(route.path, route.handler);
      }

      if (route.method === "POST") {
        hono.post(route.path, route.handler);
      }

      if (route.method === "PUT") {
        hono.put(route.path, route.handler);
      }

      if (route.method === "PATCH") {
        hono.patch(route.path, route.handler);
      }

      if (route.method === "DELETE") {
        hono.delete(route.path, route.handler);
      }
    }
  }

  private add(
    method: HttpMethod,
    path: string,
    handler: InlineHandler<Env>,
  ): RouteDefinition<Env> {
    const route = new RouteDefinition(method, joinPaths([...this.prefixes, path]), handler);
    this.routes.push(route);
    return route;
  }
}

export const Route = new RouteCollection();

export function registerRoutes<Env extends object = Record<string, unknown>>(
  hono: Hono<{ Bindings: Env }>,
  routes: RouteCollection<Env> = Route as RouteCollection<Env>,
): void {
  routes.register(hono);
}

function joinPaths(paths: string[]): string {
  const joined = paths
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => path.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

  return joined ? `/${joined}` : "/";
}
