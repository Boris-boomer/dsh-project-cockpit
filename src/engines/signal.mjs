/**
 * engines/signal.mjs —— 信号真实性评分引擎
 *
 * 功能来源：原 ShipSignal 的 Rust credibility/mod.rs
 * 内联理由：功能合并进 dsh-project-cockpit（详见 match.mjs 说明）。
 *
 * 算法（行为对齐原实现，判据测试守护）：
 *   raw = verifiability*0.30 + payment*0.45 + (1-anomaly)*0.25
 *   置信度：raw≥0.72 high / ≥0.45 medium / 其他 low
 *   保底：有真实付费信号时即便 raw 低也不判 low（至少 medium）
 *   时间序列相邻跳变 > 3 倍 → 命中 time_series_jump
 */

import {
  VERIFIABILITY_SCORE,
  SIGNAL_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  TIME_SERIES_JUMP_RATIO,
  ANOMALY_FLAG_PENALTY,
  ANOMALY_FLAG_MAX,
  TIME_SERIES_WEIGHT,
} from './constants.mjs'
import { EngineError, ErrorCodes, ErrorKind } from './errors.mjs'

/**
 * 检测时间序列异常。
 * @param {number[]|null|undefined} series
 * @returns {{score: number, flags: string[], maxJump: number}}
 */
export function detectTimeSeriesAnomaly(series) {
  if (!Array.isArray(series) || series.length < 3) {
    return { score: 0, flags: [], maxJump: 0 }
  }
  let maxJump = 0
  for (let i = 1; i < series.length; i++) {
    const prevRaw = series[i - 1]
    // 0 用 1 兜底，避免除零
    const prev = prevRaw === 0 ? 1 : prevRaw
    const curr = series[i]
    // 非数字元素跳过，防止 NaN 污染整条序列
    if (!Number.isFinite(curr) || !Number.isFinite(prevRaw)) continue
    const jump = Math.abs(curr - prev) / Math.max(Math.abs(prev), 1)
    if (jump > maxJump) maxJump = jump
  }
  const flags = maxJump > TIME_SERIES_JUMP_RATIO ? ['time_series_jump'] : []
  return { score: clamp01(maxJump / 5.0), flags, maxJump }
}

/**
 * 综合评估信号真实性。
 * @param {{sourceVerifiability?: 'high'|'medium'|'low',
 *          paymentSignalPresent?: boolean,
 *          anomalyFlags?: string[],
 *          timeSeries?: number[]}} input
 * @param {{telemetry?: object}} [opts]
 */
export function assessSignal(input, opts = {}) {
  if (input == null || typeof input !== 'object') {
    throw new EngineError(ErrorCodes.INVALID_INPUT, 'assessSignal 输入必须是对象', {
      kind: ErrorKind.INVALID_INPUT, context: { field: 'input' },
    })
  }

  const sourceVerifiability = input.sourceVerifiability ?? 'low'
  const paymentSignalPresent = input.paymentSignalPresent === true

  const verifiabilityScore = VERIFIABILITY_SCORE[sourceVerifiability] ?? VERIFIABILITY_SCORE.low
  const { score: timeScore, flags: timeFlags } = detectTimeSeriesAnomaly(input.timeSeries)

  const baseFlags = Array.isArray(input.anomalyFlags) ? input.anomalyFlags : []
  const anomalyBase = Math.min(baseFlags.length * ANOMALY_FLAG_PENALTY, ANOMALY_FLAG_MAX)
  const anomalyScore = clamp01(anomalyBase + timeScore * TIME_SERIES_WEIGHT)

  const paymentScore = paymentSignalPresent ? 1.0 : 0.0

  const raw = verifiabilityScore * SIGNAL_WEIGHTS.verifiability
    + paymentScore * SIGNAL_WEIGHTS.payment
    + (1 - anomalyScore) * SIGNAL_WEIGHTS.nonAnomaly

  let suggested = raw >= CONFIDENCE_THRESHOLDS.high
    ? 'high'
    : raw >= CONFIDENCE_THRESHOLDS.medium ? 'medium' : 'low'

  // 保底：有真实付费信号 → 至少 medium
  if (paymentSignalPresent && suggested === 'low') suggested = 'medium'

  const reasons = []
  reasons.push(paymentSignalPresent ? '存在真实付费信号' : '无付费信号')
  if (sourceVerifiability === 'low') reasons.push('来源可验证性低')
  if (sourceVerifiability === 'high') reasons.push('来源可验证性高')
  if (anomalyScore > 0.3) reasons.push('存在异常模式')
  reasons.push(...timeFlags)

  const result = {
    verifiabilityScore,
    anomalyScore,
    paymentSignalPresent,
    suggestedConfidence: suggested,
    raw,
    reasons,
    anomalyFlags: [...baseFlags, ...timeFlags],
  }
  opts.telemetry?.info('signal.assessed', {
    suggestedConfidence: suggested, raw, reasonCount: reasons.length,
  })
  return result
}

/**
 * 命令入口：兼容原 Tauri 命令 `assess_signal` 的 snake_case 字段。
 * 保留是为了让旧调用方（前端 invoke / 其他引擎）零改动迁移。
 */
export function assessSignalCommand(input, opts = {}) {
  const src = input ?? {}
  return assessSignal({
    sourceVerifiability: input?.sourceVerifiability ?? src.source_verifiability,
    paymentSignalPresent: src.payment_signal_present ?? src.paymentSignalPresent ?? false,
    anomalyFlags: src.anomaly_flags ?? src.anomalyFlags,
    timeSeries: src.time_series ?? src.timeSeries,
  }, opts)
}

function clamp01(v) { return Math.min(1, Math.max(0, v)) }