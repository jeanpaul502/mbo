import test from "node:test";
import assert from "node:assert/strict";
import { parsePackageIt } from "./index.js";

test("parsePackageIt extracts dependencies", () => {
  const manifest = parsePackageIt(`
    name "demo";
    version "0.1.0";
    dependency "@itfw/runtime" "0.1.0";
  `);

  assert.equal(manifest.name, "demo");
  assert.equal(manifest.dependencies.length, 1);
  assert.equal(manifest.dependencies[0]?.name, "@itfw/runtime");
});
