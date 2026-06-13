export const supportedDatabases = ["postgresql", "mysql", "sqlite", "mongodb"] as const;

export const ormFeatures = [
  "models",
  "query-builder",
  "migrations",
  "seeders",
  "factories"
] as const;

export interface DatabaseModelDefinition {
  name: string;
  fields: Record<string, string>;
}

export function defineModel(name: string, fields: Record<string, string>): DatabaseModelDefinition {
  return { name, fields };
}
