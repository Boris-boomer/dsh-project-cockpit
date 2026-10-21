/**
 * Cockpit 单一状态源 —— 跨 tab 共享。
 *
 * 设计要点：
 *   - 基于 useSyncExternalStore 的极简快照 store，零外部依赖；
 *   - 更新用 rAF 批发布，避免一次表单输入触发多次重渲染；
 *   - updateSlice 只替换目标 slice，未变的 slice 保持引用，
 *     useCockpit(store, s => s.opportunity) 的组件不会因为别的 slice 变化而重渲染。
 */

import { useSyncExternalStore } from 'react'

export type OpportunityType = 'bounty' | 'competition' | 'grant' | 'rfp'

export interface Opportunity {
  name: string
  type: OpportunityType
  deadline: string
  source_url: string
  requirements: Array<{ category: string; text: string }>
}

export interface Capability {
  name: string
  description: string
  real: boolean
}

export interface Project {
  id: string
  name: string
  path: string
  stack: string[]
  tags: string[]
  summary: string
}

export interface Relation {
  id: string
  source: string
  target: string
  type: 'combine' | 'overlap'
  confidence: number
  reason: string
}

export interface CostParams {
  modelKey: string
  scene: string
  careerKey: string
  hardwareCost: string
  roi: string
  lifespanYears: string
}

export interface SignalInput {
  sourceVerifiability: 'high' | 'medium' | 'low'
  paymentSignalPresent: boolean
  anomaly: boolean
  series: string
}

export interface CockpitState {
  opportunity: Opportunity
  capabilities: Capability[]
  projects: Project[]
  relations: Relation[]
  rootPath: string
  costParams: CostParams
  signalInput: SignalInput
}

const DEFAULT_STATE: CockpitState = {
  opportunity: {
    name: '示例机会',
    type: 'bounty',
    deadline: '',
    source_url: '',
    requirements: [{ category: 'ability', text: '需要 MCP 适配能力' }],
  },
  capabilities: [
    { name: 'MCP 适配器', description: '能把工具包装为 MCP 服务', real: true },
  ],
  projects: [
    { id: 'p1', name: 'ai-workflow', path: '', stack: ['node'], tags: [], summary: '' },
    { id: 'p2', name: 'hermes-mcp', path: '', stack: ['rust'], tags: [], summary: '' },
  ],
  relations: [
    { id: 'r1', source: 'p1', target: 'p2', type: 'combine', confidence: 0.8, reason: '共享能力' },
  ],
  rootPath: '',
  costParams: {
    modelKey: '2',
    scene: 'codegen',
    careerKey: '2',
    hardwareCost: '2000',
    roi: '1',
    lifespanYears: '3',
  },
  signalInput: {
    sourceVerifiability: 'medium',
    paymentSignalPresent: true,
    anomaly: false,
    series: '10,12,60,120',
  },
}

type Listener = () => void

export class CockpitStore {
  private state: CockpitState = DEFAULT_STATE
  private listeners = new Set<Listener>()
  private rafPending = false

  getState = (): CockpitState => this.state

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  setState = (updater: (prev: CockpitState) => CockpitState): void => {
    const next = updater(this.state)
    if (next === this.state) return
    this.state = next
    this.scheduleFlush()
  }

  updateSlice = <K extends keyof CockpitState>(key: K, patch: Partial<CockpitState[K]>): void => {
    this.setState((s) => {
      const current = s[key]
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return { ...s, [key]: { ...(current as any), ...(patch as any) } }
      }
      return s
    })
  }

  private scheduleFlush(): void {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      this.flush()
      return
    }
    if (this.rafPending) return
    this.rafPending = true
    requestAnimationFrame(() => {
      this.rafPending = false
      this.flush()
    })
  }

  private flush(): void {
    for (const fn of this.listeners) {
      try { fn() } catch (e) { console.warn('[cockpit-store] listener failed', e) }
    }
  }
}

export function createCockpitStore(initial?: Partial<CockpitState>): CockpitStore {
  const store = new CockpitStore()
  if (initial) {
    store.setState((s) => ({ ...s, ...initial }))
  }
  return store
}

/**
 * selector 必须返回稳定引用或 primitive。
 * slice 未变时（浅展开保留引用）不会触发重渲染。
 */
export function useCockpit<T>(store: CockpitStore, selector: (s: CockpitState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  )
}