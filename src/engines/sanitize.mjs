/**
 * engines/sanitize.mjs —— 脱敏工具（安全维度的单一实现点）
 *
 * 区别存放的理由：errors.mjs 与 telemetry.mjs 都要脱敏，
 * 如果各自实现会漂移。这里做**唯一实现**，两边 import。
 */

const SENSITIVE_KEY = /pass|secret|token|key|auth|cookie|credential|apikey|private/i

/** 单个值的脱敏 */
export function sanitizeValue(v) {
  if (typeof v === 'string') return v.length > 200 ? `${v.slice(0, 200)}...` : v
  if (v == null) return v
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) return `[array len=${v.length}]`
  if (typeof v === 'object') return '[object]'
  return String(v)
}

/**
 * 对象脱敏：敏感键名 → '[redacted]'，长串截断，嵌套对象折叠。
 * 保证任何日志/事件/HTTP 响应都不带密钥或超长原文。
 */
export function sanitizeContext(context) {
  if (context == null || typeof context !== 'object') return undefined
  const out = {}
  for (const [k, v] of Object.entries(context)) {
    out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : sanitizeValue(v)
  }
  return out
}

/** 判断某键名是否敏感（供调用方复用） */
export function isSensitiveKey(key) {
  return SENSITIVE_KEY.test(String(key))
}