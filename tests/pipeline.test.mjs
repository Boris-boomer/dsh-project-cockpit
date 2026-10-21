// tests/pipeline.test.mjs —— 编排层判据测试（验证"四引擎真的合在一起"）
//
// 这些判据不看"四个包能不能 import"，而是看：
//   1) 四引擎是否在同一次调用里被穿起来（stages 顺序）
//   2) 引擎 A 的产出是否真的流入引擎 B（跨引擎数据流）
//   3) 跨引擎合成规则是否生效（信号低 → 降级；回本∞ → api-first）
//   4) kill 是否真的提前终止（不跑后面的昂贵阶段）
//
// 注意：runPipeline 内部的 analyze 会读包内 data/models.json 与 data/careers.json，
// 所以本文件依赖这两个数据文件存在（至少含 modelKey '2'、careerKey '2'/'3'）。

import { describe, it, expect } from 'vitest'
import {
  runPipeline,
  deriveCostOptions,
  buildDecisionCard,
  inferPaymentSignal,
  inferSourceVerifiability,
  PIPELINE_STAGES,
} from '../src/pipeline.mjs'

const RICH_OPP = {
  name: 'MCP 适配器赏金赛',
  type: 'bounty',
  deadline: '',
  source_url: 'https://example.com/bounty',
  requirements: [{ category: 'ability', text: '需要 MCP 适配能力' }],
}
const RICH_CAPS = [
  { name: 'MCP 适配器', description: '能把工具包装为 MCP 服务', real: true },
]
const PROJECT = { id: 'p1', name: 'ai-workflow' }

describe('判据 1 · 四阶段串联', () => {
  it('runPipeline 一次调用串起 match/signal/cost/graph', () => {
    const r = runPipeline({ opportunity: RICH_OPP, project: PROJECT, capabilities: RICH_CAPS })
    const names = r.stages.map((s) => s.stage)
    expect(names).toEqual(['match', 'signal', 'cost', 'graph'])
    expect(r.stages.every((s) => s.ok)).toBe(true)
  })
})

describe('判据 2 · 跨引擎数据流', () => {
  it('match 的 gaps/matchScore 被用于决定 cost 入参', () => {
    const noGap = deriveCostOptions({ matchScore: 0.8, gaps: [] }, RICH_OPP)
    const manyGap = deriveCostOptions({ matchScore: 0.8, gaps: ['g1', 'g2', 'g3'] }, RICH_OPP)
    expect(noGap.scene).toBe('codegen')
    expect(manyGap.scene).toBe('rag')

    const high = deriveCostOptions({ matchScore: 0.8, gaps: [] }, RICH_OPP)
    const low = deriveCostOptions({ matchScore: 0.4, gaps: [] }, RICH_OPP)
    expect(high.careerKey).toBe('3')
    expect(low.careerKey).toBe('2')
  })
})

describe('判据 3 · decisionCard 汇总四路结果', () => {
  it('同时含 match/signal/cost 三路字段', () => {
    const r = runPipeline({ opportunity: RICH_OPP, project: PROJECT, capabilities: RICH_CAPS })
    const c = r.decisionCard
    expect(c).toBeTruthy()
    expect(typeof c.matchScore).toBe('number')
    expect(['high', 'medium', 'low']).toContain(c.confidence)
    expect(c.cost).toBeTruthy()
    expect(typeof c.cost.daysToBreakEven).not.toBe('undefined')
    expect(Array.isArray(c.gaps)).toBe(true)
  })
})

describe('判据 4 · 图谱联动', () => {
  it('图谱含决策卡节点，且与目标项目之间存在关系边', () => {
    const r = runPipeline({ opportunity: RICH_OPP, project: PROJECT, capabilities: RICH_CAPS })
    const ids = r.graph.nodes.map((n) => n.id)
    const decisionId = 'decision-MCP 适配器赏金赛'
    expect(ids).toContain(decisionId)

    const rel = r.graph.projectRelations.find((e) => e.source === decisionId && e.target === 'p1')
    expect(rel).toBeTruthy()
    expect(rel.confidence).toBeGreaterThan(0.7)

    const node = r.graph.nodes.find((n) => n.id === decisionId)
    expect(node.metadata.confidence).toBe(r.signal.suggestedConfidence)
  })
})

describe('判据 5 · 信号低 → 降级一档', () => {
  it('proceed 遇 low 信号降为 iterate', () => {
    const card = buildDecisionCard({
      opportunity: { name: 'x' },
      project: PROJECT,
      match: { verdict: 'proceed', matchScore: 0.8, gaps: [], recommendedWeapon: 'w', firstStep: 's' },
      signal: { suggestedConfidence: 'low', raw: 0.2 },
      cost: { daysToBreakEven: 10, monthlySaving: 100, recommendation: { text: 't' }, model: { name: 'm' } },
      costOpts: { scene: 'codegen' },
    })
    expect(card.verdict).toBe('iterate')
    expect(card.notes.some((n) => n.includes('降级'))).toBe(true)
  })
})

describe('判据 6 · 回本 ∞ → api-first', () => {
  it('建议口径为「优先 API 验证」', () => {
    const card = buildDecisionCard({
      opportunity: { name: 'x' },
      project: PROJECT,
      match: { verdict: 'proceed', matchScore: 0.8, gaps: [], recommendedWeapon: 'w', firstStep: 's' },
      signal: { suggestedConfidence: 'high', raw: 0.9 },
      cost: { daysToBreakEven: Infinity, monthlySaving: 0, recommendation: { text: 't' }, model: { name: 'm' } },
      costOpts: { scene: 'chat' },
    })
    expect(card.advice).toContain('API')
  })
})

describe('判据 7 · kill 提前终止', () => {
  it('capability 不足时终止在 match，不执行 cost/graph', () => {
    const r = runPipeline({
      opportunity: { name: '需要量子计算', type: 'rfp', requirements: [{ category: 'ability', text: '量子纠错硬件' }] },
      project: PROJECT,
      capabilities: [{ name: 'MCP 适配器', description: '包装工具', real: true }],
    })
    expect(r.match.verdict).toBe('kill')
    expect(r.terminatedAt).toBe('match')
    expect(r.cost).toBeNull()
    expect(r.graph).toBeNull()
    expect(r.stages.map((s) => s.stage)).toEqual(['match'])
  })
})

describe('判据 8 · 推断函数默认口径', () => {
  it('inferSourceVerifiability 覆盖各类型', () => {
    expect(inferSourceVerifiability({ type: 'rfp' })).toBe('high')
    expect(inferSourceVerifiability({ type: 'bounty' })).toBe('medium')
    expect(inferSourceVerifiability({})).toBe('low')
    expect(inferSourceVerifiability({ source_url: 'u' })).toBe('medium')
  })
  it('inferPaymentSignal 覆盖各类型', () => {
    expect(inferPaymentSignal({ type: 'bounty' })).toBe(true)
    expect(inferPaymentSignal({ type: 'competition' })).toBe(false)
    expect(inferPaymentSignal({ paymentSignalPresent: true })).toBe(true)
  })
})

describe('判据 9 · 阶段常量与实现一致', () => {
  it('PIPELINE_STAGES 与 runPipeline 实际执行顺序一致', () => {
    const r = runPipeline({ opportunity: RICH_OPP, project: PROJECT, capabilities: RICH_CAPS })
    expect(r.stages.map((s) => s.stage)).toEqual([...PIPELINE_STAGES])
  })
})

describe('判据 10 · 空输入安全', () => {
  it('空输入不抛错，走 kill 分支', () => {
    const r = runPipeline({})
    expect(r.ok).toBe(true)
    expect(r.match === null || r.match.verdict === 'kill').toBe(true)
  })
})