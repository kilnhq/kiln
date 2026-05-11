export const KILN_CORE_PACKAGE = "@kiln/core";

export interface ExecutionContextLike {
  passThroughOnException(): void;
  waitUntil(promise: Promise<unknown>): void;
}

export type WorkerFetchHandler<Env = unknown> = (
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
) => Response | Promise<Response>;
