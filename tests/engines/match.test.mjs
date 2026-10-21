import { describe, it, expect } from 'vitest'
import {
  scoreMatch,
  scoreTime,
  verdictFor,
} from '../../src/engines/match.mjs'
import { MATCH_WEIGHTS, CAPABILITY_KILL_THRESHOLD } from '../../src/engines/constants.mjs'

describe('MATCH_WEIGHTS 契约', () => {
  it('六维权重合计 = 1.0', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 6)
  })
})

describe('scoreMatch', () => {
  const project = { id: 1, name: 'ai-workflow' }

  it('capability < 0.5 时一票否决', () => {
    const opportunity = {
      id: 1,
      name: 'op',
      type: 'bounty',
      requirements: [{ category: 'ability', text: '需要从未见过的量子计算能力' }],
    }
    const r = scoreMatch(opportunity, project, [])
    expect(r.capability).toBeLessThan(CAPABILITY_KILL_THRESHOLD)
    expect(r.verdict).toBe('kill')
    expect(r.matchScore).toBe(0)
  })

  it('全覆盖能力时给出非 kill 判定', () => {
    const opportunity = {
      id: 1,
      name: 'op',
      type: 'bounty',
      requirements: [{ category: 'ability', text: '需要 MCP 适配能力' }],
    }
    const caps = [{ name: 'MCP 适配器', description: '包装 MCP 服务', real: true }]
    const r = scoreMatch(opportunity, project, caps)
    expect(r.capability).toBe(1)
    expect(r.verdict).not.toBe('kill')
  })

  it('非法输入抛 EngineError', () => {
    expect(() => scoreMatch(null, project, [])).toThrow(/opportunity/)
    expect(() => scoreMatch({}, null, [])).toThrow(/project/)
    expect(() => scoreMatch({}, project, 'not-array')).toThrow(/capabilities/)
  })
})

describe('scoreTime', () => {
  const now = () => new Date('2026-01-01T00:00:00Z').getTime()
  it('无截止日期返回 0.6', () => { expect(scoreTime('', now)).toBe(0.6) })
  it('过期返回 0.1', () => { expect(scoreTime('2025-01-01', now)).toBe(0.1) })
  it('30-60 天返回 0.7', () => { expect(scoreTime('2026-02-15', now)).toBe(0.7) })
})

describe('verdictFor', () => {
  it('>= 0.70 proceed', () => { expect(verdictFor(0.7)).toBe('proceed') })
  it('>= 0.50 iterate', () => { expect(verdictFor(0.5)).toBe('iterate') })
  it('< 0.50 pivot', () => { expect(verdictFor(0.49)).toBe('pivot') })
})