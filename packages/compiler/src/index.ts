import { readFile } from "node:fs/promises";
import type { ITProgram } from "./ast.js";
import type { Diagnostic } from "./diagnostics.js";
import { DiagnosticBag } from "./diagnostics.js";
import { generateCode } from "./generator.js";
import { lex } from "./lexer.js";
import { optimizeProgram } from "./optimizer.js";
import { Parser } from "./parser.js";
import { transformProgram } from "./transform.js";

export interface CompileResult {
  program: ITProgram;
  code: string;
  diagnostics: Diagnostic[];
  success: boolean;
}

export function compileItSource(source: string): CompileResult {
  const diagnostics = new DiagnosticBag();
  const { tokens } = lex(source, diagnostics);
  const parser = new Parser(tokens, diagnostics);
  const parsedProgram = parser.parseProgram();
  const transformedProgram = transformProgram(parsedProgram);
  const optimizedProgram = optimizeProgram(transformedProgram);
  const code = generateCode(optimizedProgram);

  return {
    program: optimizedProgram,
    code,
    diagnostics: diagnostics.toArray(),
    success: !diagnostics.hasErrors()
  };
}

export async function compileItFile(filePath: string): Promise<CompileResult> {
  const source = await readFile(filePath, "utf8");
  return compileItSource(source);
}

export * from "./ast.js";
export * from "./diagnostics.js";
