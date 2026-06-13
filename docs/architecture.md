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
- Custom `package.it` manifests for application dependencies
