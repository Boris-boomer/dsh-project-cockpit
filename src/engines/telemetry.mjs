/**
 * engines/telemetry.mjs —— 可观测性基座（零依赖）
 *
 * 提供：结构化日志、计时器、计数器/直方图、以及一个可插拔的 sink。
 * 设计原则：
 *   - 默认 sink 写 stderr JSONL；测试/宿主可注入自己的 sink。
 *   - 绝不抛异常（观测失败不能拖垮业务）。
 *   - 所有字段经过脱敏后再输出（复用 errors.sanitizeContext 的策略）。
 *   - 无全局可变单例：用 createTelemetry() 显式创建，便于测试隔离。
 */

import { sanitizeContext } from './sanitize.mjs'

export const LogLevel = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 99 })

/** 默认 sink：stderr JSONL（结构化，便于采集） */
function defaultSink(record) {
  try {
    process.stderr.write(`${JSON.stringify(record)}\n`)
  } catch {
    /* 观测失败静默 */
  }
}

/**
 * 创建一个 telemetry 实例。
 * @param {object} [opts]
 * @param {number} [opts.level]  最低输出级别（LogLevel），默认 info
 * @param {(r:object)=>void} [opts.sink] 自定义输出
 * @param {string} [opts.component] 组件名前缀
 * @param {() => number} [opts.now] 时钟注入（测试可控）
 */
export function createTelemetry(opts = {}) {
  const level = opts.level ?? LogLevel.info
  const sink = opts.sink ?? defaultSink
  const component = opts.component ?? 'cockpit'
  const now = opts.now ?? (() => Date.now())

  const counters = new Map()
  const timers = new Map()
  const durations = new Map()

  function emit(rec) {
    try { sink(rec) } catch { /* 观测失败静默 */ }
  }

  function log(lv, event, fields = {}) {
    if (lv < level) return
    emit({
      ts: new Date(now()).toISOString(),
      level: nameOfLevel(lv),
      component,
      event,
      ...sanitizeContext(fields),
    })
  }

  return {
    level,
    /** 结构化日志 */
    debug: (event, fields) => log(LogLevel.debug, event, fields),
    info: (event, fields) => log(LogLevel.info, event, fields),
    warn: (event, fields) => log(LogLevel.warn, event, fields),
    error: (event, fields) => log(LogLevel.error, event, fields),

    /** 计数器 +1 / +n */
    count(key) {
      counters.set(key, (counters.get(key) ?? 0) + 1)
    },
    /** 计数器快照 */
    counters: () => Object.fromEntries(counters),

    /** 开始一次计时 */
    start(key) { timers.set(key, now()) },
    /** 结束计时并记录耗时（ms） */
    stop(key) {
      const t0 = timers.get(key)
      if (t0 == null) return undefined
      const ms = now() - t0
      timers.delete(key)
      const arr = durations.get(key) ?? []
      arr.push(ms)
      // 环形上限，防止长跑内存膨胀
      if (arr.length > 256) arr.shift()
      durations.set(key, arr)
      return ms
    },
    /** 耗时统计快照 */
    durations: () => Object.fromEntries(
      [...durations.entries()].map(([k, arr]) => [k, summarize(arr)]),
    ),

    /** 观测快照（供 /metrics 或调试面板） */
    snapshot: () => ({
      counters: Object.fromEntries(counters),
      timers: [...timers.keys()],
      durations: Object.fromEntries([...durations.entries()].map(([k, a]) => [k, summarize(a)])),
    }),
  }
}

function nameOfLevel(lv) {
  for (const [k, v] of Object.entries(LogLevel)) if (v === lv) return k
  return 'info'
}

function summarize(arr) {
  if (!arr.length) return { count: 0 }
  const sorted = [...arr].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Number((sum / sorted.length).toFixed(2)),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
  }
}

/**
 * 便捷计时包装：同步/异步函数都支持，finally 一定记时。
 * @param {object} telemetry
 * @param {string} key
 * @param {() => any} fn
 */
export function measure(telemetry, key, fn) {
  telemetry.start(key)
  try {
    const out = fn()
    if (out && typeof out.then === 'function') {
      return out.finally(() => telemetry.stop(key))
    }
    telemetry.stop(key)
    return out
  } catch (e) {
    telemetry.stop(key)
    telemetry.count(`${key}.error`)
    throw e
  }
}