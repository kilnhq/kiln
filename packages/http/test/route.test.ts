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
