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
  return `${application.name}: ${moduleCount} module(s), ${declarationCount} declaration(s)`;
}

export const runtimeCapabilities = {
  frontend: ["renderer", "hydration", "routing", "state"],
  backend: ["http", "middleware", "events", "cache"],
  platform: ["plugins", "notifications", "telemetry"]
};
