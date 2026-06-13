#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProject, installProject, runDoctor, serveProject } from "../src/server/dev-server.mjs";

const frameworkRoot = fileURLToPath(new URL("..", import.meta.url));
const TEMPLATE_ITEMS = [
  "app",
  "bootstrap",
  "config",
  "database",
  "public",
  "resources",
  "routes",
  "src",
  "storage",
  "vendor",
  "plugins",
  "logs",
  "tests",
  "bin",
  ".gitignore",
  ".env",
  ".env.example",
  "cm.config.json",
  "package.json",
  "README.md"
];

async function replaceInProject(directory, searchValue, replacement) {
  const entries = await readdir(directory);
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }

    const absolutePath = join(directory, entry);
    const entryStat = await stat(absolutePath);
    if (entryStat.isDirectory()) {
      await replaceInProject(absolutePath, searchValue, replacement);
      continue;
    }

    const extension = absolutePath.split(".").pop() ?? "";
    const textLike = ["json", "md", "cm", "mjs", "js", "ts", "css", "env", "txt"];
    if (!textLike.includes(extension) && !absolutePath.endsWith(".env")) {
      continue;
    }

    const content = await readFile(absolutePath, "utf8");
    if (content.includes(searchValue)) {
      await writeFile(absolutePath, content.replaceAll(searchValue, replacement), "utf8");
    }
  }
}

async function createNewProject(name) {
  const target = resolve(process.cwd(), name);
  const projectName = basename(target);
  if (existsSync(target)) {
    const entries = await readdir(target);
    if (entries.length > 0) {
      throw new Error(`Target directory already exists and is not empty: ${target}`);
    }
  } else {
    mkdirSync(target, { recursive: true });
  }

  for (const item of TEMPLATE_ITEMS) {
    cpSync(resolve(frameworkRoot, item), resolve(target, item), { recursive: true, force: true });
  }

  await replaceInProject(target, "cm-app", projectName);
  const packageJsonPath = resolve(target, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.name = projectName;
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");
  console.log(`New CM project created in ${target}`);
}

function printHelp() {
  console.log(`
CM Framework CLI

Commands:
  cm new <name>
  cm install
  cm doctor
  cm serve
  cm build
`);
}

async function main() {
  const [command, arg1] = process.argv.slice(2);
  switch (command) {
    case "new":
      if (!arg1) {
        throw new Error("Usage: cm new <name>");
      }
      await createNewProject(arg1);
      return;
    case "install":
      await installProject(process.cwd());
      return;
    case "doctor":
      await runDoctor(process.cwd());
      return;
    case "serve":
      await serveProject(process.cwd());
      return;
    case "build":
      await buildProject(process.cwd());
      return;
    default:
      printHelp();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
