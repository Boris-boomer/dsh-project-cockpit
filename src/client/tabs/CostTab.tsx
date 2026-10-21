import { useEffect } from 'react'
import type { FC } from 'react'
import { useTheme } from '../theme-context'
import { useCockpit } from '../store'
import type { CockpitStore } from '../store'
import { callRpc } from '../rpc'
import { useRpc } from '../hooks/useRpc'
import { Badge } from '../components/Badge'
import { MetricCard } from '../components/MetricCard'
import { OutError } from '../components/OutError'

const FALLBACK_MODELS = [
  { key: '2', name: 'DeepSeek-R1-Distill-Qwen-7B', api_price: 2.5, ref_cost: 2000, ref_hardware: 'RTX 3060 8G + 16G RAM' },
  { key: '7', name: 'DeepSeek-V4-Flash', api_price: 2.0, ref_cost: null, ref_hardware: '需API调用' },
  { key: '17', name: 'GPT-5.5 (OpenAI)', api_price: 210.0, ref_cost: null, ref_hardware: '需API调用' },
]
const FALLBACK_CAREERS = [
  { key: '1', name: '初级开发者', desc: '实习生/应届/1-2年', daily_default: 500 },
  { key: '2', name: '中级开发者', desc: '3-5年经验', daily_default: 5000 },
  { key: '3', name: '高级开发者', desc: '架构师/专家', daily_default: 20000 },
  { key: '4', name: '重度AI用户', desc: 'AI Native/Agent', daily_default: 100000 },
]
const FALLBACK_SCENES = [
  { key: 'chat', label: '聊天对话' },
  { key: 'rag', label: 'RAG/检索' },
  { key: 'codegen', label: '代码生成' },
  { key: 'summarize', label: '文档总结' },
]

const cardStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px',
})
const labelStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  fontSize: 12, color: t.muted, display: 'block', marginBottom: 3,
})
const inputStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${t.border}`,
  fontSize: 12, boxSizing: 'border-box', background: t.bg, color: t.text,
})

function fmt(n: number): string {
  if (!isFinite(n)) return '∞'
  return n >= 100 ? Math.round(n).toLocaleString() : Number(n.toFixed(2)).toString()
}

export const CostTab: FC<{ store: CockpitStore }> = ({ store }) => {
  const t = useTheme()
  const params = useCockpit(store, (s) => s.costParams)

  const meta = useRpc(() => callRpc<any>('meta', {}))
  const cost = useRpc(() =>
    callRpc<any>('cost', {
      modelKey: params.modelKey,
      scene: params.scene,
      careerKey: params.careerKey,
      hardwareCost: Number(params.hardwareCost) || undefined,
      roi: Number(params.roi) || undefined,
      lifespanYears: Number(params.lifespanYears) || undefined,
    }),
  )

  useEffect(() => { meta.run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const models = Array.isArray(meta.data?.models) ? meta.data.models : FALLBACK_MODELS
  const careers = Array.isArray(meta.data?.careers) ? meta.data.careers : FALLBACK_CAREERS
  const scenes = Array.isArray(meta.data?.scenes) ? meta.data.scenes : FALLBACK_SCENES

  const selectedModel = models.find((m: any) => m.key === params.modelKey)
  const result = cost.data?.result
  const inf = result?.daysToBreakEven === Infinity || result?.daysToBreakEven == null
  const levelTone: any = { strong: 'good', consider: 'warn', judge: 'warn', warn: 'bad' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={cardStyle(t)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>
          本地部署 vs API 回本分析
        </div>
        <label style={labelStyle(t)}>模型</label>
        <select
          style={inputStyle(t)}
          value={params.modelKey}
          onChange={(e) => {
            const key = e.currentTarget.value
            const m = models.find((x: any) => x.key === key)
            store.updateSlice('costParams', {
              modelKey: key,
              ...(m?.ref_cost ? { hardwareCost: String(m.ref_cost) } : {}),
            })
          }}
        >
          {models.map((m: any) => <option key={m.key} value={m.key}>{m.name}</option>)}
          {models.length === 0 && <option value="2">加载中…</option>}
        </select>
        {selectedModel && (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>
            API ¥{selectedModel.api_price}/百万Token · {selectedModel.ref_hardware}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
          <div>
            <label style={labelStyle(t)}>使用场景</label>
            <select style={inputStyle(t)} value={params.scene} onChange={(e) => store.updateSlice('costParams', { scene: e.currentTarget.value })}>
              {scenes.map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>开发者水平</label>
            <select style={inputStyle(t)} value={params.careerKey} onChange={(e) => store.updateSlice('costParams', { careerKey: e.currentTarget.value })}>
              {careers.map((c: any) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
          <div>
            <label style={labelStyle(t)}>硬件总价 ¥</label>
            <input style={inputStyle(t)} type="number" value={params.hardwareCost} onChange={(e) => store.updateSlice('costParams', { hardwareCost: e.currentTarget.value })} />
          </div>
          <div>
            <label style={labelStyle(t)}>投入产出倍率</label>
            <input style={inputStyle(t)} type="number" step="0.1" value={params.roi} onChange={(e) => store.updateSlice('costParams', { roi: e.currentTarget.value })} />
          </div>
          <div>
            <label style={labelStyle(t)}>折旧年限</label>
            <input style={inputStyle(t)} type="number" value={params.lifespanYears} onChange={(e) => store.updateSlice('costParams', { lifespanYears: e.currentTarget.value })} />
          </div>
        </div>
      </div>

      <button
        onClick={() => cost.run()}
        disabled={cost.loading}
        style={{
          padding: '9px 0', borderRadius: 6, border: `1px solid ${t.primary}`,
          color: t.primary, background: t.primarySoft, fontSize: 13,
          cursor: cost.loading ? 'not-allowed' : 'pointer', fontWeight: 700,
        }}
      >
        {cost.loading ? '计算中…' : '💰 成本回本分析'}
      </button>
      <OutError error={cost.error} />

      {result && result.error ? (
        <div style={{ color: t.bad, fontSize: 12 }}>⚠ {result.error}</div>
      ) : result ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{result.model?.name}</span>
            <Badge tone={levelTone[result.recommendation?.level] ?? 'info'}>{result.recommendation?.text}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <MetricCard
              label="回本周期"
              value={inf ? '∞' : `${Math.round(result.daysToBreakEven)} 天`}
              sub={inf ? '本地部署不划算' : result.daysToBreakEven <= 30 ? '强烈推荐' : '按业务判断'}
              color={inf ? t.bad : result.daysToBreakEven <= 90 ? t.good : t.warn}
            />
            <MetricCard label="回本需用Token" value={`${fmt(result.millionNeeded)}M`} sub="每日消耗折算" />
            <MetricCard label="每日API费用" value={`¥${fmt(result.dailyApiCost)}`} sub="含 ROI 折算" color={t.primary} />
            <MetricCard label="每日本地成本" value={`¥${fmt(result.dailyLocalCost)}`} sub="电费+折旧" />
            <MetricCard label="每月节省" value={`¥${fmt(result.monthlySaving)}`} sub={result.monthlySaving > 0 ? '本地 vs API' : '暂无节省'} color={result.monthlySaving > 0 ? t.good : t.muted} />
            <MetricCard label="加权单价" value={`¥${fmt(result.weightedPrice)}`} sub="百万Token" />
          </div>
          <div style={cardStyle(t)}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>明细</div>
            <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.6 }}>
              每日电费 ¥{fmt(result.dailyElectricity)} · 每日折旧 ¥{fmt(result.dailyDepreciation)} · 场景 {scenes.find((s: any) => s.key === params.scene)?.label}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}