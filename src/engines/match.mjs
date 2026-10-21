/**
 * engines/match.mjs —— 机会-项目六维匹配评分引擎
 *
 * 功能来源：原 GapForm 的 analyzers/matcher.py（F3 核心）
 * 内联理由：功能合并进 dsh-project-cockpit，成为自包含项目的一部分，
 *          不再作为外部 workspace 依赖被 import。
 *
 * 算法（与原始实现行为对齐，判据测试守护）：
 *   六维权重 capability 0.40 / barrier 0.15 / time 0.10 /
 *            resource 0.05 / credibility 0.15 / compound 0.15
 *   capability < 0.5 一票否决（kill），不进入加权。
 *
 * 增强（相对原实现）：
 *   - 输入校验：非法输入抛 EngineError（带 code），不再静默产生 NaN。
 *   - 可观测：可选注入 telemetry，记录维度分与判定。
 *   - 纯函数：除 telemetry 副作用外，相同输入必得相同输出（时间维度除外，
 *     它依赖"当前日期"，故提供 now 注入以便测试确定性）。
 */

import {
  MATCH_WEIGHTS,
  CAPABILITY_KILL_THRESHOLD,
  COVERAGE_THRESHOLD,
  GENERIC_KEYWORDS,
  REQ_TO_CAP_SYNONYMS,
  RESOURCE_HEAVY_KEYWORDS,
  BARRIER_KEYWORDS,
  CREDIBILITY_KEYWORDS,
  TYPE_BARRIER_BASE,
  TYPE_CREDIBILITY_BASE,
  GENERIC_CAPABILITY_NAMES,
  VERDICTS,
} from './constants.mjs'
import { EngineError, ErrorCodes, ErrorKind } from './errors.mjs'

/**
 * 六维匹配评分。
 * @param {{id?, name?, type?, deadline?, source_url?, requirements?: Array<{category, text}>}} opportunity
 * @param {{id?, name?}} project
 * @param {Array<{name, description?, real?}>} [capabilities=[]]
 * @param {{now?: () => number, telemetry?: object}} [opts]
 * @returns {object} 含六维分 + matchScore + verdict + gaps + firstStep
 */
export function scoreMatch(opportunity, project, capabilities = [], opts = {}) {
  validateInputs(opportunity, project, capabilities)

  const now = opts.now ?? (() => Date.now())
  const scores = scoreDimensions(opportunity, capabilities, now)
  const capability = scores.capability

  // capability 一票否决：不进加权，直接 kill
  if (capability < CAPABILITY_KILL_THRESHOLD) {
    const out = {
      opportunityId: opportunity?.id ?? 0,
      projectId: project?.id ?? 0,
      matchScore: 0,
      capability,
      barrier: scores.barrier,
      time: scores.time,
      resource: scores.resource,
      credibility: scores.credibility,
      compound: scores.compound,
      recommendedWeapon: '',
      gaps: ['能力不匹配（capability 一票否决）'],
      firstStep: '重新评估机会或项目方向',
      verdict: 'kill',
    }
    opts.telemetry?.info('match.scored', { verdict: out.verdict, capability })
    return out
  }

  const total = Object.keys(MATCH_WEIGHTS)
    .reduce((sum, k) => sum + MATCH_WEIGHTS[k] * scores[k], 0)

  const weapon = pickWeapon(opportunity, capabilities)
  const gaps = findGaps(opportunity, capabilities)
  const firstStep = buildFirstStep(weapon, gaps)
  const verdict = verdictFor(total)

  const out = {
    opportunityId: opportunity?.id ?? 0,
    projectId: project?.id ?? 0,
    matchScore: round3(total),
    capability: round3(capability),
    barrier: round3(scores.barrier),
    time: round3(scores.time),
    resource: round3(scores.resource),
    credibility: round3(scores.credibility),
    compound: round3(scores.compound),
    recommendedWeapon: weapon,
    gaps,
    firstStep,
    verdict,
  }

  opts.telemetry?.info('match.scored', {
    verdict,
    matchScore: out.matchScore,
    dimensionScores: {
      capability: out.capability, barrier: out.barrier, time: out.time,
      resource: out.resource, credibility: out.credibility, compound: out.compound,
    },
    gapCount: gaps.length,
  })
  return out
}

/** 输入校验：把"隐性 NaN"变成显式错误 */
function validateInputs(opportunity, project, capabilities) {
  if (opportunity == null || typeof opportunity !== 'object') {
    throw new EngineError(ErrorCodes.INVALID_INPUT, 'opportunity 必须是对象', {
      kind: ErrorKind.INVALID_INPUT, context: { field: 'opportunity' },
    })
  }
  if (project == null || typeof project !== 'object') {
    throw new EngineError(ErrorCodes.INVALID_INPUT, 'project 必须是对象', {
      kind: ErrorKind.INVALID_INPUT, context: { field: 'project' },
    })
  }
  if (!Array.isArray(capabilities)) {
    throw new EngineError(ErrorCodes.INVALID_INPUT, 'capabilities 必须是数组', {
      kind: ErrorKind.INVALID_INPUT, context: { field: 'capabilities' },
    })
  }
  if (opportunity.requirements != null && !Array.isArray(opportunity.requirements)) {
    throw new EngineError(ErrorCodes.INVALID_INPUT, 'opportunity.requirements 必须是数组', {
      kind: ErrorKind.INVALID_INPUT, context: { field: 'requirements' },
    })
  }
}

function scoreDimensions(opp, caps, now) {
  const realCaps = caps.filter((c) => c?.real)

  const abilityReqs = (opp.requirements ?? []).filter((r) => r?.category === 'ability')
  let capability
  if (abilityReqs.length) {
    const covered = abilityReqs.filter((r) => reqCovered(r.text, realCaps)).length
    capability = covered / abilityReqs.length
  } else if (realCaps.length) {
    capability = 0.6
  } else {
    capability = 0.3
  }

  const allReqText = (opp.requirements ?? []).map((r) => r?.text ?? '').join(' ').toLowerCase()
  const barrierBase = TYPE_BARRIER_BASE[opp.type] ?? 0.55
  const barrierHits = BARRIER_KEYWORDS.filter((kw) => allReqText.includes(kw)).length
  const barrier = clamp(0.2, 0.9, barrierBase - 0.05 * barrierHits)

  const time = scoreTime(opp.deadline, now)

  const heavyHits = RESOURCE_HEAVY_KEYWORDS.filter((kw) => allReqText.includes(kw)).length
  const resource = Math.max(0.2, 0.9 - 0.15 * heavyHits)

  const credBase = TYPE_CREDIBILITY_BASE[opp.type] ?? 0.55
  const credHits = CREDIBILITY_KEYWORDS.filter((kw) => allReqText.includes(kw)).length
  const hasUrl = opp.source_url ? 0.05 : 0.0
  const credibility = clamp(0.2, 0.95, credBase + 0.05 * credHits + hasUrl)

  const compound = realCaps.length ? Math.min(0.95, 0.5 + 0.05 * realCaps.length) : 0.3

  return { capability, barrier, time, resource, credibility, compound }
}

/** 时间维度：距今越远越高。过期 → 0.1 */
export function scoreTime(deadline, now = () => Date.now()) {
  if (!deadline) return 0.6
  const clean = String(deadline).replace(/\//g, '-').trim().slice(0, 10)
  const dt = new Date(`${clean}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) return 0.6
  const days = Math.floor((dt.getTime() - now()) / 86400000)
  if (days < 0) return 0.1
  if (days < 7) return 0.3
  if (days < 30) return 0.5
  if (days < 60) return 0.7
  return 0.9
}

/** 需求文本 → 关键词（英文单词 + 中文 2/3-gram），去重 */
export function extractReqKeywords(text) {
  const tl = String(text ?? '').toLowerCase()
  const tokens = []
  for (const m of tl.matchAll(/[a-z][a-z0-9]+/g)) tokens.push(m[0])
  for (const chunk of String(text ?? '').match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    if (chunk.length <= 3) { tokens.push(chunk); continue }
    for (let i = 0; i < chunk.length - 1; i++) tokens.push(chunk.slice(i, i + 2))
    for (let i = 0; i < chunk.length - 2; i++) tokens.push(chunk.slice(i, i + 3))
  }
  return [...new Set(tokens)]
}

function reqCovered(reqText, realCaps) {
  const reqKws = extractReqKeywords(reqText)
  if (!reqKws.length) return false
  const capText = realCaps.map((c) => `${c.name} ${c.description ?? ''}`).join(' ').toLowerCase()
  let maxWeight = 0
  for (const kw of reqKws) {
    if (capText.includes(kw)) maxWeight = Math.max(maxWeight, keywordWeight(kw))
    for (const syn of REQ_TO_CAP_SYNONYMS[kw] ?? []) {
      if (capText.includes(syn)) maxWeight = Math.max(maxWeight, keywordWeight(syn))
    }
  }
  return maxWeight >= COVERAGE_THRESHOLD
}

function keywordWeight(kw) {
  const l = String(kw).toLowerCase()
  if (GENERIC_KEYWORDS.has(l)) return 0.2
  if (l.length <= 2) return 0.5
  return 1.0
}

/** 推荐武器：挑与需求最匹配的真实能力（通用能力名降权） */
export function pickWeapon(opp, caps) {
  const abilityText = (opp.requirements ?? [])
    .filter((r) => r?.category === 'ability')
    .map((r) => r?.text ?? '').join(' ').toLowerCase()
  const reqKws = new Set(extractReqKeywords(abilityText))
  const expanded = new Set(reqKws)
  for (const kw of reqKws) for (const syn of REQ_TO_CAP_SYNONYMS[kw] ?? []) expanded.add(syn)

  const scored = []
  for (const c of caps) {
    if (!c?.real) continue
    const mult = GENERIC_CAPABILITY_NAMES.has(c.name) ? 0.3 : 1.0
    const nameL = String(c.name).toLowerCase()
    const descL = String(c.description ?? '').toLowerCase()
    let s = 0
    for (const kw of expanded) {
      const w = keywordWeight(kw)
      if (nameL.includes(kw)) s += 2.0 * w * mult
      else if (descL.includes(kw)) s += 0.5 * w * mult
    }
    if (s > 0) scored.push([s, c.name])
  }

  if (!scored.length) {
    const specific = caps.filter((c) => c?.real && !GENERIC_CAPABILITY_NAMES.has(c.name))
    if (specific.length) return specific[0].name
    return caps.length ? caps[0].name : ''
  }
  scored.sort((a, b) => b[0] - a[0])
  return scored.slice(0, 2).map(([, n]) => n).join(' + ')
}

/** 能力差距：未被任何真实能力覆盖的需求 */
export function findGaps(opp, caps) {
  const realCaps = caps.filter((c) => c?.real)
  const gaps = []
  for (const req of opp.requirements ?? []) {
    if (req?.category !== 'ability') continue
    if (!reqCovered(req.text, realCaps)) gaps.push(req.text)
  }
  return gaps.slice(0, 8)
}

function buildFirstStep(weapon, gaps) {
  if (!weapon) {
    return gaps.length ? `先补齐最小可用能力，优先解决: ${gaps[0]}` : '先补齐项目最小可用能力'
  }
  return gaps.length
    ? `围绕 ${weapon}，先做出「${gaps[0]}」的最小闭环`
    : `用 ${weapon} 做能力验证原型，跑通最小闭环`
}

/** 判定：≥0.70 proceed / ≥0.50 iterate / 其他 pivot（kill 在调用前已拦） */
export function verdictFor(total) {
  if (total >= 0.70) return 'proceed'
  if (total >= 0.50) return 'iterate'
  return 'pivot'
}

function clamp(lo, hi, v) { return Math.min(hi, Math.max(lo, v)) }
function round3(n) { return Math.round(n * 1000) / 1000 }

export { VERDICTS }