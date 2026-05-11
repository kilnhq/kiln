# Kiln

Kiln is a Laravel-inspired TypeScript framework for Cloudflare Workers.

The framework is planned around Hono for HTTP, Drizzle for database access, Better Auth for authentication, and Wrangler for local development and deploys.

## Status

This repository is in the early HTTP runtime phase. The current code supports a minimal Hono-backed app runtime and route collection API.

## Current Example

```ts
import { createApp } from "@kiln/core";
import { Route, registerRoutes } from "@kiln/http";

Route.get("/", (c) => c.json({ ok: true })).name("home");

Route.prefix("/api").group(() => {
  Route.get("/projects/:id", (c) => {
    return c.json({ id: c.req.param("id") });
  }).middleware("auth");
});

const app = createApp({
  routes: (hono) => registerRoutes(hono),
});

export default app.worker();
```

Advanced users can keep the standard Cloudflare Worker shape and delegate to the same runtime:

```ts
export default {
  fetch: app.fetch,
};
```

Route middleware is metadata-only right now. The middleware pipeline is planned next.

## Packages

- `@kiln/core`: app bootstrapping and Worker runtime entrypoints.
- `@kiln/http`: Hono-backed routing, controllers, middleware, requests, and responses.
- `@kiln/container`: lightweight service container.
- `@kiln/config`: config and env helpers.
- `@kiln/testing`: test helpers for Kiln apps.
- `@kiln/cli`: `kiln` command line tool.
- `create-kiln`: project generator for `npm create kiln@latest`.

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
```

Planning docs live in `docs/todos/`.

See `docs/public-api.md` for public import boundaries and the pre-1.0 API stability policy.
