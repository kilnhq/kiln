import type { Context, Hono } from "hono";
import { flatten, safeParse, type BaseIssue, type BaseSchema, type InferOutput } from "valibot";

export const KILN_HTTP_PACKAGE = "@kiln/http";

export const response = {
  json(data: unknown, status = 200): Response {
    return Response.json(data, { status });
  },

  text(body: string, status = 200): Response {
    return new Response(body, {
      status,
      headers: { "content-type": "text/plain; charset=UTF-8" },
    });
  },

  html(body: string, status = 200): Response {
    return new Response(body, {
      status,
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  },

  redirect(to: string, status = 302): Response {
    return Response.redirect(to, status);
  },

  notFound(body: unknown = { message: "Not Found" }): Response {
    return Response.json(body, { status: 404 });
  },

  noContent(): Response {
    return new Response(null, { status: 204 });
  },
};

export class ValidationError extends Error {
  readonly errors: Record<string, string[]>;
  readonly issues: BaseIssue<unknown>[];

  constructor(issues: BaseIssue<unknown>[]) {
    super("Validation failed");
    this.name = "ValidationError";
    this.issues = issues;
    this.errors = normalizeValidationErrors(issues);
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class RequestContext<Env extends object = Record<string, unknown>> {
  readonly raw: Context<{ Bindings: Env }>;
  readonly env: Env;
  readonly params: Record<string, string>;
  readonly request: {
    cookie: (name: string) => string | undefined;
    header: (name: string) => string | undefined;
    input: (key: string) => Promise<unknown>;
    ip: () => string | undefined;
    only: (keys: string[]) => Promise<Record<string, unknown>>;
    validate: <TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
      schema: TSchema,
    ) => Promise<InferOutput<TSchema>>;
  };
  inputData?: Promise<Record<string, unknown>>;

  constructor(raw: Context<{ Bindings: Env }>) {
    this.raw = raw;
    this.env = raw.env;
    this.params = raw.req.param() as Record<string, string>;
    this.request = {
      cookie: (name) => parseCookies(raw.req.header("cookie"))[name],
      header: (name) => raw.req.header(name),
      input: async (key) => {
        return (await this.allInput())[key];
      },
      ip: () => {
        return raw.req.header("cf-connecting-ip")
          ?? raw.req.header("x-forwarded-for")?.split(",")[0]?.trim()
          ?? raw.req.header("x-real-ip");
      },
      only: async (keys) => {
        const input = await this.allInput();
        const selected: Record<string, unknown> = {};

        for (const key of keys) {
          if (key in input) {
            selected[key] = input[key];
          }
        }

        return selected;
      },
      validate: async (schema) => {
        const result = safeParse(schema, await this.allInput());

        if (!result.success) {
          throw new ValidationError(result.issues);
        }

        return result.output;
      },
    };
  }

  async allInput(): Promise<Record<string, unknown>> {
    this.inputData ??= parseInput(this.raw.req.raw);
    return this.inputData;
  }
}

export type InlineHandler<Env extends object = Record<string, unknown>> = (
  context: RequestContext<Env>,
) => Response | Promise<Response>;

export type ControllerConstructor = new () => object;

export type ControllerAction = [ControllerConstructor, string];

export type RouteAction<Env extends object = Record<string, unknown>> =
  | InlineHandler<Env>
  | ControllerAction;

export type NextFunction = () => Promise<Response>;

export type MiddlewareHandler<Env extends object = Record<string, unknown>> = (
  context: RequestContext<Env>,
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
  readonly action: RouteAction<Env>;
  readonly middlewareValues: MiddlewareReference<Env>[] = [];
  nameValue?: string;

  constructor(method: HttpMethod, path: string, action: RouteAction<Env>) {
    this.method = method;
    this.path = path;
    this.action = action;
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
  action: RouteAction<Env>;
  name?: string;
}

export class RouteCollection<Env extends object = Record<string, unknown>> {
  readonly routes: RouteDefinition<Env>[] = [];
  private readonly prefixes: string[] = [];
  private readonly namedMiddleware = new Map<string, MiddlewareHandler<Env>>();

  get(path: string, action: RouteAction<Env>): RouteDefinition<Env> {
    return this.add("GET", path, action);
  }

  post(path: string, action: RouteAction<Env>): RouteDefinition<Env> {
    return this.add("POST", path, action);
  }

  put(path: string, action: RouteAction<Env>): RouteDefinition<Env> {
    return this.add("PUT", path, action);
  }

  patch(path: string, action: RouteAction<Env>): RouteDefinition<Env> {
    return this.add("PATCH", path, action);
  }

  delete(path: string, action: RouteAction<Env>): RouteDefinition<Env> {
    return this.add("DELETE", path, action);
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
    const requestContext = new RequestContext(context);
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
        return dispatchAction(route.action, requestContext);
      }

      return current(requestContext, () => dispatch(position + 1));
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
    action: RouteAction<Env>,
  ): RouteDefinition<Env> {
    const route = new RouteDefinition(method, joinPaths([...this.prefixes, path]), action);
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

async function dispatchAction<Env extends object>(
  action: RouteAction<Env>,
  context: RequestContext<Env>,
): Promise<Response> {
  if (typeof action === "function") {
    return action(context);
  }

  const [Controller, method] = action;
  const controller = new Controller();
  const handler = (controller as Record<string, unknown>)[method];

  if (typeof handler !== "function") {
    throw new Error(`Controller method not found: ${Controller.name}.${method}`);
  }

  return handler.call(controller, context) as Response | Promise<Response>;
}

async function parseInput(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  const input: Record<string, unknown> = {};

  url.searchParams.forEach((value, key) => {
    input[key] = value;
  });

  if (request.method === "GET" || request.method === "HEAD") {
    return input;
  }

  const contentType = request.headers.get("content-type") ?? "";
  const body = request.clone();

  if (contentType.includes("application/json")) {
    const data = await body.json().catch(() => undefined);

    if (isRecord(data)) {
      return { ...input, ...data };
    }

    return input;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await body.formData().catch(() => undefined);

    if (form) {
      form.forEach((value, key) => {
        input[key] = value;
      });
    }
  }

  return input;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");

    if (!rawName) {
      continue;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }

  return cookies;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeValidationErrors(issues: BaseIssue<unknown>[]): Record<string, string[]> {
  if (issues.length === 0) {
    return {};
  }

  const nested = flatten(issues as [BaseIssue<unknown>, ...BaseIssue<unknown>[]]).nested ?? {};
  const errors: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(nested)) {
    if (messages) {
      errors[key] = [...messages];
    }
  }

  return errors;
}
