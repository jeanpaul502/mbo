export interface MiddlewareContext {
  requestId: string;
  path: string;
}

export type MiddlewareHandler = (context: MiddlewareContext, next: () => Promise<void>) => Promise<void>;

export function composeMiddleware(handlers: MiddlewareHandler[]): MiddlewareHandler {
  return async function run(context, next) {
    let index = -1;

    async function dispatch(position: number): Promise<void> {
      if (position <= index) {
        throw new Error("Middleware called next() multiple times.");
      }
      index = position;
      const handler = handlers[position];
      if (!handler) {
        await next();
        return;
      }
      await handler(context, () => dispatch(position + 1));
    }

    await dispatch(0);
  };
}
