export interface Signal<T> {
  get(): T;
  set(nextValue: T): void;
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  return {
    get() {
      return value;
    },
    set(nextValue) {
      value = nextValue;
    }
  };
}
