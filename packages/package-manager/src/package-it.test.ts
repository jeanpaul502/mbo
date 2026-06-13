import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parsePackageIt, syncVendorDirectory } from "./index.js";

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

test("syncVendorDirectory materializes installed package metadata", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "itfw-workspace-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "itfw-project-"));

  await mkdir(join(workspaceRoot, "packages", "runtime"), { recursive: true });
  await writeFile(
    join(workspaceRoot, "packages", "runtime", "package.json"),
    JSON.stringify({ name: "@itfw/runtime", version: "0.1.0" }),
    "utf8"
  );

  await syncVendorDirectory(
    projectRoot,
    {
      name: "demo",
      version: "0.1.0",
      dependencies: [{ name: "@itfw/runtime", version: "0.1.0" }]
    },
    { registryRoot: workspaceRoot }
  );

  const installedRaw = await readFile(join(projectRoot, "vendor", "installed.json"), "utf8");
  const installed = JSON.parse(installedRaw) as {
    installed: Array<{ name: string; source: string; sourcePath?: string }>;
  };
  const packageRecordRaw = await readFile(join(projectRoot, "vendor", "@itfw", "runtime", "package.json"), "utf8");
  const packageRecord = JSON.parse(packageRecordRaw) as { name: string; source: string };

  assert.equal(installed.installed[0]?.name, "@itfw/runtime");
  assert.equal(installed.installed[0]?.source, "local-workspace");
  assert.equal(packageRecord.name, "@itfw/runtime");
  assert.equal(packageRecord.source, "local-workspace");
});
