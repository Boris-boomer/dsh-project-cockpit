import { useState } from 'react'
import type { FC } from 'react'
import { useTheme } from '../theme-context'
import { useCockpit } from '../store'
import type { CockpitStore } from '../store'
import { MATCH_TYPES } from '../constants'
import { callRpc } from '../rpc'
import { useRpc } from '../hooks/useRpc'
import { Bar } from '../components/Bar'
import { Badge } from '../components/Badge'
import { OutError } from '../components/OutError'
import { Row } from '../components/Row'

const cardStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px',
})
const sectionTitleStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted,
  textTransform: 'uppercase', marginBottom: 6,
})
const labelStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  fontSize: 12, color: t.muted, display: 'block', marginBottom: 3,
})
const inputStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${t.border}`,
  fontSize: 12, boxSizing: 'border-box', background: t.bg, color: t.text,
})

export const MatchTab: FC<{ store: CockpitStore }> = ({ store }) => {
  const t = useTheme()
  const opportunity = useCockpit(store, (s) => s.opportunity)
  const capabilities = useCockpit(store, (s) => s.capabilities)
  const match = useRpc(() =>
    callRpc<any>('match', {
      opportunity,
      project: { id: 1, name: 'ai-workflow' },
      capabilities,
    }),
  )

  const [reqText, setReqText] = useState('')
  const [capName, setCapName] = useState('')
  const [capDesc, setCapDesc] = useState('')

  function addRequirement() {
    if (!reqText.trim()) return
    store.updateSlice('opportunity', {
      requirements: [...opportunity.requirements, { category: 'ability', text: reqText.trim() }],
    })
    setReqText('')
  }
  function addCap() {
    if (!capName.trim()) return
    store.setState((s) => ({
      ...s,
      capabilities: [...s.capabilities, { name: capName.trim(), description: capDesc.trim(), real: true }],
    }))
    setCapName('')
    setCapDesc('')
  }

  const result = match.data?.match
  const verdictTone = result?.verdict === 'proceed' ? 'good' : result?.verdict === 'iterate' ? 'warn' : 'bad'
  const verdictLabel = ({ proceed: '✅ 推进', iterate: '🔁 迭代', pivot: '🔄 转向', kill: '⛔ 否决' } as any)[result?.verdict as string] ?? result?.verdict

  const dims = result
    ? [
        { key: 'capability', label: '能力', color: t.primary },
        { key: 'barrier', label: '门槛', color: t.purple },
        { key: 'time', label: '时间', color: t.orange },
        { key: 'resource', label: '资源', color: t.warn },
        { key: 'credibility', label: '可信', color: t.good },
        { key: 'compound', label: '复合', color: t.info },
      ]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={cardStyle(t)}>
        <div style={sectionTitleStyle(t)}>机会</div>
        <Row gap={6}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle(t)}>名称</label>
            <input
              style={inputStyle(t)}
              value={opportunity.name}
              onChange={(e) => store.updateSlice('opportunity', { name: e.currentTarget.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle(t)}>类型</label>
            <select
              style={inputStyle(t)}
              value={opportunity.type}
              onChange={(e) => store.updateSlice('opportunity', { type: e.currentTarget.value as any })}
            >
              {MATCH_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
            </select>
          </div>
        </Row>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle(t)}>截止日期</label>
            <input
              style={inputStyle(t)}
              type="date"
              value={opportunity.deadline}
              onChange={(e) => store.updateSlice('opportunity', { deadline: e.currentTarget.value })}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle(t)}>来源链接</label>
            <input
              style={inputStyle(t)}
              value={opportunity.source_url}
              onChange={(e) => store.updateSlice('opportunity', { source_url: e.currentTarget.value })}
            />
          </div>
        </div>

        <div style={{ marginTop: 6 }}>
          <label style={labelStyle(t)}>能力需求（requirements）</label>
          <Row gap={6}>
            <input
              style={inputStyle(t)}
              placeholder="如：需要 MCP 适配能力"
              value={reqText}
              onChange={(e) => setReqText(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addRequirement() }}
            />
            <button
              onClick={addRequirement}
              style={{
                padding: '6px 12px', borderRadius: 6, border: `1px solid ${t.border}`,
                color: t.text, background: t.bg, cursor: 'pointer', fontSize: 12,
              }}
            >
              ＋ 添加
            </button>
          </Row>
          {opportunity.requirements.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {opportunity.requirements.map((r, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: t.infoSoft, color: t.info, borderRadius: 999,
                  padding: '2px 10px', fontSize: 12,
                }}>
                  {r.text}
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => store.updateSlice('opportunity', {
                      requirements: opportunity.requirements.filter((_, j) => j !== i),
                    })}
                  >✕</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={cardStyle(t)}>
        <div style={sectionTitleStyle(t)}>项目能力（capabilities，real 勾选）</div>
        {capabilities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
            {capabilities.map((c, i) => (
              <Row key={i} gap={8}>
                <span style={{ width: 110, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ flex: 1, fontSize: 11, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</span>
                <input
                  type="checkbox"
                  checked={!!c.real}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked
                    store.setState((s) => ({
                      ...s,
                      capabilities: s.capabilities.map((x, j) => (j === i ? { ...x, real: checked } : x)),
                    }))
                  }}
                />
                <span
                  style={{ cursor: 'pointer', fontSize: 12, color: t.muted }}
                  onClick={() => store.setState((s) => ({ ...s, capabilities: s.capabilities.filter((_, j) => j !== i) }))}
                >✕</span>
              </Row>
            ))}
          </div>
        )}
        <Row gap={6}>
          <input style={{ ...inputStyle(t), flex: 1 }} placeholder="能力名，如：MCP 适配器" value={capName} onChange={(e) => setCapName(e.currentTarget.value)} />
          <input style={{ ...inputStyle(t), flex: 2 }} placeholder="一句话说明" value={capDesc} onChange={(e) => setCapDesc(e.currentTarget.value)} />
          <button
            onClick={addCap}
            style={{
              padding: '6px 12px', borderRadius: 6, border: `1px solid ${t.border}`,
              color: t.text, background: t.bg, cursor: 'pointer', fontSize: 12,
            }}
          >＋</button>
        </Row>
      </div>

      <button
        onClick={() => match.run()}
        disabled={match.loading}
        style={{
          padding: '9px 0', borderRadius: 6, border: `1px solid ${t.primary}`,
          color: t.primary, background: t.primarySoft, fontSize: 13,
          cursor: match.loading ? 'not-allowed' : 'pointer', fontWeight: 700,
        }}
      >
        {match.loading ? '评分中…' : '🎯 六维匹配评分'}
      </button>
      <OutError error={match.error} />

      {result && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>综合匹配 {Math.round((result.matchScore ?? 0) * 100)}%</span>
            <Badge tone={verdictTone}>{verdictLabel}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {dims.map((d) => (
              <div key={d.key} style={cardStyle(t)}>
                <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>{d.label}</div>
                <Bar value={result[d.key] ?? 0} color={d.color} />
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, color: d.color }}>{Math.round((result[d.key] ?? 0) * 100)}%</div>
              </div>
            ))}
          </div>
          {result.recommendedWeapon && (
            <div style={cardStyle(t)}>
              <div style={sectionTitleStyle(t)}>推荐武器</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>🛠 {result.recommendedWeapon}</div>
            </div>
          )}
          {result.firstStep && (
            <div style={{ background: t.primarySoft, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: t.primary }}>
              <b>第一步：</b>{result.firstStep}
            </div>
          )}
          {result.gaps?.length > 0 && (
            <div style={cardStyle(t)}>
              <div style={sectionTitleStyle(t)}>能力差距</div>
              {result.gaps.map((g: string, i: number) => (
                <div key={i} style={{ fontSize: 12, padding: '2px 0', color: t.warn }}>▸ {g}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}