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

export interface CreateAppOptions {
  name?: string;
}

export function createApp<Env extends object = Record<string, unknown>>(
  _options: CreateAppOptions = {},
): KilnApp<Env> {
  const hono = new Hono<{ Bindings: Env }>();

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
