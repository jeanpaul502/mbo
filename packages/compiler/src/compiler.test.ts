import test from "node:test";
import assert from "node:assert/strict";
import { compileItSource } from "./index.js";

test("compileItSource parses declarations and emits code", () => {
  const result = compileItSource(`
    page Home {
      route: "/";
      title: "Dashboard";
    }
  `);

  assert.equal(result.success, true);
  assert.equal(result.program.body.length, 1);
  assert.match(result.code, /Dashboard/);
});
