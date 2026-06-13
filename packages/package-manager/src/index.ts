import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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

export interface VendorPackageRecord {
  name: string;
  version: string;
  installedAt: string;
  source: "local-workspace" | "manifest-only";
  sourcePath?: string;
}

export interface SyncVendorOptions {
  registryRoot?: string;
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

function toVendorSegments(packageName: string): string[] {
  return packageName.split("/").filter(Boolean);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readLocalWorkspaceMetadata(
  dependency: PackageDependency,
  registryRoot?: string
): Promise<{ source: VendorPackageRecord["source"]; sourcePath?: string }> {
  if (!registryRoot || !dependency.name.startsWith("@itfw/")) {
    return { source: "manifest-only" };
  }

  const packageName = dependency.name.slice("@itfw/".length);
  const packagePath = join(registryRoot, "packages", packageName);
  if (await pathExists(packagePath)) {
    return {
      source: "local-workspace",
      sourcePath: packagePath
    };
  }

  return { source: "manifest-only" };
}

export async function syncVendorDirectory(
  projectRoot: string,
  manifest: PackageItManifest,
  options: SyncVendorOptions = {}
): Promise<void> {
  const vendorPath = join(projectRoot, "vendor", "installed.json");
  await mkdir(dirname(vendorPath), { recursive: true });

  const installed: VendorPackageRecord[] = [];
  for (const dependency of manifest.dependencies) {
    const metadata = await readLocalWorkspaceMetadata(dependency, options.registryRoot);
    const vendorPackagePath = join(projectRoot, "vendor", ...toVendorSegments(dependency.name));
    await mkdir(vendorPackagePath, { recursive: true });

    const record: VendorPackageRecord = {
      name: dependency.name,
      version: dependency.version,
      installedAt: new Date().toISOString(),
      source: metadata.source,
      sourcePath: metadata.sourcePath
    };
    installed.push(record);

    await writeFile(
      join(vendorPackagePath, "package.json"),
      JSON.stringify(
        {
          name: dependency.name,
          version: dependency.version,
          installedAt: record.installedAt,
          source: metadata.source,
          sourcePath: metadata.sourcePath ?? null
        },
        null,
        2
      ),
      "utf8"
    );
  }

  await writeFile(
    vendorPath,
    JSON.stringify(
      {
        project: manifest.name,
        version: manifest.version,
        installed
      },
      null,
      2
    ),
    "utf8"
  );
}
