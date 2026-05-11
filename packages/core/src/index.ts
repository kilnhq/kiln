import { Hono } from "hono";

export const KILN_CORE_PACKAGE = "@kiln/core";

export interface ExecutionContextLike {
  passThroughOnException(): void;
  waitUntil(promise: Promise<unknown>): void;
}

export type WorkerFetchHandler<Env extends object = Record<string, unknown>> = (
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
) => Response | Promise<Response>;

export interface KilnWorker<Env extends object = Record<string, unknown>> {
  fetch: WorkerFetchHandler<Env>;
}

export interface KilnApp<Env extends object = Record<string, unknown>> {
  fetch: WorkerFetchHandler<Env>;
  hono: Hono<{ Bindings: Env }>;
  worker(): KilnWorker<Env>;
}

export type RouteRegistrar<Env extends object = Record<string, unknown>> = (
  hono: Hono<{ Bindings: Env }>,
) => void;

export interface CreateAppOptions<Env extends object = Record<string, unknown>> {
  name?: string;
  routes?: RouteRegistrar<Env> | RouteRegistrar<Env>[];
}

export function createApp<Env extends object = Record<string, unknown>>(
  options: CreateAppOptions<Env> = {},
): KilnApp<Env> {
  const hono = new Hono<{ Bindings: Env }>();

  for (const registerRoutes of normalizeArray(options.routes)) {
    registerRoutes(hono);
  }

  const fetch: WorkerFetchHandler<Env> = (request, env, ctx) => {
    return hono.fetch(request, env, ctx as never);
  };

  return {
    fetch,
    hono,
    worker() {
      return { fetch };
    },
  };
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
