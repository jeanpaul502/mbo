export type ITDeclarationKind =
  | "page"
  | "component"
  | "route"
  | "api"
  | "model"
  | "service"
  | "event"
  | "notification"
  | "style"
  | "permission"
  | "middleware";

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

export interface Token {
  type: string;
  value: string;
  span: SourceSpan;
}

export interface ITProperty {
  key: string;
  value: string;
  span: SourceSpan;
}

export interface ITDeclaration {
  kind: ITDeclarationKind;
  name: string;
  properties: ITProperty[];
  span: SourceSpan;
}

export interface ITProgram {
  type: "Program";
  body: ITDeclaration[];
}
