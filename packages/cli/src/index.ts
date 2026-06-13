#!/usr/bin/env node
import { createServer } from "node:http";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileItFile } from "@itfw/compiler";
import {
  addDependency,
  readPackageIt,
  removeDependency,
  syncVendorDirectory
} from "@itfw/package-manager";

const frameworkRoot = fileURLToPath(new URL("../../..", import.meta.url));
const templateDirectory = new URL("../../../templates/app/", import.meta.url);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);
  const subcommand = rest[0];

  if (!command) {
    printHelp();
    return;
  }

  if (command === "create" && subcommand === "app") {
    const appName = rest[1];
    if (!appName) {
      throw new Error("Usage: it create app <name>");
    }
    await createApp(appName);
    return;
  }

  switch (command) {
    case "dev":
      await dev(rest[0]);
      return;
    case "build":
      await build(rest[0], rest[1]);
      return;
    case "test":
      console.log("Test pipeline placeholder. Run workspace tests with: npm run test");
      return;
    case "deploy":
      console.log("Deploy pipeline placeholder. Connect this command to your target environment.");
      return;
    case "install":
      await installDependency(rest[0], rest[1] ?? "latest");
      return;
    case "remove":
      await removeDependencyCommand(rest[0]);
      return;
    case "update":
      await updateDependency(rest[0], rest[1] ?? "latest");
      return;
    case "doctor":
      await doctor();
      return;
    default:
      printHelp();
  }
}

function printHelp(): void {
  console.log(`
IT Framework CLI

Commands:
  it create app <name>
  it dev [entry-file]
  it build [entry-file] [out-dir]
  it test
  it deploy
  it install [package] [version]
  it remove <package>
  it update <package> [version]
  it doctor
`);
}

function parseItConfig(content: string): Record<string, string> {
  const config: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|([^\s#]+))$/);
    if (match?.[1]) {
      config[match[1]] = match[2] ?? match[3] ?? "";
    }
  }
  return config;
}

async function resolveProjectConfig(projectRoot: string): Promise<{ appName: string; entry: string; port: number }> {
  const configPath = resolve(projectRoot, "it.config");
  if (existsSync(configPath)) {
    const config = parseItConfig(await readFile(configPath, "utf8"));
    const port = Number(config.port ?? "3000");
    return {
      appName: config.appName ?? "it-app",
      entry: config.entry ?? "app/pages/Home.it",
      port: Number.isFinite(port) ? port : 3000
    };
  }
  return {
    appName: "it-app",
    entry: "examples/basic-app/app/pages/Home.it",
    port: 3000
  };
}

async function compileProjectEntry(projectRoot: string, entryFile?: string) {
  const resolvedEntryFile = entryFile ?? (await resolveProjectConfig(projectRoot)).entry;
  const result = await compileItFile(resolve(projectRoot, resolvedEntryFile));
  return { entryFile: resolvedEntryFile, result };
}

function formatDiagnosticsHtml(
  diagnostics: Array<{ severity: string; message: string; location: { line: number; column: number } }>
): string {
  if (!diagnostics.length) {
    return "<p>No diagnostics.</p>";
  }

  return [
    "<ul>",
    ...diagnostics.map(
      (diagnostic) =>
        `<li>[${diagnostic.severity}] ${diagnostic.message} at ${diagnostic.location.line}:${diagnostic.location.column}</li>`
    ),
    "</ul>"
  ].join("\n");
}

function createIndexHtml(params: {
  appName: string;
  entryFile: string;
  code: string;
  diagnostics: Array<{ severity: string; message: string; location: { line: number; column: number } }>;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${params.appName} - IT Framework Dev</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #0b1020; color: #e5e7eb; }
      .card { max-width: 960px; margin: 0 auto; background: #11182c; border: 1px solid #26304a; border-radius: 16px; padding: 24px; }
      h1, h2 { margin-top: 0; }
      code, pre { font-family: Consolas, monospace; }
      pre { padding: 16px; overflow: auto; background: #0f172a; border-radius: 12px; border: 1px solid #334155; }
      .ok { color: #22c55e; }
      .error { color: #f87171; }
      a { color: #60a5fa; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>IT Framework Dev Server</h1>
      <p>Application: <strong>${params.appName}</strong></p>
      <p>Entry file: <code>${params.entryFile}</code></p>
      <p>Status: <span class="${params.diagnostics.length ? "error" : "ok"}">${params.diagnostics.length ? "Diagnostics detected" : "Compiled successfully"}</span></p>
      <p><a href="/module.js">Open generated module</a></p>
      <h2>Diagnostics</h2>
      ${formatDiagnosticsHtml(params.diagnostics)}
      <h2>Generated Module</h2>
      <pre>${params.code.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
    </div>
  </body>
</html>`;
}

async function ensureProjectSupportDirectories(projectRoot: string): Promise<void> {
  mkdirSync(resolve(projectRoot, "vendor"), { recursive: true });
  mkdirSync(resolve(projectRoot, "plugins"), { recursive: true });
}

async function createApp(name: string): Promise<void> {
  const target = resolve(process.cwd(), name);
  const template = fileURLToPath(templateDirectory);

  if (!existsSync(template)) {
    throw new Error("Template directory not found. Rebuild or reinstall IT Framework.");
  }

  if (existsSync(target)) {
    const existingEntries = await readdir(target);
    if (existingEntries.length > 0) {
      throw new Error(`Target directory already exists and is not empty: ${target}`);
    }
  } else {
    mkdirSync(target, { recursive: true });
  }

  cpSync(template, target, { recursive: true });
  await replaceInProject(target, "my-app", name);
  console.log(`Application created in ${target}`);
}

async function dev(entryFile?: string): Promise<void> {
  const projectRoot = process.cwd();
  const config = await resolveProjectConfig(projectRoot);
  const resolvedEntryFile = entryFile ?? config.entry;

  const server = createServer(async (request, response) => {
    const { result } = await compileProjectEntry(projectRoot, resolvedEntryFile);

    if (request.url === "/module.js") {
      if (!result.success) {
        response.writeHead(500, { "content-type": "application/javascript; charset=utf-8" });
        response.end(`throw new Error(${JSON.stringify(result.diagnostics.map((item) => item.message).join(" | "))});`);
        return;
      }
      response.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
      response.end(result.code);
      return;
    }

    if (request.url === "/__it/health") {
      response.writeHead(result.success ? 200 : 500, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: result.success, diagnostics: result.diagnostics, entry: resolvedEntryFile }, null, 2));
      return;
    }

    response.writeHead(result.success ? 200 : 500, { "content-type": "text/html; charset=utf-8" });
    response.end(
      createIndexHtml({
        appName: config.appName,
        entryFile: resolvedEntryFile,
        code: result.code,
        diagnostics: result.diagnostics
      })
    );
  });

  server.listen(config.port, () => {
    console.log(`IT Framework dev server running at http://localhost:${config.port}/`);
    console.log(`Application: ${config.appName}`);
    console.log(`Entry: ${resolvedEntryFile}`);
  });

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
}

async function build(entryFile?: string, outDir = ".it-build"): Promise<void> {
  const projectRoot = process.cwd();
  const { entryFile: resolvedEntryFile, result } = await compileProjectEntry(projectRoot, entryFile);
  if (!result.success) {
    console.error("Build failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(`- [${diagnostic.severity}] ${diagnostic.message} at ${diagnostic.location.line}:${diagnostic.location.column}`);
    }
    process.exitCode = 1;
    return;
  }

  const outputDirectory = resolve(projectRoot, outDir);
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, "module.js");
  writeFileSync(outputPath, result.code, "utf8");
  console.log(`Build completed: ${outputPath}`);
  console.log(`Source entry: ${resolvedEntryFile}`);
}

async function installDependency(name?: string, version?: string): Promise<void> {
  const projectRoot = process.cwd();
  const manifestPath = resolve(projectRoot, "package.it");
  const manifest = name
    ? await addDependency(manifestPath, { name, version: version ?? "latest" })
    : await readPackageIt(manifestPath);

  await ensureProjectSupportDirectories(projectRoot);
  await syncVendorDirectory(projectRoot, manifest, { registryRoot: frameworkRoot });

  if (name) {
    console.log(`Installed ${name}@${version ?? "latest"}`);
  } else {
    console.log(`Synchronized ${manifest.dependencies.length} dependencies from package.it`);
  }
}

async function removeDependencyCommand(name?: string): Promise<void> {
  if (!name) {
    throw new Error("Usage: it remove <package>");
  }
  const projectRoot = process.cwd();
  const manifestPath = resolve(projectRoot, "package.it");
  const manifest = await removeDependency(manifestPath, name);
  await ensureProjectSupportDirectories(projectRoot);
  await syncVendorDirectory(projectRoot, manifest, { registryRoot: frameworkRoot });
  console.log(`Removed ${name}`);
}

async function updateDependency(name?: string, version?: string): Promise<void> {
  if (!name) {
    throw new Error("Usage: it update <package> [version]");
  }
  await installDependency(name, version ?? "latest");
}

async function doctor(): Promise<void> {
  const projectRoot = process.cwd();
  const manifestPath = resolve(projectRoot, "package.it");
  const configPath = resolve(projectRoot, "it.config");
  const appPagesPath = resolve(projectRoot, "app", "pages");
  const vendorPath = resolve(projectRoot, "vendor");
  const pluginsPath = resolve(projectRoot, "plugins");
  const checks = [
    ["package.it", existsSync(manifestPath)],
    ["it.config", existsSync(configPath)],
    ["app/pages/", existsSync(appPagesPath)],
    ["vendor/", existsSync(vendorPath)],
    ["plugins/", existsSync(pluginsPath)]
  ];

  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "MISSING"}  ${label}`);
  }

  if (existsSync(manifestPath)) {
    const manifest = await readPackageIt(manifestPath);
    console.log(`Dependencies: ${manifest.dependencies.length}`);
  }

  const vendorManifestPath = resolve(projectRoot, "vendor", "installed.json");
  if (existsSync(vendorManifestPath)) {
    const installed = JSON.parse(await readFile(vendorManifestPath, "utf8")) as { installed?: unknown[] };
    console.log(`Vendor installed entries: ${installed.installed?.length ?? 0}`);
  }
}

async function replaceInProject(directory: string, searchValue: string, replacement: string): Promise<void> {
  const entries = await readdir(directory);
  for (const entry of entries) {
    const absolutePath = join(directory, entry);
    const entryStat = await stat(absolutePath);
    if (entryStat.isDirectory()) {
      await replaceInProject(absolutePath, searchValue, replacement);
      continue;
    }
    const content = await readFile(absolutePath, "utf8");
    await writeFile(absolutePath, content.replaceAll(searchValue, replacement), "utf8");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
