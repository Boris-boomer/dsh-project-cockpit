/**
 * Client 侧最小的 ctx 契约。
 * 只声明本插件用到的字段，避免依赖完整 cordis 类型。
 */

export type Disposer = () => void

export interface ClientCtx {
  effect<T = unknown>(fn: () => T | Disposer, label?: string): T | Disposer
  on(event: string, fn: Disposer): void
  slots?: {
    render?: (name: string, component: unknown) => Disposer | void
  }
  remote: {
    settings: {
      describe: () => Promise<any>
      update: (ns: string, patch: Record<string, unknown>, revision?: number) => Promise<any>
    }
  }
}