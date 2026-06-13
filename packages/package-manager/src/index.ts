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
    .split(/\r?\n/)
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
    const nameMatch = line.match(/^name\s+"([^"]+)";$/);
    if (nameMatch) {
      const name = nameMatch[1];
      if (name) {
        manifest.name = name;
      }
      continue;
    }

    const versionMatch = line.match(/^version\s+"([^"]+)";$/);
    if (versionMatch) {
      const version = versionMatch[1];
      if (version) {
        manifest.version = version;
      }
      continue;
    }

    const dependencyMatch = line.match(/^dependency\s+"([^"]+)"\s+"([^"]+)";$/);
    if (dependencyMatch) {
      const name = dependencyMatch[1];
      const version = dependencyMatch[2];
      if (name && version) {
        manifest.dependencies.push({
          name,
          version
        });
      }
    }
  }

  return manifest;
}

export function stringifyPackageIt(manifest: PackageItManifest): string {
  const lines = [
    `name "${manifest.name}";`,
    `version "${manifest.version}";`,
    ...manifest.dependencies.map((dependency) => `dependency "${dependency.name}" "${dependency.version}";`)
  ];

  return `${lines.join("\n")}\n`;
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
