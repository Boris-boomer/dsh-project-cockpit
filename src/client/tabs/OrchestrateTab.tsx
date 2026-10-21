import type { FC } from 'react'
import { useTheme } from '../theme-context'
import { useCockpit } from '../store'
import type { CockpitStore } from '../store'
import { MATCH_TYPES } from '../constants'
import { callRpc } from '../rpc'
import { useRpc } from '../hooks/useRpc'
import { Badge } from '../components/Badge'
import { MetricCard } from '../components/MetricCard'
import { OutError } from '../components/OutError'
import { GraphCanvas } from '../components/GraphCanvas'

const inputStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: `1px solid ${t.border}`,
  fontSize: 12,
  boxSizing: 'border-box',
  background: t.bg,
  color: t.text,
})

export const OrchestrateTab: FC<{ store: CockpitStore }> = ({ store }) => {
  const t = useTheme()
  const opportunity = useCockpit(store, (s) => s.opportunity)
  const capabilities = useCockpit(store, (s) => s.capabilities)
  const pipeline = useRpc(() =>
    callRpc<any>('pipeline', {
      opportunity,
      project: { id: 'p-main', name: 'ai-workflow' },
      capabilities,
    }),
  )

  const card = pipeline.data?.decisionCard
  const graph = pipeline.data?.graph
  const stages = pipeline.data?.stages
  const verdictTone: any = { proceed: 'good', iterate: 'warn', pivot: 'orange', kill: 'bad' }
  const reqText = opportunity.requirements[0]?.text ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>
          一次输入 → 四引擎串联（评分 → 信号 → 成本 → 图谱）
        </div>
        <label style={{ fontSize: 12, color: t.muted, display: 'block', marginBottom: 3 }}>机会名称</label>
        <input
          value={opportunity.name}
          onChange={(e) => store.updateSlice('opportunity', { name: e.currentTarget.value })}
          style={inputStyle(t)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
          <div>
            <label style={{ fontSize: 12, color: t.muted, display: 'block', marginBottom: 3 }}>类型</label>
            <select
              value={opportunity.type}
              onChange={(e) => store.updateSlice('opportunity', { type: e.currentTarget.value as any })}
              style={inputStyle(t)}
            >
              {MATCH_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: t.muted, display: 'block', marginBottom: 3 }}>能力需求</label>
            <input
              value={reqText}
              onChange={(e) => store.updateSlice('opportunity', {
                requirements: [{ category: 'ability', text: e.currentTarget.value }],
              })}
              style={inputStyle(t)}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => pipeline.run()}
        disabled={pipeline.loading}
        style={{
          padding: '9px 0', borderRadius: 6, border: `1px solid ${t.primary}`,
          color: t.primary, background: t.primarySoft, fontSize: 13,
          cursor: pipeline.loading ? 'not-allowed' : 'pointer', fontWeight: 700,
        }}
      >
        {pipeline.loading ? '流水线执行中…' : '🧭 跑完整评估流水线'}
      </button>
      <OutError error={pipeline.error} />

      {stages && (
        <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>阶段耗时</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {stages.map((s: any) => (
              <Badge key={s.stage} tone={s.ok ? 'good' : 'bad'}>
                {s.stage} {s.ok ? `${s.ms}ms` : '失败'}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {card && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>决策卡</span>
            <Badge tone={verdictTone[card.verdict] ?? 'info'}>{card.verdict}</Badge>
          </div>
          <div style={{ background: t.primarySoft, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: t.primary }}>
            {card.advice}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <MetricCard label="匹配分" value={`${Math.round(card.matchScore * 100)}%`} sub="来自 GapForm" color={t.primary} />
            <MetricCard
              label="信号可信"
              value={({ high: '高', medium: '中', low: '低' } as any)[card.confidence] ?? '—'}
              sub={`raw ${card.signalRaw == null ? '—' : Math.round(card.signalRaw * 100) + '%'}`}
              color={card.confidence === 'high' ? t.good : card.confidence === 'medium' ? t.warn : t.bad}
            />
            <MetricCard
              label="回本周期"
              value={card.cost?.daysToBreakEven == null || card.cost.daysToBreakEven === Infinity ? '∞' : `${Math.round(card.cost.daysToBreakEven)} 天`}
              sub={card.cost?.model ?? '—'}
            />
            <MetricCard label="每月节省" value={card.cost ? `¥${Math.round(card.cost.monthlySaving ?? 0).toLocaleString()}` : '—'} sub={card.cost?.scene ?? ''} />
          </div>
          <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>推荐武器 & 缺口</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>🛠 {card.recommendedWeapon || '—'}</div>
            {card.gaps?.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {card.gaps.map((g: string, i: number) => <div key={i} style={{ fontSize: 12, color: t.warn }}>▸ {g}</div>)}
              </div>
            )}
            {card.notes?.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: t.muted }}>
                {card.notes.map((n: string, i: number) => <div key={i}>· {n}</div>)}
              </div>
            )}
          </div>
        </>
      )}

      {graph && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <GraphCanvas data={graph} />
          <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
            {graph.nodes?.length ?? 0} 节点 · {graph.projectRelations?.length ?? 0} 关系边
          </div>
        </div>
      )}
    </div>
  )
}