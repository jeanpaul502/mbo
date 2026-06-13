# IT Framework

IT Framework is an open source full-stack platform built around the proprietary `.it` language. The goal is to provide a coherent ecosystem with its own compiler, runtime, frontend engine, backend services, package manager and developer CLI.

## Status

This repository currently provides a solid bootstrap for the ecosystem:

- a professional monorepo layout
- a first `.it` compiler pipeline
- a runtime foundation
- a CLI with project scaffolding and build commands
- an application template
- initial governance and architecture documents

This is an early foundation, not yet a production-ready framework.

## Vision

- Create a modern full-stack ecosystem with its own language and syntax.
- Keep the architecture modular, documented and community friendly.
- Provide a coherent toolchain from authoring to runtime execution.
- Offer a long-term open source platform that can grow into a complete web framework.

## Monorepo Overview

```text
packages/
  compiler/
  runtime/
  frontend/
  backend/
  database/
  auth/
  notifications/
  websocket/
  queue/
  cache/
  storage/
  mail/
  scheduler/
  logger/
  telemetry/
  plugins/
  package-manager/
  cli/
  ui/
  css-engine/
  state/
  router/
  middleware/
  sdk/
```

## Requirements

- Node.js `>= 20`
- npm `>= 10`
- Git

## Getting Started

Today, the recommended way to try IT Framework is from the repository source:

```bash
git clone https://github.com/jeanpaul502/mbo.git
cd mbo
npm install
npm run build
```

Create a new application:

```bash
node scripts/it.mjs create app my-app
cd my-app
```

Compile the example page from the monorepo root:

```bash
node scripts/it.mjs dev examples/basic-app/app/pages/Home.it
node scripts/it.mjs build examples/basic-app/app/pages/Home.it .it-build
```

See the full onboarding guide in [getting-started.md](file:///c:/Users/batam/Desktop/mbo/docs/getting-started.md).

## CLI Commands

```bash
it create app <name>
it dev [entry-file]
it build [entry-file] [out-dir]
it test
it deploy
it install <package> [version]
it remove <package>
it update <package> [version]
it doctor
```

At the moment, the local launcher is:

```bash
node scripts/it.mjs <command>
```

## Example `.it` File

```it
page Home {
  route: "/";
  title: "Welcome to IT Framework";
  layout: "Main";
}
```

## Available Scripts

```bash
npm run build
npm run typecheck
npm run test
npm run doctor
npm run smoke
```

## Roadmap

- Enrich the `.it` language grammar and semantic analysis.
- Add a real development server for `it dev`.
- Build the frontend renderer and hydration pipeline.
- Build the backend HTTP engine and integrated middleware system.
- Add ORM, migrations, plugins and package publishing flows.

See [ROADMAP.md](file:///c:/Users/batam/Desktop/mbo/ROADMAP.md) and [architecture.md](file:///c:/Users/batam/Desktop/mbo/docs/architecture.md) for more detail.

## Contributing

Contributions are welcome. Start with:

- [CONTRIBUTING.md](file:///c:/Users/batam/Desktop/mbo/CONTRIBUTING.md)
- [SECURITY.md](file:///c:/Users/batam/Desktop/mbo/SECURITY.md)

## License

Released under the [MIT License](file:///c:/Users/batam/Desktop/mbo/LICENSE).
