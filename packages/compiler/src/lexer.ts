import type { SourceLocation, SourceSpan, Token } from "./ast.js";
import { DiagnosticBag } from "./diagnostics.js";

const KEYWORDS = new Set([
  "page",
  "component",
  "route",
  "api",
  "model",
  "service",
  "event",
  "notification",
  "style",
  "permission",
  "middleware"
]);

function cloneLocation(location: SourceLocation): SourceLocation {
  return { ...location };
}

function createSpan(start: SourceLocation, end: SourceLocation): SourceSpan {
  return { start: cloneLocation(start), end: cloneLocation(end) };
}

export function lex(source: string, diagnostics = new DiagnosticBag()): { tokens: Token[]; diagnostics: DiagnosticBag } {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  function location(): SourceLocation {
    return { line, column, offset: index };
  }

  function advance(): string {
    const character = source[index] ?? "";
    index += 1;
    if (character === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  }

  while (index < source.length) {
    const current = source[index] ?? "";

    if (/\s/.test(current)) {
      advance();
      continue;
    }

    if (current === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        advance();
      }
      continue;
    }

    const start = location();

    if (/[A-Za-z_]/.test(current)) {
      let value = "";
      while (index < source.length && /[A-Za-z0-9_-]/.test(source[index] ?? "")) {
        value += advance();
      }
      tokens.push({
        type: KEYWORDS.has(value) ? "keyword" : "identifier",
        value,
        span: createSpan(start, location())
      });
      continue;
    }

    if (current === "\"") {
      advance();
      let value = "";
      while (index < source.length && source[index] !== "\"") {
        value += advance();
      }
      if (source[index] !== "\"") {
        diagnostics.error("Unterminated string literal.", start);
      } else {
        advance();
      }
      tokens.push({
        type: "string",
        value,
        span: createSpan(start, location())
      });
      continue;
    }

    if ("{}:;".includes(current)) {
      advance();
      tokens.push({
        type: current,
        value: current,
        span: createSpan(start, location())
      });
      continue;
    }

    diagnostics.error(`Unexpected character "${current}".`, start);
    advance();
  }

  const end = location();
  tokens.push({
    type: "eof",
    value: "",
    span: createSpan(end, end)
  });

  return { tokens, diagnostics };
}
