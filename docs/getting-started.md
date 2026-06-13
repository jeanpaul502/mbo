# Getting Started

## Goal

This guide helps a new user install the current IT Framework source tree and create a first application.

## Prerequisites

- Node.js `>= 20`
- npm `>= 10`
- Git

## 1. Clone The Repository

```bash
git clone https://github.com/jeanpaul502/mbo.git
cd mbo
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Build The Workspace

```bash
npm run build
```

This compiles the packages in the monorepo and prepares the local CLI flow.

## 4. Create A New App

```bash
node scripts/it.mjs create app my-app
cd my-app
```

The generated application includes:

- `app/pages`
- `app/layouts`
- `app/components`
- `app/api`
- `app/services`
- `app/models`
- `app/jobs`
- `app/events`
- `app/listeners`
- `app/middleware`
- `config`
- `database`
- `public`
- `storage`
- `vendor`
- `plugins`
- `logs`
- `tests`
- `package.it`
- `it.config`
- `.env`

## 5. Understand The Current Workflow

At this stage of the project:

- `node scripts/it.mjs install` synchronizes the dependencies declared in `package.it` into `vendor/`
- `node scripts/it.mjs dev` starts a local development server using the entry from `it.config`
- `node scripts/it.mjs build` writes the generated JavaScript output into `.it-build/`
- `node scripts/it.mjs doctor` checks a project's basic structure and installed vendor state

Example:

```bash
cd my-app
node ../mbo/scripts/it.mjs install
node ../mbo/scripts/it.mjs dev
node ../mbo/scripts/it.mjs build
```

## 6. Manage Dependencies

The framework uses `package.it` as its application manifest.

Examples:

```bash
node ../mbo/scripts/it.mjs install
node scripts/it.mjs install @itfw/runtime 0.1.0
node scripts/it.mjs update @itfw/runtime 0.1.0
node scripts/it.mjs remove @itfw/runtime
```

Installed dependency metadata is synchronized into `vendor/installed.json`, and each installed package gets a metadata file under `vendor/<package>/package.json`.

## Current Limitation

The future target user experience is:

```bash
npm install -g @itfw/cli
it create app my-app
cd my-app
it dev
```

The repository is not yet at that packaging stage. For now, the supported path is running the framework from the source monorepo.
