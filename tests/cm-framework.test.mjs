import test from "node:test";
import assert from "node:assert/strict";
import { parseCmSource } from "../src/compiler/cm-parser.mjs";

test("parseCmSource reads a .cm page declaration", () => {
  const declaration = parseCmSource(`
page Home {
  title: "Demo";
  layout: "Main";
}
`);

  assert.equal(declaration.kind, "page");
  assert.equal(declaration.name, "Home");
  assert.equal(declaration.properties.title, "Demo");
  assert.equal(declaration.properties.layout, "Main");
});
