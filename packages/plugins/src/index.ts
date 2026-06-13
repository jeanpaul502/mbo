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
