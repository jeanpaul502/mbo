#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const templateDirectory = new URL("../templates/app/", import.meta.url);
let compilerModulePromise;
let packageManagerModulePromise;
let runtimeModulePromise;

async function loadCompiler() {
  compilerModulePromise ??= import("../packages/compiler/dist/index.js").catch(() => {
    throw new Error("Compiler package is not built. Run `npm install` then `npm run build` from the IT Framework repository.");
  });
  return compilerModulePromise;
}

async function loadPackageManager() {
  packageManagerModulePromise ??= import("../packages/package-manager/dist/index.js").catch(() => {
    throw new Error("Package manager is not built. Run `npm install` then `npm run build` from the IT Framework repository.");
  });
  return packageManagerModulePromise;
}

async function loadRuntime() {
  runtimeModulePromise ??= import("../packages/runtime/dist/index.js").catch(() => {
    throw new Error("Runtime package is not built. Run `npm install` then `npm run build` from the IT Framework repository.");
  });
  return runtimeModulePromise;
}

async function main() {
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

function printHelp() {
  console.log(`
IT Framework CLI

Commands:
  it create app <name>
  it dev [entry-file]
  it build [entry-file] [out-dir]
  it test
  it deploy
  it install <package> [version]
  it remove <package>
  it update <package> [version]
  it doctor
`);
}

function parseItConfig(content) {
  const config = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"$/);
    if (match?.[1] && match[2] !== undefined) {
      config[match[1]] = match[2];
    }
  }
  return config;
}

async function resolveProjectEntry(projectRoot) {
  const configPath = resolve(projectRoot, "it.config");
  if (existsSync(configPath)) {
    const config = parseItConfig(await readFile(configPath, "utf8"));
    if (config.entry) {
      return config.entry;
    }
  }
  return "examples/basic-app/app/pages/Home.it";
}

async function createApp(name) {
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

async function dev(entryFile) {
  const { compileItFile } = await loadCompiler();
  const { createApplication, registerModule, renderApplicationSummary } = await loadRuntime();
  const resolvedEntryFile = entryFile ?? (await resolveProjectEntry(process.cwd()));
  const result = await compileItFile(resolve(process.cwd(), resolvedEntryFile));
  if (!result.success) {
    console.error("Compilation failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(`- [${diagnostic.severity}] ${diagnostic.message} at ${diagnostic.location.line}:${diagnostic.location.column}`);
    }
    process.exitCode = 1;
    return;
  }

  const declarationsMatch = result.code.match(/\[(.|\s)*\]/);
  const declarations = JSON.parse(declarationsMatch?.[0] ?? "[]");
  const app = createApplication("it-dev-session");
  registerModule(app, { kind: "it-module", declarations });
  console.log(renderApplicationSummary(app));
  console.log("\nGenerated code:\n");
  console.log(result.code);
}

async function build(entryFile, outDir = ".it-build") {
  const { compileItFile } = await loadCompiler();
  const resolvedEntryFile = entryFile ?? (await resolveProjectEntry(process.cwd()));
  const result = await compileItFile(resolve(process.cwd(), resolvedEntryFile));
  if (!result.success) {
    console.error("Build failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(`- [${diagnostic.severity}] ${diagnostic.message} at ${diagnostic.location.line}:${diagnostic.location.column}`);
    }
    process.exitCode = 1;
    return;
  }

  const outputDirectory = resolve(process.cwd(), outDir);
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, "module.js");
  writeFileSync(outputPath, result.code, "utf8");
  console.log(`Build completed: ${outputPath}`);
}

async function installDependency(name, version = "latest") {
  if (!name) {
    throw new Error("Usage: it install <package> [version]");
  }
  const { addDependency, syncVendorDirectory } = await loadPackageManager();
  const manifestPath = resolve(process.cwd(), "package.it");
  const manifest = await addDependency(manifestPath, { name, version });
  await syncVendorDirectory(process.cwd(), manifest);
  console.log(`Installed ${name}@${version}`);
}

async function removeDependencyCommand(name) {
  if (!name) {
    throw new Error("Usage: it remove <package>");
  }
  const { removeDependency, syncVendorDirectory } = await loadPackageManager();
  const manifestPath = resolve(process.cwd(), "package.it");
  const manifest = await removeDependency(manifestPath, name);
  await syncVendorDirectory(process.cwd(), manifest);
  console.log(`Removed ${name}`);
}

async function updateDependency(name, version = "latest") {
  if (!name) {
    throw new Error("Usage: it update <package> [version]");
  }
  await installDependency(name, version);
}

async function doctor() {
  const projectRoot = process.cwd();
  const manifestPath = resolve(projectRoot, "package.it");
  const configPath = resolve(projectRoot, "it.config");
  const appPagesPath = resolve(projectRoot, "app", "pages");
  const checks = [
    ["package.it", existsSync(manifestPath)],
    ["it.config", existsSync(configPath)],
    ["app/pages/", existsSync(appPagesPath)],
    ["vendor/", existsSync(resolve(projectRoot, "vendor"))],
    ["plugins/", existsSync(resolve(projectRoot, "plugins"))]
  ];

  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "MISSING"}  ${label}`);
  }

  if (existsSync(manifestPath)) {
    const { readPackageIt } = await loadPackageManager();
    const manifest = await readPackageIt(manifestPath);
    console.log(`Dependencies: ${manifest.dependencies.length}`);
  }
}

async function replaceInProject(directory, searchValue, replacement) {
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
