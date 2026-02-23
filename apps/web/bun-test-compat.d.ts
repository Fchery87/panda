declare module 'bun:test' {
  export const beforeAll: (fn: () => void | Promise<void>) => void
  export const mock: {
    module(specifier: string, factory: () => unknown): void
  }
}

interface ImportMeta {
  readonly dir: string
}
