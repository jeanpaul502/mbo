import type { SourceLocation } from "./ast.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  location: SourceLocation;
}

export class DiagnosticBag {
  private readonly entries: Diagnostic[] = [];

  add(severity: DiagnosticSeverity, message: string, location: SourceLocation): void {
    this.entries.push({ severity, message, location });
  }

  error(message: string, location: SourceLocation): void {
    this.add("error", message, location);
  }

  warning(message: string, location: SourceLocation): void {
    this.add("warning", message, location);
  }

  toArray(): Diagnostic[] {
    return [...this.entries];
  }

  hasErrors(): boolean {
    return this.entries.some((entry) => entry.severity === "error");
  }
}
