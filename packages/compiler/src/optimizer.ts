import type { ITProgram } from "./ast.js";

export function optimizeProgram(program: ITProgram): ITProgram {
  return {
    type: "Program",
    body: program.body.map((declaration) => {
      const dedupedProperties = new Map<string, string>();
      for (const property of declaration.properties) {
        dedupedProperties.set(property.key, property.value);
      }

      return {
        ...declaration,
        properties: declaration.properties.filter(
          (property, index, all) =>
            index === all.findIndex((candidate) => candidate.key === property.key && dedupedProperties.get(property.key) === property.value)
        )
      };
    })
  };
}
