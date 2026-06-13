import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();

function write(relativePath, content) {
  const absolutePath = join(root, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content.trimStart(), "utf8");
}

const files = {
  "packages/compiler/src/ast.ts": `
export type ITDeclarationKind =
  | "page"
  | "component"
  | "route"
  | "api"
  | "model"
  | "service"
  | "event"
  | "notification"
  | "style"
  | "permission"
  | "middleware";

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

export interface Token {
  type: string;
  value: string;
  span: SourceSpan;
}

export interface ITProperty {
  key: string;
  value: string;
  span: SourceSpan;
}

export interface ITDeclaration {
  kind: ITDeclarationKind;
  name: string;
  properties: ITProperty[];
  span: SourceSpan;
}

export interface ITProgram {
  type: "Program";
  body: ITDeclaration[];
}
`,
  "packages/compiler/src/diagnostics.ts": `
import type { SourceLocation } from "./ast.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  location: SourceLocation;
}

export class DiagnosticBag {
  private readonly entries: Diagnostic[] = [];

  add(severity: DiagnosticSeverity, message: string, location: SourceLocation): void {
    this.entries.push({ severity, message, location });
  }

  error(message: string, location: SourceLocation): void {
    this.add("error", message, location);
  }

  warning(message: string, location: SourceLocation): void {
    this.add("warning", message, location);
  }

  toArray(): Diagnostic[] {
    return [...this.entries];
  }

  hasErrors(): boolean {
    return this.entries.some((entry) => entry.severity === "error");
  }
}
`,
  "packages/compiler/src/lexer.ts": `
import type { SourceLocation, SourceSpan, Token } from "./ast.js";
import { DiagnosticBag } from "./diagnostics.js";

const KEYWORDS = new Set([
  "page",
  "component",
  "route",
  "api",
  "model",
  "service",
  "event",
  "notification",
  "style",
  "permission",
  "middleware"
]);

function cloneLocation(location: SourceLocation): SourceLocation {
  return { ...location };
}

function createSpan(start: SourceLocation, end: SourceLocation): SourceSpan {
  return { start: cloneLocation(start), end: cloneLocation(end) };
}

export function lex(source: string, diagnostics = new DiagnosticBag()): { tokens: Token[]; diagnostics: DiagnosticBag } {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  function location(): SourceLocation {
    return { line, column, offset: index };
  }

  function advance(): string {
    const character = source[index] ?? "";
    index += 1;
    if (character === "\\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  }

  while (index < source.length) {
    const current = source[index] ?? "";

    if (/\\s/.test(current)) {
      advance();
      continue;
    }

    if (current === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\\n") {
        advance();
      }
      continue;
    }

    const start = location();

    if (/[A-Za-z_]/.test(current)) {
      let value = "";
      while (index < source.length && /[A-Za-z0-9_-]/.test(source[index] ?? "")) {
        value += advance();
      }
      tokens.push({
        type: KEYWORDS.has(value) ? "keyword" : "identifier",
        value,
        span: createSpan(start, location())
      });
      continue;
    }

    if (current === "\\"") {
      advance();
      let value = "";
      while (index < source.length && source[index] !== "\\"") {
        value += advance();
      }
      if (source[index] !== "\\"") {
        diagnostics.error("Unterminated string literal.", start);
      } else {
        advance();
      }
      tokens.push({
        type: "string",
        value,
        span: createSpan(start, location())
      });
      continue;
    }

    if ("{}:;".includes(current)) {
      advance();
      tokens.push({
        type: current,
        value: current,
        span: createSpan(start, location())
      });
      continue;
    }

    diagnostics.error(\`Unexpected character "\${current}".\`, start);
    advance();
  }

  const end = location();
  tokens.push({
    type: "eof",
    value: "",
    span: createSpan(end, end)
  });

  return { tokens, diagnostics };
}
`,
  "packages/compiler/src/parser.ts": `
import type { ITDeclaration, ITDeclarationKind, ITProgram, ITProperty, Token } from "./ast.js";
import { DiagnosticBag } from "./diagnostics.js";

const DECLARATION_KINDS = new Set<ITDeclarationKind>([
  "page",
  "component",
  "route",
  "api",
  "model",
  "service",
  "event",
  "notification",
  "style",
  "permission",
  "middleware"
]);

export class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly diagnostics: DiagnosticBag
  ) {}

  parseProgram(): ITProgram {
    const body: ITDeclaration[] = [];

    while (!this.is("eof")) {
      const declaration = this.parseDeclaration();
      if (declaration) {
        body.push(declaration);
      } else {
        this.index += 1;
      }
    }

    return { type: "Program", body };
  }

  private parseDeclaration(): ITDeclaration | null {
    const kindToken = this.current();
    if (kindToken.type !== "keyword" || !DECLARATION_KINDS.has(kindToken.value as ITDeclarationKind)) {
      this.diagnostics.error("Expected a declaration keyword.", kindToken.span.start);
      return null;
    }

    this.index += 1;
    const nameToken = this.expect("identifier", "Expected a declaration name.");
    const openBrace = this.expect("{", "Expected '{' after declaration name.");

    const properties: ITProperty[] = [];
    while (!this.is("}") && !this.is("eof")) {
      const property = this.parseProperty();
      if (property) {
        properties.push(property);
      } else {
        this.index += 1;
      }
    }

    const closeBrace = this.expect("}", "Expected '}' to close declaration.");

    return {
      kind: kindToken.value as ITDeclarationKind,
      name: nameToken.value,
      properties,
      span: {
        start: kindToken.span.start,
        end: closeBrace.span.end
      }
    };
  }

  private parseProperty(): ITProperty | null {
    const key = this.expect("identifier", "Expected a property name.");
    this.expect(":", "Expected ':' after property name.");

    const valueToken = this.current();
    if (valueToken.type !== "string" && valueToken.type !== "identifier") {
      this.diagnostics.error("Expected a string or identifier property value.", valueToken.span.start);
      return null;
    }
    this.index += 1;
    const end = this.expect(";", "Expected ';' after property value.");

    return {
      key: key.value,
      value: valueToken.value,
      span: {
        start: key.span.start,
        end: end.span.end
      }
    };
  }

  private expect(type: string, message: string): Token {
    const token = this.current();
    if (token.type !== type) {
      this.diagnostics.error(message, token.span.start);
      return token;
    }
    this.index += 1;
    return token;
  }

  private current(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private is(type: string): boolean {
    return this.current().type === type;
  }
}
`,
  "packages/compiler/src/transform.ts": `
import type { ITDeclaration, ITProgram } from "./ast.js";

function normalizeDeclaration(declaration: ITDeclaration): ITDeclaration {
  return {
    ...declaration,
    properties: declaration.properties.map((property) => ({
      ...property,
      key: property.key.trim(),
      value: property.value.trim()
    }))
  };
}

export function transformProgram(program: ITProgram): ITProgram {
  return {
    type: "Program",
    body: program.body.map(normalizeDeclaration)
  };
}
`,
  "packages/compiler/src/optimizer.ts": `
import type { ITProgram } from "./ast.js";

export function optimizeProgram(program: ITProgram): ITProgram {
  return {
    type: "Program",
    body: program.body.map((declaration) => {
      const dedupedProperties = new Map<string, string>();
      for (const property of declaration.properties) {
        dedupedProperties.set(property.key, property.value);
      }

      return {
        ...declaration,
        properties: declaration.properties.filter(
          (property, index, all) =>
            index === all.findIndex((candidate) => candidate.key === property.key && dedupedProperties.get(property.key) === property.value)
        )
      };
    })
  };
}
`,
  "packages/compiler/src/generator.ts": `
import type { ITProgram } from "./ast.js";

function generateDeclarationRecord(program: ITProgram): string {
  return JSON.stringify(
    program.body.map((declaration) => ({
      kind: declaration.kind,
      name: declaration.name,
      properties: Object.fromEntries(declaration.properties.map((property) => [property.key, property.value]))
    })),
    null,
    2
  );
}

export function generateCode(program: ITProgram): string {
  const declarations = generateDeclarationRecord(program);
  return [
    "export const moduleKind = \\"it-module\\";",
    \`export const declarations = \${declarations};\`,
    "export function defineModule() {",
    "  return { kind: moduleKind, declarations };",
    "}",
    "export default defineModule();"
  ].join("\\n");
}
`,
  "packages/compiler/src/index.ts": `
import { readFile } from "node:fs/promises";
import type { ITProgram } from "./ast.js";
import type { Diagnostic } from "./diagnostics.js";
import { DiagnosticBag } from "./diagnostics.js";
import { generateCode } from "./generator.js";
import { lex } from "./lexer.js";
import { optimizeProgram } from "./optimizer.js";
import { Parser } from "./parser.js";
import { transformProgram } from "./transform.js";

export interface CompileResult {
  program: ITProgram;
  code: string;
  diagnostics: Diagnostic[];
  success: boolean;
}

export function compileItSource(source: string): CompileResult {
  const diagnostics = new DiagnosticBag();
  const { tokens } = lex(source, diagnostics);
  const parser = new Parser(tokens, diagnostics);
  const parsedProgram = parser.parseProgram();
  const transformedProgram = transformProgram(parsedProgram);
  const optimizedProgram = optimizeProgram(transformedProgram);
  const code = generateCode(optimizedProgram);

  return {
    program: optimizedProgram,
    code,
    diagnostics: diagnostics.toArray(),
    success: !diagnostics.hasErrors()
  };
}

export async function compileItFile(filePath: string): Promise<CompileResult> {
  const source = await readFile(filePath, "utf8");
  return compileItSource(source);
}

export * from "./ast.js";
export * from "./diagnostics.js";
`,
  "packages/compiler/src/compiler.test.ts": `
import test from "node:test";
import assert from "node:assert/strict";
import { compileItSource } from "./index.js";

test("compileItSource parses declarations and emits code", () => {
  const result = compileItSource(\`
    page Home {
      route: "/";
      title: "Dashboard";
    }
  \`);

  assert.equal(result.success, true);
  assert.equal(result.program.body.length, 1);
  assert.match(result.code, /Dashboard/);
});
`,
  "packages/runtime/src/index.ts": `
export interface ITCompiledDeclaration {
  kind: string;
  name: string;
  properties: Record<string, string>;
}

export interface ITCompiledModule {
  kind: "it-module";
  declarations: ITCompiledDeclaration[];
}

export interface ITApplication {
  name: string;
  modules: ITCompiledModule[];
}

export function createApplication(name: string): ITApplication {
  return {
    name,
    modules: []
  };
}

export function registerModule(application: ITApplication, module: ITCompiledModule): ITApplication {
  application.modules.push(module);
  return application;
}

export function renderApplicationSummary(application: ITApplication): string {
  const moduleCount = application.modules.length;
  const declarationCount = application.modules.reduce((count, module) => count + module.declarations.length, 0);
  return \`\${application.name}: \${moduleCount} module(s), \${declarationCount} declaration(s)\`;
}

export const runtimeCapabilities = {
  frontend: ["renderer", "hydration", "routing", "state"],
  backend: ["http", "middleware", "events", "cache"],
  platform: ["plugins", "notifications", "telemetry"]
};
`,
  "packages/frontend/src/index.ts": `
export const frontendCapabilities = {
  renderer: "custom incremental renderer",
  state: "signal-like application state",
  routing: "page and nested route resolution",
  hydration: "server to client view hydration",
  theming: "tokens, themes and dark mode",
  motion: "animations and transitions"
};

export const builtInFrontendFeatures = [
  "virtual-dom-or-custom-renderer",
  "responsive-system",
  "theme-engine",
  "hydration-pipeline",
  "page-router"
];
`,
  "packages/backend/src/index.ts": `
export const backendCapabilities = {
  httpServer: true,
  router: true,
  middleware: true,
  auth: true,
  permissions: true,
  validation: true,
  websocket: true,
  cache: true,
  queue: true,
  scheduler: true,
  logging: true,
  monitoring: true,
  storage: true,
  mail: true,
  search: true,
  events: true
};

export function createBackendKernel() {
  return {
    name: "it-backend-kernel",
    features: Object.keys(backendCapabilities).filter((feature) => backendCapabilities[feature as keyof typeof backendCapabilities])
  };
}
`,
  "packages/database/src/index.ts": `
export const supportedDatabases = ["postgresql", "mysql", "sqlite", "mongodb"] as const;

export const ormFeatures = [
  "models",
  "query-builder",
  "migrations",
  "seeders",
  "factories"
] as const;

export interface DatabaseModelDefinition {
  name: string;
  fields: Record<string, string>;
}

export function defineModel(name: string, fields: Record<string, string>): DatabaseModelDefinition {
  return { name, fields };
}
`,
  "packages/plugins/src/index.ts": `
export interface PluginManifest {
  name: string;
  version: string;
  permissions: string[];
  entry: string;
}

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginManifest>();

  register(plugin: PluginManifest): void {
    this.plugins.set(plugin.name, plugin);
  }

  list(): PluginManifest[] {
    return [...this.plugins.values()];
  }
}

export const pluginSystemFeatures = ["registry", "dynamic-loading", "sandbox", "permissions", "marketplace"];
`,
  "packages/package-manager/src/index.ts": `
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface PackageDependency {
  name: string;
  version: string;
}

export interface PackageItManifest {
  name: string;
  version: string;
  dependencies: PackageDependency[];
}

function normalizeLines(content: string): string[] {
  return content
    .split(/\\r?\\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parsePackageIt(content: string): PackageItManifest {
  const manifest: PackageItManifest = {
    name: "app",
    version: "0.1.0",
    dependencies: []
  };

  for (const line of normalizeLines(content)) {
    const nameMatch = line.match(/^name\\s+"([^"]+)";$/);
    if (nameMatch) {
      manifest.name = nameMatch[1];
      continue;
    }

    const versionMatch = line.match(/^version\\s+"([^"]+)";$/);
    if (versionMatch) {
      manifest.version = versionMatch[1];
      continue;
    }

    const dependencyMatch = line.match(/^dependency\\s+"([^"]+)"\\s+"([^"]+)";$/);
    if (dependencyMatch) {
      manifest.dependencies.push({
        name: dependencyMatch[1],
        version: dependencyMatch[2]
      });
    }
  }

  return manifest;
}

export function stringifyPackageIt(manifest: PackageItManifest): string {
  const lines = [
    \`name "\${manifest.name}";\`,
    \`version "\${manifest.version}";\`,
    ...manifest.dependencies.map((dependency) => \`dependency "\${dependency.name}" "\${dependency.version}";\`)
  ];

  return \`\${lines.join("\\n")}\\n\`;
}

export async function readPackageIt(filePath: string): Promise<PackageItManifest> {
  const content = await readFile(filePath, "utf8");
  return parsePackageIt(content);
}

export async function writePackageIt(filePath: string, manifest: PackageItManifest): Promise<void> {
  await writeFile(filePath, stringifyPackageIt(manifest), "utf8");
}

export async function addDependency(filePath: string, dependency: PackageDependency): Promise<PackageItManifest> {
  const manifest = await readPackageIt(filePath);
  const existing = manifest.dependencies.find((entry) => entry.name === dependency.name);
  if (existing) {
    existing.version = dependency.version;
  } else {
    manifest.dependencies.push(dependency);
  }
  await writePackageIt(filePath, manifest);
  return manifest;
}

export async function removeDependency(filePath: string, name: string): Promise<PackageItManifest> {
  const manifest = await readPackageIt(filePath);
  manifest.dependencies = manifest.dependencies.filter((dependency) => dependency.name !== name);
  await writePackageIt(filePath, manifest);
  return manifest;
}

export async function syncVendorDirectory(projectRoot: string, manifest: PackageItManifest): Promise<void> {
  const vendorPath = join(projectRoot, "vendor", "installed.json");
  await mkdir(dirname(vendorPath), { recursive: true });
  await writeFile(vendorPath, JSON.stringify({ installed: manifest.dependencies }, null, 2), "utf8");
}
`,
  "packages/package-manager/src/package-it.test.ts": `
import test from "node:test";
import assert from "node:assert/strict";
import { parsePackageIt } from "./index.js";

test("parsePackageIt extracts dependencies", () => {
  const manifest = parsePackageIt(\`
    name "demo";
    version "0.1.0";
    dependency "@itfw/runtime" "0.1.0";
  \`);

  assert.equal(manifest.name, "demo");
  assert.equal(manifest.dependencies.length, 1);
  assert.equal(manifest.dependencies[0]?.name, "@itfw/runtime");
});
`,
  "packages/ui/src/index.ts": `
export const builtInComponents = [
  "Button",
  "Input",
  "TextArea",
  "Select",
  "Checkbox",
  "Radio",
  "Switch",
  "Table",
  "DataGrid",
  "Modal",
  "Drawer",
  "Tabs",
  "Accordion",
  "Navbar",
  "Sidebar",
  "Breadcrumb",
  "Pagination",
  "Card",
  "Avatar",
  "Badge",
  "Alert",
  "Toast",
  "Calendar",
  "Chart",
  "Upload",
  "MarkdownEditor",
  "RichTextEditor",
  "PdfViewer",
  "VideoPlayer",
  "AudioPlayer"
] as const;
`,
  "packages/css-engine/src/index.ts": `
export const cssEngineFeatures = [
  "design-tokens",
  "colors",
  "typography",
  "spacing",
  "responsive-system",
  "variables",
  "themes",
  "animations",
  "dark-mode"
] as const;

export const defaultTheme = {
  colorPrimary: "#276ef1",
  colorSurface: "#ffffff",
  colorText: "#101828",
  radiusMd: "12px",
  spaceMd: "16px"
};
`,
  "packages/state/src/index.ts": `
export interface Signal<T> {
  get(): T;
  set(nextValue: T): void;
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  return {
    get() {
      return value;
    },
    set(nextValue) {
      value = nextValue;
    }
  };
}
`,
  "packages/router/src/index.ts": `
export interface RouteRecord {
  path: string;
  page: string;
}

export function defineRoute(path: string, page: string): RouteRecord {
  return { path, page };
}
`,
  "packages/middleware/src/index.ts": `
export interface MiddlewareContext {
  requestId: string;
  path: string;
}

export type MiddlewareHandler = (context: MiddlewareContext, next: () => Promise<void>) => Promise<void>;

export function composeMiddleware(handlers: MiddlewareHandler[]): MiddlewareHandler {
  return async function run(context, next) {
    let index = -1;

    async function dispatch(position: number): Promise<void> {
      if (position <= index) {
        throw new Error("Middleware called next() multiple times.");
      }
      index = position;
      const handler = handlers[position];
      if (!handler) {
        await next();
        return;
      }
      await handler(context, () => dispatch(position + 1));
    }

    await dispatch(0);
  };
}
`,
  "packages/sdk/src/index.ts": `
export interface SdkCommandDescriptor {
  name: string;
  description: string;
}

export function defineSdkCommand(name: string, description: string): SdkCommandDescriptor {
  return { name, description };
}
`,
  "packages/cli/src/index.ts": `
#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { compileItFile } from "@itfw/compiler";
import {
  addDependency,
  readPackageIt,
  removeDependency,
  syncVendorDirectory
} from "@itfw/package-manager";
import { createApplication, registerModule, renderApplicationSummary } from "@itfw/runtime";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, subcommand, ...rest] = args;

  if (!command) {
    printHelp();
    return;
  }

  if (command === "create" && subcommand === "app") {
    const appName = rest[0];
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
  console.log(\`
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
\`);
}

async function createApp(name: string): Promise<void> {
  const target = resolve(process.cwd(), name);
  const template = resolve(process.cwd(), "templates", "app");

  if (!existsSync(template)) {
    throw new Error("Template directory not found. Run the command from the repository root.");
  }

  if (existsSync(target)) {
    throw new Error(\`Target directory already exists: \${target}\`);
  }

  cpSync(template, target, { recursive: true });
  await replaceInProject(target, "my-app", name);
  console.log(\`Application created in \${target}\`);
}

async function dev(entryFile = "examples/basic-app/app/pages/Home.it"): Promise<void> {
  const result = await compileItFile(resolve(process.cwd(), entryFile));
  if (!result.success) {
    console.error("Compilation failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(\`- [\${diagnostic.severity}] \${diagnostic.message} at \${diagnostic.location.line}:\${diagnostic.location.column}\`);
    }
    process.exitCode = 1;
    return;
  }

  const app = createApplication("it-dev-session");
  registerModule(app, { kind: "it-module", declarations: JSON.parse(result.code.match(/\\[(.|\\s)*\\]/)?.[0] ?? "[]") });
  console.log(renderApplicationSummary(app));
  console.log("\\nGenerated code:\\n");
  console.log(result.code);
}

async function build(entryFile = "examples/basic-app/app/pages/Home.it", outDir = ".it-build"): Promise<void> {
  const result = await compileItFile(resolve(process.cwd(), entryFile));
  if (!result.success) {
    console.error("Build failed:");
    for (const diagnostic of result.diagnostics) {
      console.error(\`- [\${diagnostic.severity}] \${diagnostic.message} at \${diagnostic.location.line}:\${diagnostic.location.column}\`);
    }
    process.exitCode = 1;
    return;
  }

  const outputDirectory = resolve(process.cwd(), outDir);
  mkdirSync(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, "module.js");
  writeFileSync(outputPath, result.code, "utf8");
  console.log(\`Build completed: \${outputPath}\`);
}

async function installDependency(name?: string, version?: string): Promise<void> {
  if (!name) {
    throw new Error("Usage: it install <package> [version]");
  }
  const manifestPath = resolve(process.cwd(), "package.it");
  const manifest = await addDependency(manifestPath, { name, version: version ?? "latest" });
  await syncVendorDirectory(process.cwd(), manifest);
  console.log(\`Installed \${name}@\${version ?? "latest"}\`);
}

async function removeDependencyCommand(name?: string): Promise<void> {
  if (!name) {
    throw new Error("Usage: it remove <package>");
  }
  const manifestPath = resolve(process.cwd(), "package.it");
  const manifest = await removeDependency(manifestPath, name);
  await syncVendorDirectory(process.cwd(), manifest);
  console.log(\`Removed \${name}\`);
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
    console.log(\`\${ok ? "OK" : "MISSING"}  \${label}\`);
  }

  if (existsSync(manifestPath)) {
    const manifest = await readPackageIt(manifestPath);
    console.log(\`Dependencies: \${manifest.dependencies.length}\`);
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
`,
  "packages/auth/src/index.ts": `
export const authFeatures = ["sessions", "tokens", "permissions", "policies"];
`,
  "packages/notifications/src/index.ts": `
export const notificationChannels = ["email", "websocket", "push", "realtime-events"];
`,
  "packages/websocket/src/index.ts": `
export const websocketFeatures = ["channels", "presence", "broadcasting"];
`,
  "packages/queue/src/index.ts": `
export const queueFeatures = ["jobs", "retries", "dead-letter", "workers"];
`,
  "packages/cache/src/index.ts": `
export const cacheFeatures = ["memory", "ttl", "tags", "stores"];
`,
  "packages/storage/src/index.ts": `
export const storageFeatures = ["local", "cloud", "signed-urls", "metadata"];
`,
  "packages/mail/src/index.ts": `
export const mailFeatures = ["smtp", "templates", "queues", "tracking"];
`,
  "packages/scheduler/src/index.ts": `
export const schedulerFeatures = ["cron", "intervals", "distributed-locks"];
`,
  "packages/logger/src/index.ts": `
export const loggerFeatures = ["structured-logs", "levels", "transports"];
`,
  "packages/telemetry/src/index.ts": `
export const telemetryFeatures = ["metrics", "traces", "health-checks"];
`
};

for (const [path, content] of Object.entries(files)) {
  write(path, content);
}

console.log("Core IT Framework source files written.");
