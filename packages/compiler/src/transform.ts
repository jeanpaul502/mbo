import type { ITDeclaration, ITProgram } from "./ast.js";

function normalizeDeclaration(declaration: ITDeclaration): ITDeclaration {
  return {
    ...declaration,
    properties: declaration.properties.map((property) => ({
      ...property,
      key: property.key.trim(),
      value: property.value.trim()
    }))
  };
}

export function transformProgram(program: ITProgram): ITProgram {
  return {
    type: "Program",
    body: program.body.map(normalizeDeclaration)
  };
}
