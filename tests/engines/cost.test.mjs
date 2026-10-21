import { describe, it, expect } from 'vitest'
import { analyze, computeBreakEven, recommend } from '../../src/engines/cost.mjs'

const DATA = {
  models: {
    m1: { name: 'M1', api_price: 2, ref_cost: 2000, ref_hardware: 'x' },
  },
  careers: {
    '2': { name: '中级', daily_default: 5000, desc: '' },
  },
}

describe('analyze', () => {
  it('未知模型返回 error + code', () => {
    const r = analyze({ modelKey: 'nope', data: DATA })
    expect(r.error).toBeDefined()
    expect(r.code).toBe('COST_UNKNOWN_MODEL')
  })
  it('正常输入返回完整结果', () => {
    const r = analyze({ modelKey: 'm1', careerKey: '2', scene: 'chat', data: DATA })
    expect(r.daysToBreakEven).toBeDefined()
    expect(r.recommendation).toBeDefined()
  })
  it('未知场景返回 error', () => {
    const r = analyze({ modelKey: 'm1', careerKey: '2', scene: 'nope', data: DATA })
    expect(r.code).toBe('COST_UNKNOWN_SCENE')
  })
})

describe('recommend', () => {
  it('回本 10 天 → strong', () => { expect(recommend(10).level).toBe('strong') })
  it('回本 60 天 → consider', () => { expect(recommend(60).level).toBe('consider') })
  it('回本 200 天 → judge', () => { expect(recommend(200).level).toBe('judge') })
  it('Infinity → warn', () => { expect(recommend(Infinity).level).toBe('warn') })
})

describe('computeBreakEven', () => {
  it('apiPrice <= 0 返回 null', () => {
    expect(computeBreakEven({
      hardwareCost: 1000, apiPrice: 0, dailyMillions: 1, gpuCost: 800, lifespanYears: 3,
    })).toBeNull()
  })
})