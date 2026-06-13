export interface RouteRecord {
  path: string;
  page: string;
}

export function defineRoute(path: string, page: string): RouteRecord {
  return { path, page };
}
