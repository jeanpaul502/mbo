import type { ITProgram } from "./ast.js";

function generateDeclarationRecord(program: ITProgram): string {
  return JSON.stringify(
    program.body.map((declaration) => ({
      kind: declaration.kind,
      name: declaration.name,
      properties: Object.fromEntries(declaration.properties.map((property) => [property.key, property.value]))
    })),
    null,
    2
  );
}

export function generateCode(program: ITProgram): string {
  const declarations = generateDeclarationRecord(program);
  return [
    "export const moduleKind = \"it-module\";",
    `export const declarations = ${declarations};`,
    "export function defineModule() {",
    "  return { kind: moduleKind, declarations };",
    "}",
    "export default defineModule();"
  ].join("\n");
}
