#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileItFile } from "@itfw/compiler";
import {
  addDependency,
  readPackageIt,
  removeDependency,
  syncVendorDirectory
} from "@itfw/package-manager";
import { createApplication, registerModule, renderApplicationSummary } from "@itfw/runtime";

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
  it install <package> [version]
  it remove <package>
  it update <package> [version]
  it doctor
`);
}

async function createApp(name: string): Promise<void> {
  const target = resolve(process.cwd(), name);
  const template = fileURLToPath(templateDirectory);

  if (!existsSync(template)) {
    throw new Error("Template directory not found. Rebuild or reinstall IT Framework.");
  }

  if (existsSync(target)) {
    throw new Error(`Target directory already exists: ${target}`);
  }

  cpSync(template, target, { recursive: true });
  await replaceInProject(target, "my-app", name);
  console.log(`Application created in ${target}`);
}

async function dev(entryFile = "examples/basic-app/app/pages/Home.it"): Promise<void> {
  const result = await compileItFile(resolve(process.cwd(), entryFile));
  if (!result.success) {
    console.error("Compilation failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(`- [${diagnostic.severity}] ${diagnostic.message} at ${diagnostic.location.line}:${diagnostic.location.column}`);
    }
    process.exitCode = 1;
    return;
  }

  const app = createApplication("it-dev-session");
  registerModule(app, { kind: "it-module", declarations: JSON.parse(result.code.match(/\[(.|\s)*\]/)?.[0] ?? "[]") });
  console.log(renderApplicationSummary(app));
  console.log("\nGenerated code:\n");
  console.log(result.code);
}

async function build(entryFile = "examples/basic-app/app/pages/Home.it", outDir = ".it-build"): Promise<void> {
  const result = await compileItFile(resolve(process.cwd(), entryFile));
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

async function installDependency(name?: string, version?: string): Promise<void> {
  if (!name) {
    throw new Error("Usage: it install <package> [version]");
  }
  const manifestPath = resolve(process.cwd(), "package.it");
  const manifest = await addDependency(manifestPath, { name, version: version ?? "latest" });
  await syncVendorDirectory(process.cwd(), manifest);
  console.log(`Installed ${name}@${version ?? "latest"}`);
}

async function removeDependencyCommand(name?: string): Promise<void> {
  if (!name) {
    throw new Error("Usage: it remove <package>");
  }
  const manifestPath = resolve(process.cwd(), "package.it");
  const manifest = await removeDependency(manifestPath, name);
  await syncVendorDirectory(process.cwd(), manifest);
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
  const checks = [
    ["package.it", existsSync(manifestPath)],
    ["vendor/", existsSync(resolve(projectRoot, "vendor"))],
    ["templates/", existsSync(resolve(projectRoot, "templates"))]
  ];

  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "MISSING"}  ${label}`);
  }

  if (existsSync(manifestPath)) {
    const manifest = await readPackageIt(manifestPath);
    console.log(`Dependencies: ${manifest.dependencies.length}`);
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
