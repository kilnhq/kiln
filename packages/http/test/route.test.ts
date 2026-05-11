import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { RouteCollection, registerRoutes } from "../src/index.ts";

test("RouteCollection registers GET routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/users/:id", (c) => c.json({ id: c.req.param("id") }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "123" });
});

test("RouteCollection registers POST routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.post("/users", (c) => c.json({ created: true }, 201));
  registerRoutes(hono, routes);

  const response = await hono.request("/users", { method: "POST" });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { created: true });
});

test("RouteCollection registers PUT routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.put("/users/:id", (c) => c.json({ updated: c.req.param("id") }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123", { method: "PUT" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { updated: "123" });
});

test("RouteCollection registers PATCH routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.patch("/users/:id", (c) => c.json({ patched: c.req.param("id") }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123", { method: "PATCH" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { patched: "123" });
});

test("RouteCollection registers DELETE routes onto Hono", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.delete("/users/:id", (c) => c.json({ deleted: c.req.param("id") }));
  registerRoutes(hono, routes);

  const response = await hono.request("/users/123", { method: "DELETE" });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: "123" });
});

test("RouteCollection registers prefixed route groups", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.prefix("/api").group(() => {
    routes.get("/projects/:id", (c) => c.json({ project: c.req.param("id") }));
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
      routes.get("status", (c) => c.json({ ok: true }));
    });
  });

  registerRoutes(hono, routes);

  const response = await hono.request("/api/v1/status");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("RouteCollection stores route names as metadata", () => {
  const routes = new RouteCollection();

  const route = routes.get("/dashboard", (c) => c.text("Dashboard")).name("dashboard");

  assert.equal(route.nameValue, "dashboard");
  assert.equal(routes.routes[0]?.nameValue, "dashboard");
});
