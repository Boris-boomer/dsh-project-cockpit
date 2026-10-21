/**
 * engines/cost.mjs —— AI 本地部署 vs API 调用 成本计算引擎
 *
 * 功能来源：原 ai_cost_calculator/streamlit_app.py 的核心计算段
 *          （33-89 行公式 + 244-253 行建议阈值）。
 * 内联理由：功能合并进 dsh-project-cockpit（详见 match.mjs 说明）。
 *          数据文件 data/models.json / data/careers.json 一并内联到本包。
 *
 * 设计增强（相对原实现）：
 *   - 数据加载可注入（loadData），默认读包内 data/，测试可传内存对象，
 *     避免测试依赖磁盘布局。
 *   - 数据加载失败抛带 code 的 EngineError，而不是静默崩溃。
 *   - 计算函数保持纯函数（同一输入 → 同一输出）。
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SCENES, COST_DEFAULTS, BREAKEVEN_THRESHOLDS } from './constants.mjs'
import { EngineError, ErrorCodes, ErrorKind } from './errors.mjs'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data')

/** 读 JSON，失败抛 EngineError（带 code + 路径上下文） */
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch (e) {
    throw new EngineError(
      e?.code === 'ENOENT' ? ErrorCodes.DATA_UNREADABLE : ErrorCodes.DATA_MALFORMED,
      `成本数据读取失败: ${file}`,
      { kind: ErrorKind.ENVIRONMENT, context: { file }, cause: e },
    )
  }
}

/** 加载模型清单（默认从包内 data/） */
export function loadModels(dataDir = DATA_DIR) {
  return readJson(join(dataDir, 'models.json'))
}

/** 加载职业清单（默认从包内 data/） */
export function loadCareers(dataDir = DATA_DIR) {
  return readJson(join(dataDir, 'careers.json'))
}

/** 输入/输出分别计价的加权单价（元/百万 Token）。比例为 0 时退回统一价。 */
export function calcWeightedPrice(model, inputRatio, outputRatio) {
  const total = inputRatio + outputRatio
  if (total === 0) return model?.api_price ?? 0
  const inPrice = model?.api_price_input ?? model?.api_price ?? 0
  const outPrice = model?.api_price_output ?? model?.api_price ?? 0
  return (inPrice * inputRatio + outPrice * outputRatio) / total
}

/** 每日折旧（元）= GPU 成本 / (年限 × 365) */
export function calcDepreciation(gpuCost, lifespanYears) {
  return gpuCost / (lifespanYears * 365)
}

/** 每百万 Token 电费（元）。tokensPerSecond<=0 → 0 */
export function calcElectricity(powerWatts, tokensPerSecond, pricePerKwh) {
  if (tokensPerSecond <= 0) return 0
  const tokensPerHour = tokensPerSecond * 3600
  const kwhPerHour = powerWatts / 1000
  return ((kwhPerHour * pricePerKwh) / tokensPerHour) * 1_000_000
}

/**
 * 回本分析。
 * @param {{hardwareCost:number, apiPrice:number, roi?:number, dailyMillions:number,
 *          electricityPerMillion?:number, gpuCost:number, lifespanYears:number}} p
 * @returns {null|object} apiPrice≤0 时返回 null（对齐原 compute_break_even 的 None）
 */
export function computeBreakEven(p) {
  const roi = p.roi ?? 1
  const effectivePrice = roi > 0 ? p.apiPrice / roi : p.apiPrice
  if (effectivePrice <= 0) return null

  const millionNeeded = p.hardwareCost / effectivePrice
  const dailyApiCost = roi > 0 ? (p.apiPrice * p.dailyMillions) / roi : p.apiPrice * p.dailyMillions
  const dailyElectricity = (p.electricityPerMillion ?? 0) * p.dailyMillions
  const dailyDepreciation = calcDepreciation(p.gpuCost, p.lifespanYears)
  const dailyLocalCost = dailyElectricity + dailyDepreciation
  const dailySaving = dailyLocalCost <= 0 ? dailyApiCost : dailyApiCost - dailyLocalCost
  const daysToBreakEven = dailySaving > 0 ? p.hardwareCost / dailySaving : Infinity
  const monthlySaving = dailySaving > 0 ? dailySaving * 30 : 0

  return {
    millionNeeded,
    dailyApiCost,
    dailyElectricity,
    dailyDepreciation,
    dailyLocalCost,
    dailySaving,
    daysToBreakEven,
    monthlySaving,
    annualSaving: monthlySaving * 12,
    recommendation: recommend(daysToBreakEven),
  }
}

/** 建议规则（阈值与原 UI 对齐） */
export function recommend(days) {
  const t = BREAKEVEN_THRESHOLDS
  if (days === Infinity) return { level: 'warn', text: '每日电费+折旧已超过API费用，本地部署不划算，优先用 API' }
  if (days <= t.strong) return { level: 'strong', text: '回本周期 < 1个月，强烈推荐本地部署' }
  if (days <= t.consider) return { level: 'consider', text: '回本周期 1-3个月，值得考虑本地部署' }
  if (days <= t.judge) return { level: 'judge', text: '回本周期 3-12个月，需根据业务持续性判断' }
  return { level: 'warn', text: '回本周期 > 1年，优先考虑 API 调用' }
}

/**
 * 一站式：模型 key + 场景 + 职业水平 → 完整结论。
 * @param {object} opts
 * @param {{models?: object, careers?: object, dataDir?: string}} [opts.data] 数据注入（测试用）
 */
export function analyze(opts = {}) {
  const models = opts.data?.models ?? loadModels(opts.data?.dataDir)
  const careers = opts.data?.careers ?? loadCareers(opts.data?.dataDir)

  const model = models[opts.modelKey]
  if (!model) {
    return { error: `未知模型: ${opts.modelKey}`, code: ErrorCodes.UNKNOWN_MODEL }
  }

  const sceneKey = opts.scene ?? 'chat'
  const scene = SCENES[sceneKey]
  if (!scene) {
    return { error: `未知场景: ${sceneKey}`, code: ErrorCodes.UNKNOWN_SCENE }
  }

  const careerKey = opts.careerKey ?? '2'
  const career = careers[careerKey]
  if (!career) {
    return { error: `未知职业档位: ${careerKey}`, code: ErrorCodes.UNKNOWN_CAREER }
  }

  const [inputRatio, outputRatio] = scene.ratio
  const hardwareCost = opts.hardwareCost ?? model.ref_cost ?? COST_DEFAULTS.fallbackHardwareCost
  const gpuRatio = opts.gpuRatio ?? COST_DEFAULTS.gpuRatio
  const lifespanYears = opts.lifespanYears ?? COST_DEFAULTS.lifespanYears

  const weightedPrice = calcWeightedPrice(model, inputRatio, outputRatio)
  const electricityPerMillion = calcElectricity(
    opts.powerWatts ?? COST_DEFAULTS.powerWatts,
    opts.tokensPerSecond ?? COST_DEFAULTS.tokensPerSecond,
    opts.pricePerKwh ?? COST_DEFAULTS.pricePerKwh,
  )

  const result = computeBreakEven({
    hardwareCost,
    apiPrice: weightedPrice,
    roi: opts.roi ?? COST_DEFAULTS.roi,
    dailyMillions: career.daily_default / 100, // 万Token → 百万Token
    electricityPerMillion,
    gpuCost: hardwareCost * gpuRatio,
    lifespanYears,
  })

  return {
    model,
    career,
    scene: sceneKey,
    weightedPrice,
    electricityPerMillion,
    hardwareCost,
    ...(result ?? {}),
  }
}

export { SCENES }