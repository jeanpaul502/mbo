import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCmSource } from "../compiler/cm-parser.mjs";

export async function loadProjectConfig(projectRoot) {
  const raw = await readFile(resolve(projectRoot, "cm.config.json"), "utf8");
  return JSON.parse(raw);
}

export async function renderProjectPage(projectRoot, entryFile) {
  const pageSource = await readFile(resolve(projectRoot, entryFile), "utf8");
  const page = parseCmSource(pageSource);
  const layoutName = page.properties.layout ?? "Main";
  const layoutSource = await readFile(resolve(projectRoot, "app", "layouts", `${layoutName}.cm`), "utf8");
  const layout = parseCmSource(layoutSource);

  const title = page.properties.title ?? page.name;
  const headline = page.properties.headline ?? title;
  const description = page.properties.description ?? "";
  const brand = layout.properties.brand ?? "CM Framework";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/assets/css/cm-framework.css" />
  </head>
  <body>
    <header class="cm-shell">
      <div class="cm-brand">${brand}</div>
      <nav class="cm-nav">
        <a href="/">Accueil</a>
        <a href="/api/status">Status</a>
      </nav>
    </header>
    <main class="cm-container">
      <section class="cm-hero">
        <p class="cm-badge">Extension .cm</p>
        <h1>${headline}</h1>
        <p>${description}</p>
      </section>
    </main>
  </body>
</html>`;
}
