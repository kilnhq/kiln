import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { response, RouteCollection, registerRoutes } from "../src/index.ts";

test("RequestContext reads headers and cookies", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/profile", (ctx) => {
    return response.json({
      session: ctx.request.cookie("session"),
      userAgent: ctx.request.header("user-agent"),
    });
  });

  registerRoutes(hono, routes);

  const result = await hono.request("/profile", {
    headers: {
      cookie: "session=abc123; theme=dark",
      "user-agent": "Kiln Test",
    },
  });

  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {
    session: "abc123",
    userAgent: "Kiln Test",
  });
});

test("RequestContext reads query input", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/search", async (ctx) => {
    return response.json({ q: await ctx.request.input("q") });
  });

  registerRoutes(hono, routes);

  const result = await hono.request("/search?q=kiln");

  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { q: "kiln" });
});

test("RequestContext reads JSON body input and selected keys", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.post("/users", async (ctx) => {
    return response.json({
      email: await ctx.request.input("email"),
      only: await ctx.request.only(["name", "email"]),
    });
  });

  registerRoutes(hono, routes);

  const result = await hono.request("/users?ignored=query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Sam", email: "sam@example.com", password: "secret" }),
  });

  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {
    email: "sam@example.com",
    only: { name: "Sam", email: "sam@example.com" },
  });
});

test("RequestContext reads form body input", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.post("/login", async (ctx) => {
    return response.json({ email: await ctx.request.input("email") });
  });

  registerRoutes(hono, routes);

  const form = new URLSearchParams({ email: "sam@example.com" });
  const result = await hono.request("/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });

  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { email: "sam@example.com" });
});

test("RequestContext reads Cloudflare client IP headers", async () => {
  const routes = new RouteCollection();
  const hono = new Hono();

  routes.get("/ip", (ctx) => response.json({ ip: ctx.request.ip() }));

  registerRoutes(hono, routes);

  const result = await hono.request("/ip", {
    headers: { "cf-connecting-ip": "203.0.113.10" },
  });

  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ip: "203.0.113.10" });
});
