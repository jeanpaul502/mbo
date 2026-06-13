import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { loadProjectConfig, renderProjectPage } from "./render-page.mjs";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml"
};

export async function runDoctor(projectRoot) {
  const checks = [
    ["cm.config.json", existsSync(resolve(projectRoot, "cm.config.json"))],
    ["app/pages/", existsSync(resolve(projectRoot, "app", "pages"))],
    ["app/layouts/", existsSync(resolve(projectRoot, "app", "layouts"))],
    ["config/", existsSync(resolve(projectRoot, "config"))],
    ["public/", existsSync(resolve(projectRoot, "public"))],
    ["storage/", existsSync(resolve(projectRoot, "storage"))],
    ["vendor/", existsSync(resolve(projectRoot, "vendor"))],
    ["plugins/", existsSync(resolve(projectRoot, "plugins"))],
    ["logs/", existsSync(resolve(projectRoot, "logs"))]
  ];

  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "MISSING"}  ${label}`);
  }
}

export async function installProject(projectRoot) {
  const vendorRoot = resolve(projectRoot, "vendor");
  await mkdir(vendorRoot, { recursive: true });
  const installedPath = resolve(vendorRoot, "installed.json");
  const payload = {
    framework: "CM Framework",
    stack: ["Node.js", "JavaScript", "TypeScript", "Python", "HTML", "CSS"],
    installedAt: new Date().toISOString(),
    packages: [
      { name: "cm-core", version: "0.1.0" },
      { name: "cm-http", version: "0.1.0" },
      { name: "cm-view", version: "0.1.0" },
      { name: "cm-python-bridge", version: "0.1.0" }
    ]
  };
  await writeFile(installedPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Vendor metadata written to ${installedPath}`);
}

export async function buildProject(projectRoot) {
  const config = await loadProjectConfig(projectRoot);
  const html = await renderProjectPage(projectRoot, config.entry);
  const buildDir = resolve(projectRoot, config.buildDir ?? "storage/build");
  await mkdir(buildDir, { recursive: true });
  await writeFile(resolve(buildDir, "index.html"), html, "utf8");
  await writeFile(resolve(buildDir, "module.json"), JSON.stringify({ entry: config.entry, builtAt: new Date().toISOString() }, null, 2), "utf8");
  console.log(`Build completed in ${buildDir}`);
}

export async function serveProject(projectRoot) {
  const config = await loadProjectConfig(projectRoot);
  const port = Number(config.port ?? 3100);

  const server = createServer(async (request, response) => {
    const url = request.url ?? "/";
    if (url === "/" || url === "/index.html" || url === "/api/status") {
      const html = await renderProjectPage(projectRoot, config.entry);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }

    if (url === "/__cm/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, app: config.appName, entry: config.entry }, null, 2));
      return;
    }

    const filePath = resolve(projectRoot, "public", url.slice(1));
    try {
      const content = await readFile(filePath);
      response.writeHead(200, { "content-type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
      response.end(content);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  server.listen(port, () => {
    console.log(`CM dev server running at http://localhost:${port}/`);
  });

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
}
