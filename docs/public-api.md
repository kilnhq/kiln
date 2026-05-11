# Public API

Kiln packages should expose a small, intentional public surface. Anything not exported from a package root is internal and can change without notice before v1.0.

## User-Facing Imports

- `@kiln/core`: app creation, Worker entrypoints, and runtime types.
- `@kiln/http`: routes, controllers, middleware contracts, request context, and response helpers.
- `@kiln/container`: service container and service provider APIs.
- `@kiln/config`: config registration, config lookup, and env helpers.
- `@kiln/testing`: test app helpers and framework testing utilities.
- `@kiln/cli`: CLI implementation package for the `kiln` binary.
- `create-kiln`: project generator package for `npm create kiln@latest`.

## Import Rules

- Import from package roots, such as `@kiln/core`, instead of deep paths.
- Do not rely on package `src`, `dist`, or `internal` paths.
- Runtime packages must not import Node built-ins.
- CLI and generator packages may use Node APIs.

## Stability Policy

- Before v1.0, APIs may change as the framework shape is refined.
- Public APIs should still be changed deliberately and documented in release notes.
- Experimental APIs should be named or documented as experimental.
- Internal APIs should remain unexported from package roots.
- v1.0 should define the stable public API and migration policy.
