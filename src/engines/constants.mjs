/**
 * engines/constants.mjs —— 全引擎共享常量（单一事实来源）
 *
 * 原来散落在五个兄弟包里（GapForm 的权重表、CodeConstellation 的忽略目录、
 * cost 的场景比例…），内联后集中在此，避免各引擎各写一份漂移。
 */

// ── GapForm：六维匹配权重 ────────────────────────────────────────
/** 六维权重，合计必须 = 1.0（有判据测试守护） */
export const MATCH_WEIGHTS = Object.freeze({
  capability: 0.40,
  barrier: 0.15,
  time: 0.10,
  resource: 0.05,
  credibility: 0.15,
  compound: 0.15,
})

/** capability 低于此值 → 一票否决（kill），不进入加权 */
export const CAPABILITY_KILL_THRESHOLD = 0.5
/** 需求关键词覆盖率阈值：达到才算"该能力覆盖了此需求" */
export const COVERAGE_THRESHOLD = 0.6

/** 通用词黑名单（几乎任何项目都能命中，按低权重计） */
export const GENERIC_KEYWORDS = Object.freeze(new Set([
  '服务', 'http', 'api', 'cli', '异步', '缓存',
  '配置', '配置文', '配置文件', '解析', '处理', '数据处理',
  '日志', '测试', '文件', '文件处', '文件处理', '代码',
  '代码分析', '分析', '索引', '数据', '接口', '请求',
  '响应', '命令', '命令行', '应用', '程序', '工具', '系统',
  '框架', '库', '模块', '组件', '功能', '支持',
]))

/** 需求侧关键词 → 能力侧同义词扩展 */
export const REQ_TO_CAP_SYNONYMS = Object.freeze({
  mcp: ['mcp', '适配器', 'mcp服务', 'mcpserver'],
  集成: ['集成', '适配器', '客户端'],
  api: ['api', '接口'],
  sdk: ['sdk', '客户端'],
  微调: ['微调', 'llm', '推理', '训练'],
  推理: ['推理', 'llm'],
  向量: ['向量', 'embedding'],
  检索: ['检索', '索引'],
  爬虫: ['爬取', '抓取', '爬虫'],
  蒸馏: ['蒸馏', '蒸馏器'],
  提取: ['提取', '提取器'],
  综合: ['综合', '综合器'],
  校验: ['校验', '校验器', '验证'],
  测试框: ['测试', 'pytest'],
  测试: ['pytest', 'unittest', '断言'],
  插件: ['插件', '扩展', 'plugin'],
  工作流: ['工作流', '管线', 'pipeline', '编排'],
  文档: ['文档', '渲染', 'render', '生成'],
  合并: ['评审', 'review', 'pr'],
  开源: ['开源', 'github', 'pr'],
  部署: ['部署', '容器', 'docker'],
})

export const RESOURCE_HEAVY_KEYWORDS = Object.freeze([
  '硬件', '设备', 'gpu', '算力', '服务器', '集群', '数据集', '预算', '资金', '团队', '人力', '多人',
])
export const BARRIER_KEYWORDS = Object.freeze([
  '门槛', '资质', '报名', '经验', '年限', '学历', '竞赛', '比赛', '评奖', '评审',
])
export const CREDIBILITY_KEYWORDS = Object.freeze([
  '官方', '开源', '社区', '知名', '大厂', '公开', '已验证', '有案例', '历史', '往届',
])

/** 机会类型的门槛/可信基础分 */
export const TYPE_BARRIER_BASE = Object.freeze({
  competition: 0.55, bounty: 0.75, grant: 0.60, rfp: 0.50,
})
export const TYPE_CREDIBILITY_BASE = Object.freeze({
  competition: 0.55, bounty: 0.65, grant: 0.55, rfp: 0.60,
})

/** 通用能力名（评分时降权，因为这些词汇缺乏区分度） */
export const GENERIC_CAPABILITY_NAMES = Object.freeze(new Set([
  'HTTP / API 服务', '数据库存储', 'LLM / AI 推理', 'CLI / 命令行工具',
  '配置文件解析', '数据处理 / 分析', '认证 / 安全', '缓存', '文件处理',
  '代码分析 / 索引', '外部 API 集成', '测试', '日志', '网络爬虫 / 抓取', '异步任务 / 并发',
]))

// ── ShipSignal：信号真实性 ──────────────────────────────────────
export const VERIFIABILITY_SCORE = Object.freeze({ high: 1.0, medium: 0.6, low: 0.3 })

/** 综合分权重（付费信号占主导，对齐原 Rust mod.rs） */
export const SIGNAL_WEIGHTS = Object.freeze({
  verifiability: 0.30,
  payment: 0.45,
  nonAnomaly: 0.25,
})
/** 置信度阈值 */
export const CONFIDENCE_THRESHOLDS = Object.freeze({ high: 0.72, medium: 0.45 })
/** 时间序列相邻跳变倍率超过此值 → 命中 time_series_jump */
export const TIME_SERIES_JUMP_RATIO = 3.0
/** 每个显式异常标记的扣分与上限 */
export const ANOMALY_FLAG_PENALTY = 0.15
export const ANOMALY_FLAG_MAX = 0.45
/** 时间序列异常分对总异常的贡献权重 */
export const TIME_SERIES_WEIGHT = 0.25

// ── ai_cost_calculator：场景与成本 ──────────────────────────────
/** 使用场景预设：输入:输出 token 比例 */
export const SCENES = Object.freeze({
  chat: { label: '聊天对话', ratio: [1, 1] },
  rag: { label: 'RAG/检索', ratio: [5, 1] },
  codegen: { label: '代码生成', ratio: [1, 3] },
  summarize: { label: '文档总结', ratio: [10, 1] },
})

/** 成本默认参数（集中，便于一处调整） */
export const COST_DEFAULTS = Object.freeze({
  gpuRatio: 0.8,
  lifespanYears: 3,
  powerWatts: 450,
  tokensPerSecond: 30,
  pricePerKwh: 0.6,
  roi: 1,
  fallbackHardwareCost: 200000,
})

/** 回本建议阈值（天） */
export const BREAKEVEN_THRESHOLDS = Object.freeze({
  strong: 30, consider: 90, judge: 365,
})

// ── CodeConstellation：扫描与图谱 ───────────────────────────────
export const IGNORE_DIRS = Object.freeze([
  'node_modules', '.pnpm', '.yarn', '.next', '.nuxt', '.turbo', '.parcel-cache',
  'dist', 'build', 'out', 'coverage',
  '.venv', 'venv', 'ENV', 'env', 'virtualenv', '.tox', '.nox',
  '.pytest_cache', '.mypy_cache', '.ruff_cache', '__pycache__', 'site-packages', '.eggs',
  '.git', '.hg', '.svn', '.idea', '.vscode',
  'target', 'vendor', '.gradle', 'bin', 'obj',
  '.cache', '.tmp', 'tmp',
])

export const IGNORE_PATH_SEGMENTS = Object.freeze(['site-packages', 'node_modules', '.venv'])

export const WORKSPACE_MARKERS = Object.freeze([
  'pnpm-workspace.yaml', 'lerna.json', 'rush.json', 'nx.json',
])

export const EDGE_STYLES = Object.freeze({
  depends_on: { color: '#888888', lineStyle: 'solid', layer: 'project' },
  similar_to: { color: '#3b82f6', lineStyle: 'dashed', layer: 'project' },
  reusable_as: { color: '#22c55e', lineStyle: 'dotted', layer: 'project' },
  duplicates: { color: '#ef4444', lineStyle: 'dashed', layer: 'project' },
  shares_stack: { color: '#d1d5db', lineStyle: 'solid', layer: 'project' },
  calls: { color: '#f97316', lineStyle: 'solid', layer: 'internal' },
  data_flow: { color: '#a855f7', lineStyle: 'dashed', layer: 'internal' },
})

export const PROJECT_RELATION_STYLES = Object.freeze({
  combine: { color: '#a855f7', lineStyle: 'solid', label: '可组合' },
  overlap: { color: '#f97316', lineStyle: 'dashed', label: '能力重叠' },
})

export const MAX_3D_NODES = 200
export const MAX_2D_NODES = 500
export const EMBEDDING_DIM = 768
export const README_EXCERPT_LIMIT = 800
export const GRAPH_VERSION = '0.4.0'
export const SCAN_DEFAULT_MAX_DEPTH = 20
export const CAP_VALID_LEVELS = Object.freeze(new Set(['base', 'composite', 'application']))
export const CAP_MAX_PROVIDES = 6
export const CAP_MAX_NEEDS = 3

/** 流水线阶段（顺序即执行顺序） */
export const PIPELINE_STAGES = Object.freeze(['match', 'signal', 'cost', 'graph'])

/** 判定等级（有序，供降级/比较） */
export const VERDICTS = Object.freeze(['kill', 'pivot', 'iterate', 'proceed'])