import assert from "node:assert/strict";
import test from "node:test";
import { createApp, type ExecutionContextLike } from "../src/index.ts";

const ctx: ExecutionContextLike = {
  passThroughOnException() {},
  waitUntil() {},
};

test("app.fetch and app.worker().fetch use the same runtime", async () => {
  const app = createApp();

  app.hono.get("/", (c) => c.json({ ok: true }));

  const direct = await app.fetch(new Request("https://example.com/"), {}, ctx);
  const worker = await app.worker().fetch(new Request("https://example.com/"), {}, ctx);

  assert.equal(direct.status, 200);
  assert.equal(worker.status, 200);
  assert.deepEqual(await direct.json(), { ok: true });
  assert.deepEqual(await worker.json(), { ok: true });
});

test("createApp registers explicitly imported route modules", async () => {
  const app = createApp({
    routes: (hono) => {
      hono.get("/routes", (c) => c.json({ registered: true }));
    },
  });

  const response = await app.fetch(new Request("https://example.com/routes"), {}, ctx);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { registered: true });
});
