import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { response as httpResponse, RouteCollection, registerRoutes } from "../src/index.ts";

test("RouteCollection registers GET routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/users/:id", (ctx) => httpResponse.json({ id: ctx.params.id }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "123" });
});

test("RouteCollection registers POST routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.post("/users", () => httpResponse.json({ created: true }, 201));
  registerRoutes(hono, routes);

  const response = await hono.request("/users", { method: "POST" });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { created: true });
});

test("RouteCollection registers PUT routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.put("/users/:id", (ctx) => httpResponse.json({ updated: ctx.params.id }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123", { method: "PUT" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { updated: "123" });
});

test("RouteCollection registers PATCH routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.patch("/users/:id", (ctx) => httpResponse.json({ patched: ctx.params.id }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123", { method: "PATCH" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { patched: "123" });
});

test("RouteCollection registers DELETE routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.delete("/users/:id", (ctx) => httpResponse.json({ deleted: ctx.params.id }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123", { method: "DELETE" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: "123" });
});

test("RouteCollection registers prefixed route groups", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.prefix("/api").group(() => {
    routes.get("/projects/:id", (ctx) => httpResponse.json({ project: ctx.params.id }));
  });

  registerRoutes(hono, routes);

  const response = await hono.request("/api/projects/123");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { project: "123" });
});

test("RouteCollection supports nested prefixed route groups", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.prefix("api").group(() => {
    routes.prefix("v1").group(() => {
      routes.get("status", () => httpResponse.json({ ok: true }));
    });
  });

  registerRoutes(hono, routes);

  const response = await hono.request("/api/v1/status");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("RouteCollection stores route names as metadata", () => {
  const routes = new RouteCollection();

  const route = routes.get("/dashboard", () => httpResponse.text("Dashboard")).name("dashboard");

  assert.equal(route.nameValue, "dashboard");
  assert.equal(routes.routes[0]?.nameValue, "dashboard");
});

test("RouteCollection stores route middleware as metadata", () => {
  const routes = new RouteCollection();
  const middleware = { handle() {} };

  const route = routes
    .get("/dashboard", () => httpResponse.text("Dashboard"))
    .middleware("auth")
    .middleware(["throttle", middleware]);

  assert.deepEqual(route.middlewareValues, ["auth", "throttle", middleware]);
  assert.deepEqual(routes.routes[0]?.middlewareValues, ["auth", "throttle", middleware]);
});

test("RouteCollection executes named route middleware", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();
  const calls: string[] = [];

  routes.middleware("auth", async (_c, next) => {
    calls.push("before");
    const response = await next();
    calls.push("after");
    return response;
  });

  routes.get("/dashboard", () => {
    calls.push("handler");
    return httpResponse.json({ ok: true });
  }).middleware("auth");

  registerRoutes(hono, routes);

  const response = await hono.request("/dashboard");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(calls, ["before", "handler", "after"]);
});

test("RouteCollection supports middleware early returns", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.middleware("auth", () => httpResponse.json({ message: "Unauthorized" }, 401));
  routes.get("/dashboard", () => httpResponse.json({ ok: true })).middleware("auth");

  registerRoutes(hono, routes);

  const response = await hono.request("/dashboard");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Unauthorized" });
});

test("RouteCollection supports class middleware objects", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/dashboard", () => httpResponse.json({ ok: true })).middleware({
    async handle(_ctx, next) {
      const response = await next();
      response.headers.set("x-middleware", "ran");
      return response;
    },
  });

  registerRoutes(hono, routes);

  const response = await hono.request("/dashboard");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware"), "ran");
});

test("RouteCollection dispatches controller action tuples", async () => {
  class UserController {
    show(ctx: { params: Record<string, string> }) {
      return httpResponse.json({ id: ctx.params.id });
    }
  }

  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/users/:id", [UserController, "show"]);
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "123" });
});

test("RouteCollection errors when controller method is missing", async () => {
  class UserController {}

  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/users/:id", [UserController, "show"]);
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123");

  assert.equal(response.status, 500);
});
