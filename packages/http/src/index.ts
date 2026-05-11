import type { Context, Hono } from "hono";

export const KILN_HTTP_PACKAGE = "@kiln/http";

export type HttpMethod = "GET" | "POST";

export type InlineHandler<Env extends object = Record<string, unknown>> = (
  context: Context<{ Bindings: Env }>,
) => Response | Promise<Response>;

export interface RouteDefinition<Env extends object = Record<string, unknown>> {
  method: HttpMethod;
  path: string;
  handler: InlineHandler<Env>;
}

export class RouteCollection<Env extends object = Record<string, unknown>> {
  readonly routes: RouteDefinition<Env>[] = [];

  get(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("GET", path, handler);
  }

  post(path: string, handler: InlineHandler<Env>): RouteDefinition<Env> {
    return this.add("POST", path, handler);
  }

  register(hono: Hono<{ Bindings: Env }>): void {
    for (const route of this.routes) {
      if (route.method === "GET") {
        hono.get(route.path, route.handler);
      }

      if (route.method === "POST") {
        hono.post(route.path, route.handler);
      }
    }
  }

  private add(
    method: HttpMethod,
    path: string,
    handler: InlineHandler<Env>,
  ): RouteDefinition<Env> {
    const route = { method, path, handler };
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
