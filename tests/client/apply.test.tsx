// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

interface FakeCtx {
  effect: (fn: () => unknown, label?: string) => unknown
  on: (event: string, fn: () => void) => void
  slots?: { render?: (name: string, comp: unknown) => () => void }
  remote: {
    settings: {
      describe: () => Promise<any>
      update: (ns: string, patch: Record<string, unknown>, rev?: number) => Promise<any>
    }
  }
}

function makeFakeCtx(disposers: Array<() => void>): FakeCtx {
  return {
    effect: (fn) => {
      const out = fn()
      if (typeof out === 'function') disposers.push(out as () => void)
      return out
    },
    on: () => { /* noop */ },
    slots: { render: () => () => { /* noop */ } },
    remote: {
      settings: {
        describe: vi.fn(async () => ({ ok: false })),
        update: vi.fn(async () => ({ ok: true })),
      },
    },
  }
}

describe('client apply 生命周期', () => {
  beforeEach(() => {
    ;(window as any).__dshIconRegistry = []
  })

  it('apply 后图标注册表包含 project-cockpit，dispose 后清空', async () => {
    const mod = await import('../../src/client/index')
    const disposers: Array<() => void> = []
    const ctx = makeFakeCtx(disposers)

    mod.apply(ctx as any)

    const reg = (window as any).__dshIconRegistry as any[]
    expect(reg.some((e) => e.id === 'project-cockpit')).toBe(true)

    for (const d of disposers) d()

    const after = (window as any).__dshIconRegistry as any[]
    expect(after.some((e) => e.id === 'project-cockpit')).toBe(false)
  })

  it('apply 后 document.body 中存在浮动容器，dispose 后移除', async () => {
    const mod = await import('../../src/client/index')
    const disposers: Array<() => void> = []
    const ctx = makeFakeCtx(disposers)

    const before = document.body.children.length
    mod.apply(ctx as any)
    expect(document.body.children.length).toBeGreaterThan(before)

    for (const d of disposers) d()
    expect(document.body.children.length).toBe(before)
  })

  it('重复 apply 不会产生重复图标', async () => {
    const mod = await import('../../src/client/index')
    const disposersA: Array<() => void> = []
    const disposersB: Array<() => void> = []
    mod.apply(makeFakeCtx(disposersA) as any)
    mod.apply(makeFakeCtx(disposersB) as any)

    const reg = (window as any).__dshIconRegistry as any[]
    const count = reg.filter((e) => e.id === 'project-cockpit').length
    expect(count).toBe(1)

    for (const d of disposersA) d()
    for (const d of disposersB) d()
  })
})