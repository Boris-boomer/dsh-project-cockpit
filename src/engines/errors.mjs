/**
 * engines/errors.mjs —— 统一错误模型（生产健壮性 · 可观测性 的基石）
 *
 * 设计目标：
 *   - 所有引擎错误都带稳定 code，便于上层 switch / 上报 / i18n。
 *   - 携带 context（哪个字段、哪个输入）便于定位，但不泄露敏感数据。
 *   - 分类（kind）决定调用方该"重试 / 修正输入 / 放弃"。
 */

import { sanitizeContext } from './sanitize.mjs'

/** 错误分类 —— 决定调用方策略 */
export const ErrorKind = Object.freeze({
  /** 输入不合法：调用方修正后重试 */
  INVALID_INPUT: 'invalid_input',
  /** 前置条件不满足：需要先补齐上下文 */
  PRECONDITION: 'precondition',
  /** 运行时环境问题：可重试（如 IO 抖动） */
  ENVIRONMENT: 'environment',
  /** 内部缺陷：不应发生，需上报 */
  INTERNAL: 'internal',
})

/** 常见错误码（集中定义，避免散落魔法字符串） */
export const ErrorCodes = Object.freeze({
  INVALID_INPUT: 'ENGINE_INVALID_INPUT',
  UNKNOWN_MODEL: 'COST_UNKNOWN_MODEL',
  UNKNOWN_SCENE: 'COST_UNKNOWN_SCENE',
  UNKNOWN_CAREER: 'COST_UNKNOWN_CAREER',
  DATA_UNREADABLE: 'DATA_UNREADABLE',
  DATA_MALFORMED: 'DATA_MALFORMED',
  SCAN_FAILED: 'SCAN_FAILED',
  SCAN_ROOT_MISSING: 'SCAN_ROOT_MISSING',
  SCAN_DEPTH_EXCEEDED: 'SCAN_DEPTH_EXCEEDED',
})

/**
 * 引擎统一异常。
 * 不用裸 Error，是为了让上层拿到可编程的 code/kind/context。
 */
export class EngineError extends Error {
  /**
   * @param {string} code    稳定错误码，如 'COST_UNKNOWN_MODEL'
   * @param {string} message 人类可读说明
   * @param {object} [opts]
   * @param {string} [opts.kind]    见 ErrorKind，默认 internal
   * @param {object} [opts.context] 结构化上下文（会被脱敏）
   * @param {Error}  [opts.cause]   原始异常
   */
  constructor(code, message, opts = {}) {
    super(message)
    this.name = 'EngineError'
    this.code = code
    this.kind = opts.kind ?? ErrorKind.INTERNAL
    this.context = sanitizeContext(opts.context)
    if (opts.cause) this.cause = opts.cause
  }

  /** 是否可重试 */
  get retryable() {
    return this.kind === ErrorKind.ENVIRONMENT
  }

  /** 序列化为安全对象（可进日志 / 事件 / HTTP 响应） */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      kind: this.kind,
      message: this.message,
      context: this.context,
      retryable: this.retryable,
      cause: this.cause ? String(this.cause.message ?? this.cause) : undefined,
    }
  }
}

/** 统一断言：条件不满足即抛出带 code 的 EngineError。 */
export function invariant(condition, code, message, opts = {}) {
  if (!condition) throw new EngineError(code, message, opts)
  return true
}