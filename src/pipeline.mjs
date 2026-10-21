/**
 * dsh-project-cockpit · 编排层（orchestration）—— 块6 的功能合并核心。
 *
 * 背景：GapForm / ShipSignal / ai_cost_calculator / CodeConstellation 四个引擎
 * 原本只是"并排摆着"的独立能力。本文件把它们串成一条真实的工作流：
 *
 *   机会(opportunity) ──► ① scoreMatch   六维评分 + verdict
 *                          │
 *                          ├─ verdict=kill ──► 提前终止，返回 kill 结论
 *                          ▼
 *                       ② assessSignal  机会来源可信度（决定该不该信这个机会）
 *                          │
 *                          ▼
 *                       ③ analyze       把 recommendedWeapon/gaps 折算成成本
 *                          │
 *                          ▼
 *                       ④ buildProjectGraph  产出"候选方向卡"挂成图谱节点
 *
 * 产出物 decisionCard：一张自包含的"这个机会值不值得做 + 要花多少钱 + 信不信得过"的卡片。
 *
 * 纯函数优先：除 analyze 会读随包数据文件外，其余均为确定性计算。
 */

import { scoreMatch } from './engines/match.mjs'
import { analyze } from './engines/cost.mjs'
import { assessSignal } from './engines/signal.mjs'
import { buildProjectGraph } from './engines/constellation.mjs'

/** 流水线阶段名（顺序即执行顺序） */
export const PIPELINE_STAGES = Object.freeze(['match', 'signal', 'cost', 'graph'])

/** 从机会对象推出来源可验证性（若调用方未显式给出）。 */
export function inferSourceVerifiability(opportunity = {}) {
  if (opportunity.sourceVerifiability) return opportunity.sourceVerifiability
  const type = opportunity.type
  if (type === 'rfp' || type === 'competition') return 'high'
  if (type === 'bounty' || type === 'grant') return 'medium'
  return opportunity.source_url ? 'medium' : 'low'
}

/** 从机会/项目推付费信号（赏金、招标、资助默认有真金白银）。 */
export function inferPaymentSignal(opportunity = {}) {
  if (typeof opportunity.paymentSignalPresent === 'boolean') return opportunity.paymentSignalPresent
  return ['bounty', 'rfp', 'grant'].includes(opportunity.type)
}

/**
 * 把选题结果折算成成本分析入参。
 * 关键：成本不是凭空算的，而是按「能力缺口」决定投入规模 ——
 * 缺口越多越偏"重度使用"，评分越高越该认真投入（职业档位上调）。
 */
export function deriveCostOptions(match, opportunity = {}, overrides = {}) {
  const gapCount = (match?.gaps ?? []).length
  const matchScore = match?.matchScore ?? 0
  const scene = overrides.scene ?? (gapCount >= 3 ? 'rag' : 'codegen')
  const careerKey = overrides.careerKey ?? (matchScore >= 0.7 ? '3' : '2')
  return {
    modelKey: overrides.modelKey ?? '2',
    scene,
    careerKey,
    hardwareCost: overrides.hardwareCost,
    roi: overrides.roi ?? 1,
    lifespanYears: overrides.lifespanYears ?? 3,
    ...overrides,
  }
}

/**
 * 完整评估流水线：一个机会 → 一张决策卡 + 一张图谱。
 * @param {object} request
 *   opportunity  {name, type, deadline?, source_url?, requirements[], sourceVerifiability?, paymentSignalPresent?, timeSeries?}
 *   project      {id?, name}                       目标项目（默认 ai-workflow 自身）
 *   capabilities Array<{name, description, real}>  项目真实能力
 *   overrides    透传给 analyze 的成本参数覆盖
 *   projects / capabilitiesIndex / projectCaps / projectRelations / rootPath  第④步构图输入（可选）
 * @returns {object} 见文件头说明
 */
export function runPipeline(request = {}) {
  const opportunity = request.opportunity ?? {}
  const project = request.project ?? { id: 'p-main', name: 'ai-workflow' }
  const capabilities = request.capabilities ?? []
  const stages = []
  const t0 = Date.now()

  function stage(name, fn) {
    const s = Date.now()
    try {
      const output = fn()
      stages.push({ stage: name, ok: true, ms: Date.now() - s, output })
      return output
    } catch (e) {
      stages.push({ stage: name, ok: false, ms: Date.now() - s, error: String(e?.message ?? e) })
      return null
    }
  }

  // ── ① 六维匹配评分 ────────────────────────────────────────────
  const match = stage('match', () => scoreMatch(opportunity, project, capabilities))

  // capability 一票否决 → 提前终止，后面的成本/图谱没有意义
  if (!match || match.verdict === 'kill') {
    return {
      ok: true,
      terminatedAt: 'match',
      verdict: match?.verdict ?? 'kill',
      advice: match?.firstStep ?? '能力不匹配，建议放弃该机会',
      match,
      signal: null,
      cost: null,
      decisionCard: null,
      stages,
      graph: null,
    }
  }

  // ── ② 信号真实性评分（决定"这个机会的信度"）──────────────────
  const signal = stage('signal', () => assessSignal({
    sourceVerifiability: inferSourceVerifiability(opportunity),
    paymentSignalPresent: inferPaymentSignal(opportunity),
    anomalyFlags: request.anomalyFlags ?? opportunity.anomalyFlags ?? [],
    timeSeries: request.timeSeries ?? opportunity.timeSeries,
  }))

  // ── ③ 成本分析（用评分结果折算投入规模）────────────────────────
  const costOpts = deriveCostOptions(match, opportunity, request.overrides ?? {})
  const cost = stage('cost', () => analyze(costOpts))

  // ── ④ 图谱构建（把决策卡落成图谱节点）──────────────────────────
  const graph = stage('graph', () => {
    const decisionNode = {
      id: `decision-${opportunity.name ?? 'opportunity'}`,
      name: opportunity.name ?? '未命名机会',
      path: '',
      stack: [],
      tags: ['decision-card'],
      summary: match.recommendedWeapon ?? '',
      metadata: {
        matchScore: match.matchScore,
        verdict: match.verdict,
        recommendedWeapon: match.recommendedWeapon,
        gaps: match.gaps,
        confidence: signal?.suggestedConfidence ?? null,
        signalRaw: signal?.raw ?? null,
        daysToBreakEven: cost?.daysToBreakEven ?? null,
        monthlySaving: cost?.monthlySaving ?? null,
        recommendation: cost?.recommendation ?? null,
      },
      lastScanned: Date.now(),
      scanRoot: '',
      embedding: null,
    }
    const baseProjects = request.projects ?? [project]
    const projects = baseProjects.some((p) => p.id === decisionNode.id)
      ? baseProjects
      : [...baseProjects, decisionNode]
    // 把"决策卡节点 ↔ 目标项目"的关系边也一并生成，图谱页签才看得到联动
    const relations = [...(request.projectRelations ?? [])]
    if (project.id && project.id !== decisionNode.id) {
      relations.push({
        id: `rel-${decisionNode.id}-${project.id}`,
        source: decisionNode.id,
        target: project.id,
        type: match.matchScore >= 0.7 ? 'combine' : 'overlap',
        confidence: match.matchScore,
        reason: match.recommendedWeapon ?? '',
        snapshotHash: '',
        createdAt: Date.now(),
      })
    }
    return buildProjectGraph(
      projects,
      request.capabilitiesIndex ?? [],
      request.projectCaps ?? [],
      relations,
      request.rootPath ?? '',
    )
  })

  const decisionCard = buildDecisionCard({ opportunity, project, match, signal, cost, costOpts })

  return {
    ok: true,
    terminatedAt: null,
    verdict: decisionCard.verdict,
    advice: decisionCard.advice,
    match,
    signal,
    cost,
    costOpts,
    decisionCard,
    stages,
    graph,
    elapsedMs: Date.now() - t0,
  }
}

/**
 * 把四路结果汇成一张"决策卡"。
 * 跨引擎合成规则：
 *   - 信号可信度低 → verdict 降级一档（好机会也可能是假信号）
 *   - 回本周期过长 → 不否决，但建议口径改为"先用 API 验证"
 */
export function buildDecisionCard({ opportunity, project, match, signal, cost, costOpts }) {
  const rankOf = { kill: 0, pivot: 1, iterate: 2, proceed: 3 }
  const nameOf = ['kill', 'pivot', 'iterate', 'proceed']
  let rank = rankOf[match?.verdict ?? 'pivot'] ?? 1

  const notes = []
  if (signal?.suggestedConfidence === 'low') {
    rank = Math.max(0, rank - 1)
    notes.push('信号可信度低，结论降级一档')
  } else if (signal?.suggestedConfidence === 'high') {
    notes.push('信号可信度高')
  }

  const days = cost?.daysToBreakEven
  const apiFirst = days == null || days === Infinity

  const confLabel = { high: '高', medium: '中', low: '低' }[signal?.suggestedConfidence] ?? '未知'
  const adviceParts = [
    `匹配 ${Math.round((match?.matchScore ?? 0) * 100)}%`,
    `信号${confLabel}可信`,
  ]
  if (apiFirst) adviceParts.push('本地部署不划算，优先 API 验证')
  else if (days <= 90) adviceParts.push(`回本 ${Math.round(days)} 天，可上本地`)
  else adviceParts.push(`回本 ${Math.round(days)} 天，按需判断`)

  return {
    opportunity: { name: opportunity.name, type: opportunity.type, deadline: opportunity.deadline ?? null },
    project: { id: project.id, name: project.name },
    matchScore: match?.matchScore ?? 0,
    verdict: nameOf[rank],
    originalVerdict: match?.verdict,
    recommendedWeapon: match?.recommendedWeapon ?? '',
    gaps: match?.gaps ?? [],
    confidence: signal?.suggestedConfidence ?? null,
    signalRaw: signal?.raw ?? null,
    cost: cost
      ? {
          model: cost.model?.name ?? null,
          daysToBreakEven: cost.daysToBreakEven ?? null,
          monthlySaving: cost.monthlySaving ?? null,
          recommendation: cost.recommendation?.text ?? null,
          scene: costOpts?.scene ?? null,
        }
      : null,
    advice: adviceParts.join(' · '),
    notes,
    firstStep: match?.firstStep ?? '',
  }
}