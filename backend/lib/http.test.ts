import assert from "node:assert/strict";
import test from "node:test";
import { jsonResponse, optionsResponse } from "./http";

test("CORS uses only configured origin, including trailing slash and whitespace", () => {
  const original = process.env.FRONTEND_URL;
  try {
    for (const value of ["https://example.com", " https://example.com/ ", "https://example.com/path"]) {
      process.env.FRONTEND_URL = value;
      assert.equal(jsonResponse({ success: true }).headers.get("Access-Control-Allow-Origin"), "https://example.com");
      const preflight = optionsResponse();
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "https://example.com");
      assert.match(preflight.headers.get("Access-Control-Allow-Headers")!, /Authorization/);
    }
  } finally {
    if (original === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = original;
  }
});
