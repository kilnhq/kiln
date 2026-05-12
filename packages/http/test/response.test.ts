import assert from "node:assert/strict";
import test from "node:test";
import { response } from "../src/index.ts";

test("response.json returns a JSON response", async () => {
  const result = response.json({ ok: true }, 201);

  assert.equal(result.status, 201);
  assert.equal(result.headers.get("content-type"), "application/json");
  assert.deepEqual(await result.json(), { ok: true });
});

test("response.text returns a text response", async () => {
  const result = response.text("Hello", 202);

  assert.equal(result.status, 202);
  assert.equal(result.headers.get("content-type"), "text/plain; charset=UTF-8");
  assert.equal(await result.text(), "Hello");
});

test("response.html returns an HTML response", async () => {
  const result = response.html("<h1>Hello</h1>");

  assert.equal(result.status, 200);
  assert.equal(result.headers.get("content-type"), "text/html; charset=UTF-8");
  assert.equal(await result.text(), "<h1>Hello</h1>");
});

test("response.redirect returns a redirect response", () => {
  const result = response.redirect("https://example.com/login", 303);

  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "https://example.com/login");
});

test("response.notFound returns a 404 JSON response", async () => {
  const result = response.notFound();

  assert.equal(result.status, 404);
  assert.deepEqual(await result.json(), { message: "Not Found" });
});

test("response.noContent returns an empty 204 response", async () => {
  const result = response.noContent();

  assert.equal(result.status, 204);
  assert.equal(await result.text(), "");
});
