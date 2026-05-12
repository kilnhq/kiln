import type { Context, Hono } from "hono";

export const KILN_HTTP_PACKAGE = "@kiln/http";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type InlineHandler<Env extends object = Record<string, unknown>> = (
  context: Context<{ Bindings: Env }>,
) => Response | Promise<Response>;

export type NextFunction = () => Promise<Response>;

export type MiddlewareHandler<Env extends object = Record<string, unknown>> = (
  context: Context<{ Bindings: Env }>,
  next: NextFunction,
) => Response | Promise<Response>;

export interface ClassMiddleware<Env extends object = Record<string, unknown>> {
  handle: MiddlewareHandler<Env>;
}

export type MiddlewareReference<Env extends object = Record<string, unknown>> =
  | string
  | MiddlewareHandler<Env>
  | ClassMiddleware<Env>;

export class RouteDefinition<Env extends object = Record<string, unknown>> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: InlineHandler<Env>;
  readonly middlewareValues: MiddlewareReference<Env>[] = [];
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

  middleware(middleware: MiddlewareReference<Env> | MiddlewareReference<Env>[]): this {
    this.middlewareValues.push(...normalizeArray(middleware));
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
  private readonly namedMiddleware = new Map<string, MiddlewareHandler<Env>>();

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

  middleware(name: string, middleware: MiddlewareHandler<Env> | ClassMiddleware<Env>): this {
    this.namedMiddleware.set(name, normalizeMiddleware(middleware));
    return this;
  }

  register(hono: Hono<{ Bindings: Env }>): void {
    for (const route of this.routes) {
      const handler = (context: Context<{ Bindings: Env }>) => this.runRoute(context, route);

      if (route.method === "GET") {
        hono.get(route.path, handler);
      }

      if (route.method === "POST") {
        hono.post(route.path, handler);
      }

      if (route.method === "PUT") {
        hono.put(route.path, handler);
      }

      if (route.method === "PATCH") {
        hono.patch(route.path, handler);
      }

      if (route.method === "DELETE") {
        hono.delete(route.path, handler);
      }
    }
  }

  private async runRoute(
    context: Context<{ Bindings: Env }>,
    route: RouteDefinition<Env>,
  ): Promise<Response> {
    const middleware = route.middlewareValues.map((reference) => {
      return this.resolveMiddleware(reference);
    });

    let index = -1;

    const dispatch = async (position: number): Promise<Response> => {
      if (position <= index) {
        throw new Error("Middleware next() called multiple times");
      }

      index = position;

      const current = middleware[position];

      if (!current) {
        return route.handler(context);
      }

      return current(context, () => dispatch(position + 1));
    };

    return dispatch(0);
  }

  private resolveMiddleware(reference: MiddlewareReference<Env>): MiddlewareHandler<Env> {
    if (typeof reference === "string") {
      const middleware = this.namedMiddleware.get(reference);

      if (!middleware) {
        throw new Error(`Unknown middleware: ${reference}`);
      }

      return middleware;
    }

    return normalizeMiddleware(reference);
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

function normalizeArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function normalizeMiddleware<Env extends object>(
  middleware: MiddlewareHandler<Env> | ClassMiddleware<Env>,
): MiddlewareHandler<Env> {
  if (typeof middleware === "function") {
    return middleware;
  }

  return (context, next) => middleware.handle(context, next);
}
