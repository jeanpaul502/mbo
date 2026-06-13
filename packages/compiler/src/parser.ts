import type { ITDeclaration, ITDeclarationKind, ITProgram, ITProperty, Token } from "./ast.js";
import { DiagnosticBag } from "./diagnostics.js";

const DECLARATION_KINDS = new Set<ITDeclarationKind>([
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

export class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly diagnostics: DiagnosticBag
  ) {}

  parseProgram(): ITProgram {
    const body: ITDeclaration[] = [];

    while (!this.is("eof")) {
      const declaration = this.parseDeclaration();
      if (declaration) {
        body.push(declaration);
      } else {
        this.index += 1;
      }
    }

    return { type: "Program", body };
  }

  private parseDeclaration(): ITDeclaration | null {
    const kindToken = this.current();
    if (kindToken.type !== "keyword" || !DECLARATION_KINDS.has(kindToken.value as ITDeclarationKind)) {
      this.diagnostics.error("Expected a declaration keyword.", kindToken.span.start);
      return null;
    }

    this.index += 1;
    const nameToken = this.expect("identifier", "Expected a declaration name.");
    const openBrace = this.expect("{", "Expected '{' after declaration name.");

    const properties: ITProperty[] = [];
    while (!this.is("}") && !this.is("eof")) {
      const property = this.parseProperty();
      if (property) {
        properties.push(property);
      } else {
        this.index += 1;
      }
    }

    const closeBrace = this.expect("}", "Expected '}' to close declaration.");

    return {
      kind: kindToken.value as ITDeclarationKind,
      name: nameToken.value,
      properties,
      span: {
        start: kindToken.span.start,
        end: closeBrace.span.end
      }
    };
  }

  private parseProperty(): ITProperty | null {
    const key = this.expectOneOf(["identifier", "keyword"], "Expected a property name.");
    this.expect(":", "Expected ':' after property name.");

    const valueToken = this.current();
    if (valueToken.type !== "string" && valueToken.type !== "identifier" && valueToken.type !== "keyword") {
      this.diagnostics.error("Expected a string or identifier property value.", valueToken.span.start);
      return null;
    }
    this.index += 1;
    const end = this.expect(";", "Expected ';' after property value.");

    return {
      key: key.value,
      value: valueToken.value,
      span: {
        start: key.span.start,
        end: end.span.end
      }
    };
  }

  private expect(type: string, message: string): Token {
    const token = this.current();
    if (token.type !== type) {
      this.diagnostics.error(message, token.span.start);
      return token;
    }
    this.index += 1;
    return token;
  }

  private expectOneOf(types: string[], message: string): Token {
    const token = this.current();
    if (!types.includes(token.type)) {
      this.diagnostics.error(message, token.span.start);
      return token;
    }
    this.index += 1;
    return token;
  }

  private current(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  private is(type: string): boolean {
    return this.current().type === type;
  }
}
