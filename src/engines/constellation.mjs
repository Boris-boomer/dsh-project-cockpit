/**
 * engines/constellation.mjs —— 项目能力图谱引擎（扫描 + 能力提取 + 图谱构建）
 *
 * 功能来源：原 CodeConstellation/src/host/{scanner, ai/extract-capabilities, graph}
 * 内联理由：功能合并进 dsh-project-cockpit（详见 match.mjs 说明）。
 *
 * 三段能力：
 *   1. walkDirectory / scanWithDiagnostics   递归扫描（跳噪音目录、不跟符号链接、限深）
 *   2. buildCapabilityPrompt / validateCapabilityExtraction   LLM 能力提取的 prompt 与校验
 *   3. buildProjectGraph / deriveProjectEdges 构图（节点 + 能力边 + 结构边 + 项目关系边）
 *
 * 相较原实现的修复：
 *   - 原 graph.mjs 的 `edges` 恒为空数组（声明了从不 push），此处由能力边推导补全。
 *   - 扫描结果排序，保证多平台确定性输出。
 *   - 深度截断 / 不可读目录可经由 scanWithDiagnostics 感知。
 */

import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  IGNORE_DIRS,
  IGNORE_PATH_SEGMENTS,
  CAP_VALID_LEVELS,
  CAP_MAX_PROVIDES,
  CAP_MAX_NEEDS,
  GRAPH_VERSION,
  SCAN_DEFAULT_MAX_DEPTH,
  README_EXCERPT_LIMIT,
} from './constants.mjs'

// ══════════════════════════════════════════════════════════════════
// 1) 文件扫描
// ══════════════════════════════════════════════════════════════════

/** 解析 maxDepth 选项（非法值回退默认） */
function resolveMaxDepth(value) {
  return Number.isFinite(value) ? value : SCAN_DEFAULT_MAX_DEPTH
}

/**
 * 递归列出目录下所有文件的绝对路径。
 * @param {string} dirPath
 * @param {{ignore?: string[], maxDepth?: number, telemetry?: object}} [options]
 * @returns {Promise<string[]>}
 */
export async function walkDirectory(dirPath, options = {}) {
  const root = resolve(String(dirPath ?? ''))
  const ignoreSet = new Set([...IGNORE_DIRS, ...(options.ignore ?? [])])
  const maxDepth = resolveMaxDepth(options.maxDepth)
  const results = []
  const restricted = { truncated: false, unreadable: 0 }

  async function walk(current, depth) {
    if (depth > maxDepth) { restricted.truncated = true; return }

    let entries
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      // 权限不足 / 目录已删：计数但不中断整次扫描
      restricted.unreadable++
      return
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name)
      if (IGNORE_PATH_SEGMENTS.some((seg) => fullPath.includes(seg))) continue

      let stat
      try {
        stat = await fs.lstat(fullPath)
      } catch { continue }

      // 符号链接一律跳过，防止目录逃逸
      if (stat.isSymbolicLink()) continue

      if (stat.isDirectory()) {
        if (ignoreSet.has(entry.name)) continue
        await walk(fullPath, depth + 1)
      } else if (stat.isFile()) {
        results.push(fullPath)
      }
    }
  }

  await walk(root, 0)
  // 排序保证确定性输出（跨平台 readdir 顺序不一致）
  results.sort()

  options.telemetry?.info('scan.done', {
    root,
    fileCount: results.length,
    truncated: restricted.truncated,
    unreadableDirs: restricted.unreadable,
  })
  return results
}

/** 扫描 + 诊断信息（是否被限深、多少目录不可读） */
export async function scanWithDiagnostics(dirPath, options = {}) {
  const files = await walkDirectory(dirPath, options)
  return {
    root: resolve(String(dirPath ?? '')),
    files,
    fileCount: files.length,
    maxDepthUsed: resolveMaxDepth(options.maxDepth),
  }
}

// ══════════════════════════════════════════════════════════════════
// 2) 能力提取（prompt 构建 + 结果校验）
// ══════════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT = `你是一个软件功能分析专家。给定一个项目的描述和 README 摘录，提取它的功能能力。

要求：
1. provides：项目能提供的能力，3~6 个（不要超过 6）。每个包含：
   - name：简短中文能力名，4~8 字，如"网页抓取"、"任务调度"
   - level：base / composite / application
   - domain：所属领域，2~6 字，如"数据采集"、"任务调度"
   - description：一句话说明这个能力做什么，不超过 30 字
2. needs：项目需要但自己没有提供的能力，1~3 个，必须至少给 1 个。
   站在"这个项目要变强，还缺什么能力"的角度想，不要写"不需要"。
   只写能力名（中文字符串），不写其他字段。
3. 只输出 JSON，不要任何解释文字。

level 判定规则：
- base：基础能力，不依赖其他能力，如"HTTP 请求"、"文件读写"、"文本解析"
- composite：复合能力，由多个基础能力组合而成，如"网页抓取" = HTTP + DOM 解析
- application：完整应用级能力，如"自动化测试平台"、"文档问答系统"

输出 JSON 格式（严格遵守）：
{
  "provides": [
    {"name": "网页抓取", "level": "composite", "domain": "数据采集", "description": "从网页提取结构化数据"}
  ],
  "needs": ["反爬对抗", "任务调度"]
}`

/**
 * 构建用户 prompt（README 截断到 README_EXCERPT_LIMIT）。
 * @param {{name?: string, description?: string, stack?: string[], readmeExcerpt?: string}} project
 */
export function buildCapabilityPrompt(project = {}) {
  const lines = []
  lines.push(`项目名：${project.name ?? ''}`)
  if (project.description) lines.push(`描述：${project.description}`)
  if (Array.isArray(project.stack) && project.stack.length > 0) {
    lines.push(`技术栈：${project.stack.join(', ')}`)
  }
  if (project.readmeExcerpt) {
    lines.push('', 'README 摘录：', String(project.readmeExcerpt).slice(0, README_EXCERPT_LIMIT))
  }
  return lines.join('\n')
}

/**
 * 校验 LLM 返回的能力提取结果（对畸形输入全兜底，不抛错）。
 * @param {unknown} raw
 * @returns {{provides: object[], needs: string[]}}
 */
export function validateCapabilityExtraction(raw) {
  const provides = Array.isArray(raw?.provides)
    ? raw.provides
        .filter((c) => c
          && typeof c.name === 'string'
          && c.name.trim().length > 0
          && typeof c.level === 'string'
          && CAP_VALID_LEVELS.has(c.level))
        .slice(0, CAP_MAX_PROVIDES)
        .map((c) => ({
          name: c.name.trim(),
          level: c.level,
          domain: typeof c.domain === 'string' ? c.domain.trim() : '',
          description: typeof c.description === 'string' ? c.description.trim() : '',
        }))
    : []

  const needs = Array.isArray(raw?.needs)
    ? raw.needs
        .filter((n) => typeof n === 'string' && n.trim().length > 0)
        .slice(0, CAP_MAX_NEEDS)
        .map((n) => n.trim())
    : []

  return { provides, needs }
}

// ══════════════════════════════════════════════════════════════════
// 3) 图谱构建
// ══════════════════════════════════════════════════════════════════

/**
 * 构建项目图谱（纯函数，确定性输出）。
 * @param {object[]} projects
 * @param {object[]} [capabilities=[]]
 * @param {object[]} [projectCaps=[]]
 * @param {object[]} [projectRelations=[]]
 * @param {string} [rootPath='']
 * @param {{now?: () => number}} [opts]
 */
export function buildProjectGraph(
  projects,
  capabilities = [],
  projectCaps = [],
  projectRelations = [],
  rootPath = '',
  opts = {},
) {
  const now = opts.now ?? (() => Date.now())
  const list = Array.isArray(projects) ? projects : []
  const caps = Array.isArray(capabilities) ? capabilities : []

  const projectIds = new Set(list.map((p) => p?.id))
  const capabilityIds = new Set(caps.map((c) => c?.id))

  // 能力边：只保留端点都存在的关联
  const capabilityEdges = []
  for (const link of Array.isArray(projectCaps) ? projectCaps : []) {
    if (!projectIds.has(link?.projectId)) continue
    if (!capabilityIds.has(link?.capabilityId)) continue
    capabilityEdges.push({
      id: `pc-${link.projectId}-${link.capabilityId}`,
      source: link.projectId,
      target: link.capabilityId,
      type: 'provides',
      confidence: null,
      reason: null,
    })
  }

  // 项目关系：过滤端点不存在的
  const validRelations = (Array.isArray(projectRelations) ? projectRelations : [])
    .filter((r) => r && projectIds.has(r.source) && projectIds.has(r.target))

  // 结构边：由能力边推导出的"项目间共享能力"（原实现 edges 恒空，此处补全）
  const edges = deriveProjectEdges(list, capabilityEdges)

  return {
    nodes: list,
    edges,
    capabilities: caps,
    capabilityEdges,
    projectRelations: validRelations,
    metadata: {
      scannedAt: now(),
      rootPath,
      version: GRAPH_VERSION,
      nodeCount: list.length,
      edgeCount: edges.length,
    },
  }
}

/**
 * 由能力边推导项目间关系边。
 * 两个项目共享 >= 1 项能力 → shares_stack 边（reason 记录共享数）。
 */
export function deriveProjectEdges(projects, capabilityEdges) {
  const byProject = new Map()
  for (const e of capabilityEdges) {
    if (!byProject.has(e.source)) byProject.set(e.source, new Set())
    byProject.get(e.source).add(e.target)
  }

  const edges = []
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i]?.id
      const b = projects[j]?.id
      const sa = byProject.get(a)
      const sb = byProject.get(b)
      if (!sa || !sb) continue
      const shared = [...sa].filter((c) => sb.has(c))
      if (shared.length === 0) continue
      edges.push({
        id: `pe-${a}-${b}`,
        source: a,
        target: b,
        type: 'shares_stack',
        confidence: null,
        reason: `共享 ${shared.length} 项能力`,
        sharedCapabilities: shared,
      })
    }
  }
  return edges
}