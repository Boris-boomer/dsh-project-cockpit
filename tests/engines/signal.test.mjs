import { describe, it, expect } from 'vitest'
import { assessSignal, detectTimeSeriesAnomaly } from '../../src/engines/signal.mjs'
import { CONFIDENCE_THRESHOLDS } from '../../src/engines/constants.mjs'

describe('detectTimeSeriesAnomaly', () => {
  it('少于 3 个元素返回 0', () => {
    expect(detectTimeSeriesAnomaly([1, 2]).score).toBe(0)
  })
  it('跳变超过阈值命中 time_series_jump', () => {
    const r = detectTimeSeriesAnomaly([10, 10, 100])
    expect(r.flags).toContain('time_series_jump')
  })
})

describe('assessSignal', () => {
  it('高可验证 + 有付费 → high', () => {
    const r = assessSignal({ sourceVerifiability: 'high', paymentSignalPresent: true })
    expect(r.raw).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.high)
    expect(r.suggestedConfidence).toBe('high')
  })
  it('有付费信号时保底不低于 medium', () => {
    const r = assessSignal({
      sourceVerifiability: 'medium',
      paymentSignalPresent: true,
      anomalyFlags: ['x', 'y'],
    })
    expect(r.suggestedConfidence).not.toBe('low')
  })
  it('非法输入抛错', () => {
    expect(() => assessSignal(null)).toThrow(/对象/)
  })
})