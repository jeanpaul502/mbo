import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function write(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content.trimStart(), "utf8");
}

const directories = [
  "packages/compiler/src",
  "packages/runtime/src",
  "packages/frontend/src",
  "packages/backend/src",
  "packages/database/src",
  "packages/auth/src",
  "packages/notifications/src",
  "packages/websocket/src",
  "packages/queue/src",
  "packages/cache/src",
  "packages/storage/src",
  "packages/mail/src",
  "packages/scheduler/src",
  "packages/logger/src",
  "packages/telemetry/src",
  "packages/plugins/src",
  "packages/package-manager/src",
  "packages/cli/src",
  "packages/ui/src",
  "packages/css-engine/src",
  "packages/state/src",
  "packages/router/src",
  "packages/middleware/src",
  "packages/sdk/src",
  "docs",
  "examples/basic-app/app/pages",
  "examples/basic-app/app/components",
  "templates/app/app/pages",
  "templates/app/app/layouts",
  "templates/app/app/components",
  "templates/app/app/api",
  "templates/app/app/services",
  "templates/app/app/models",
  "templates/app/app/jobs",
  "templates/app/app/events",
  "templates/app/app/listeners",
  "templates/app/app/middleware",
  "templates/app/config",
  "templates/app/database",
  "templates/app/public",
  "templates/app/storage",
  "templates/app/vendor",
  "templates/app/plugins",
  "templates/app/logs",
  "templates/app/tests",
  "tests",
  "benchmarks",
  "scripts",
  "tools",
  "website",
  ".github/workflows"
];

for (const directory of directories) {
  ensureDir(join(root, directory));
}

const files = {
  "package.json": `
{
  "name": "it-framework",
  "version": "0.1.0",
  "private": true,
  "description": "IT Framework monorepo - compiler, runtime, CLI and full-stack packages for the .it ecosystem.",
  "license": "MIT",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "dev": "npm run dev --workspace @itfw/cli --",
    "test": "npm run test --workspaces --if-present",
    "doctor": "npm run doctor --workspace @itfw/cli --"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0"
  }
}
`,
  "tsconfig.base.json": `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
`,
  "tsconfig.json": `
{
  "files": [],
  "references": []
}
`,
  ".gitignore": `
node_modules/
dist/
coverage/
.tmp/
*.log
vendor/
.env
`,
  "README.md": `
# IT Framework

IT Framework is a professional open source full-stack platform centered around the proprietary \`.it\` language. This repository bootstraps a monorepo architecture for the compiler, runtime, frontend, backend, package manager and CLI.

## Vision

- Create a modern full-stack ecosystem with its own language and syntax.
- Keep the architecture modular, documented and community friendly.
- Provide a coherent toolchain from authoring to runtime execution.

## Included In This Bootstrap

- workspace monorepo structure
- first compiler pipeline for \`.it\`
- runtime and platform package boundaries
- CLI with core commands
- template application and example files
- governance and roadmap documents

## Quick Start

\`\`\`bash
npm install
npm run build
npm run dev -- create app my-app
\`\`\`
`,
  "LICENSE": `
MIT License

Copyright (c) 2026 IT Framework contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
  "CONTRIBUTING.md": `
# Contributing

## Principles

- Keep packages modular and well documented.
- Add focused tests when parser, runtime or CLI behavior changes.
- Favor precise diagnostics over implicit behavior.

## Development

\`\`\`bash
npm install
npm run build
npm run test
\`\`\`
`,
  "SECURITY.md": `
# Security Policy

Please report vulnerabilities privately to the maintainers before opening a public issue.

Critical areas include plugin loading, package resolution, backend execution, storage and template handling.
`,
  "ROADMAP.md": `
# Roadmap

## Phase 1

- Monorepo bootstrap
- Minimal .it compiler pipeline
- Core CLI and app scaffolding
- Runtime package boundaries

## Phase 2

- Semantic analysis and type system
- Frontend renderer and hydration
- Backend HTTP and middleware pipeline
- Integrated ORM and migrations

## Phase 3

- Auth and permissions
- Realtime, queues and scheduler
- Plugin marketplace and sandbox
- Package publishing workflow
`,
  "CHANGELOG.md": `
# Changelog

## 0.1.0

- Bootstrapped the IT Framework monorepo
- Added the first .it compiler pipeline and CLI
- Added an application template and example
`,
  "docs/architecture.md": `
# Architecture Overview

IT Framework is organized into four layers:

1. Language layer: lexer, parser, AST, diagnostics, transforms and generators.
2. Runtime layer: execution contracts, rendering primitives and lifecycle.
3. Platform layer: frontend, backend, database, auth, storage, queue and telemetry.
4. Tooling layer: CLI, package manager, templates and SDK.

## Initial Technology Choices

- TypeScript for bootstrap implementation
- Node.js for compiler and CLI tooling
- Workspaces for package isolation
- Custom \`package.it\` manifests for application dependencies
`,
  "examples/basic-app/app/pages/Home.it": `
page Home {
  route: "/";
  title: "Welcome to IT Framework";
  layout: "Main";
}
`,
  "templates/app/package.it": `
name "my-app";
version "0.1.0";
dependency "@itfw/runtime" "0.1.0";
dependency "@itfw/frontend" "0.1.0";
dependency "@itfw/backend" "0.1.0";
`,
  "templates/app/it.config": `
appName = "my-app"
entry = "app/pages/Home.it"
port = 3000
`,
  "templates/app/.env": `
APP_NAME=my-app
APP_ENV=development
APP_PORT=3000
`,
  "templates/app/app/pages/Home.it": `
page Home {
  route: "/";
  title: "My IT App";
  layout: "Main";
}
`,
  "templates/app/app/layouts/Main.it": `
component Main {
  role: "layout";
}
`,
  "website/README.md": `
# Website

Reserved for the public documentation site and ecosystem portal.
`,
  ".github/workflows/ci.yml": `
name: ci

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
`
};

for (const [relativePath, content] of Object.entries(files)) {
  write(join(root, relativePath), content);
}

const packageDefinitions = [
  ["compiler", "Compiler pipeline for the .it language", []],
  ["runtime", "Runtime primitives and execution contracts", []],
  ["frontend", "Frontend renderer and UI application engine", ["@itfw/runtime"]],
  ["backend", "Backend server pipeline and middleware host", ["@itfw/runtime"]],
  ["database", "Database abstractions, models and query tools", ["@itfw/runtime"]],
  ["auth", "Authentication and authorization services", ["@itfw/backend"]],
  ["notifications", "Email, websocket and push notification system", ["@itfw/runtime"]],
  ["websocket", "Realtime transport contracts", ["@itfw/backend"]],
  ["queue", "Background job queue abstractions", ["@itfw/runtime"]],
  ["cache", "Cache layer contracts", ["@itfw/runtime"]],
  ["storage", "Storage providers and file abstraction", ["@itfw/runtime"]],
  ["mail", "Mail transport abstractions", ["@itfw/runtime"]],
  ["scheduler", "Scheduling contracts and cron orchestration", ["@itfw/runtime"]],
  ["logger", "Structured logging utilities", ["@itfw/runtime"]],
  ["telemetry", "Metrics and tracing primitives", ["@itfw/runtime"]],
  ["plugins", "Plugin registry and sandbox contracts", ["@itfw/runtime"]],
  ["package-manager", "package.it parsing and vendor dependency management", []],
  ["cli", "IT Framework command line interface", ["@itfw/compiler", "@itfw/package-manager", "@itfw/runtime"]],
  ["ui", "Built-in UI component catalog", ["@itfw/frontend"]],
  ["css-engine", "Design tokens and style generation engine", ["@itfw/runtime"]],
  ["state", "State primitives for frontend applications", ["@itfw/runtime"]],
  ["router", "Routing primitives for pages and APIs", ["@itfw/runtime"]],
  ["middleware", "Reusable middleware contracts", ["@itfw/runtime"]],
  ["sdk", "SDK helpers for tool and plugin authors", ["@itfw/runtime"]]
];

for (const [name, description, dependencies] of packageDefinitions) {
  const packagePath = join(root, "packages", name);
  const packageJson = {
    name: `@itfw/${name}`,
    version: "0.1.0",
    description,
    type: "module",
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    files: ["dist"],
    scripts: {
      build: "tsc -p tsconfig.json",
      test: "node --test"
    },
    dependencies: Object.fromEntries(dependencies.map((dependency) => [dependency, "0.1.0"])),
    devDependencies: {
      "@types/node": "^24.0.0",
      "typescript": "^5.8.0"
    }
  };

  if (name === "cli") {
    packageJson.bin = { it: "./dist/index.js" };
    packageJson.scripts.dev = "tsx src/index.ts";
    packageJson.scripts.doctor = "tsx src/index.ts doctor";
    packageJson.devDependencies.tsx = "^4.20.0";
  }

  write(join(packagePath, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  write(
    join(packagePath, "tsconfig.json"),
    `
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
`
  );

  const defaultSource = `
export const moduleInfo = {
  name: "@itfw/${name}",
  description: "${description}",
  version: "0.1.0"
};
`;

  if (!existsSync(join(packagePath, "src/index.ts"))) {
    write(join(packagePath, "src/index.ts"), defaultSource);
  }
}

console.log("IT Framework bootstrap files created.");
