# Kiln

Kiln is a Laravel-inspired TypeScript framework for Cloudflare Workers.

The framework is planned around Hono for HTTP, Drizzle for database access, Better Auth for authentication, and Wrangler for local development and deploys.

## Status

This repository is in the foundation phase. The current focus is the monorepo structure and package boundaries before implementing the HTTP runtime.

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
