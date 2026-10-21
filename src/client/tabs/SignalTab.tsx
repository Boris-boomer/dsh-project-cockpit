import type { FC } from 'react'
import { useTheme } from '../theme-context'
import { useCockpit } from '../store'
import type { CockpitStore } from '../store'
import { callRpc } from '../rpc'
import { useRpc } from '../hooks/useRpc'
import { Bar } from '../components/Bar'
import { Badge } from '../components/Badge'
import { OutError } from '../components/OutError'
import { Row } from '../components/Row'

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

export const SignalTab: FC<{ store: CockpitStore }> = ({ store }) => {
  const t = useTheme()
  const input = useCockpit(store, (s) => s.signalInput)
  const signal = useRpc(() => {
    const parsed = input.series.split(/[,，\s]+/).map((s) => Number(s.trim())).filter((n) => !isNaN(n))
    return callRpc<any>('signal', {
      sourceVerifiability: input.sourceVerifiability,
      paymentSignalPresent: input.paymentSignalPresent,
      anomalyFlags: input.anomaly ? ['manual_flag'] : [],
      timeSeries: parsed.length >= 2 ? parsed : undefined,
    })
  })

  const result = signal.data?.assessment
  const tone = result?.suggestedConfidence === 'high' ? 'good' : result?.suggestedConfidence === 'medium' ? 'warn' : 'bad'
  const confLabel = ({ high: '高可信', medium: '中可信', low: '低可信' } as any)[result?.suggestedConfidence as string] ?? ''
  const scoreColor = tone === 'good' ? t.good : tone === 'warn' ? t.warn : t.bad

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={cardStyle(t)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>
          信号真实性评估
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <label style={labelStyle(t)}>来源可验证性</label>
            <select
              style={inputStyle(t)}
              value={input.sourceVerifiability}
              onChange={(e) => store.updateSlice('signalInput', { sourceVerifiability: e.currentTarget.value as any })}
            >
              <option value="high">高 · 官方/开源</option>
              <option value="medium">中 · 社区</option>
              <option value="low">低 · 匿名</option>
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>真实付费信号</label>
            <button
              onClick={() => store.updateSlice('signalInput', { paymentSignalPresent: !input.paymentSignalPresent })}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${input.paymentSignalPresent ? t.good : t.border}`,
                color: input.paymentSignalPresent ? t.good : t.muted,
                background: input.paymentSignalPresent ? t.goodSoft : t.bg,
              }}
            >
              {input.paymentSignalPresent ? '✅ 有' : '⬜ 无'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={labelStyle(t)}>时间序列（逗号分隔）</label>
          <input
            style={inputStyle(t)}
            value={input.series}
            onChange={(e) => store.updateSlice('signalInput', { series: e.currentTarget.value })}
          />
        </div>
        <Row gap={8} style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={input.anomaly}
            onChange={(e) => store.updateSlice('signalInput', { anomaly: e.currentTarget.checked })}
          />
          <span style={{ fontSize: 12, color: t.muted }}>额外异常标记（manual_flag）</span>
        </Row>
      </div>

      <button
        onClick={() => signal.run()}
        disabled={signal.loading}
        style={{
          padding: '9px 0', borderRadius: 6, border: `1px solid ${t.primary}`,
          color: t.primary, background: t.primarySoft, fontSize: 13,
          cursor: signal.loading ? 'not-allowed' : 'pointer', fontWeight: 700,
        }}
      >
        {signal.loading ? '评估中…' : '📡 信号真实性评分'}
      </button>
      <OutError error={signal.error} />

      {result && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>综合得分</span>
            <Badge tone={tone}>{confLabel}</Badge>
          </div>
          <div style={cardStyle(t)}>
            <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor }}>{Math.round((result.raw ?? 0) * 100)}%</div>
            <div style={{ marginTop: 6 }}><Bar value={result.raw ?? 0} color={scoreColor} height={12} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
              <div style={cardStyle(t)}>
                <div style={{ fontSize: 11, color: t.muted }}>来源分</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{Math.round((result.verifiabilityScore ?? 0) * 100)}%</div>
              </div>
              <div style={cardStyle(t)}>
                <div style={{ fontSize: 11, color: t.muted }}>异常分</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{Math.round((result.anomalyScore ?? 0) * 100)}%</div>
              </div>
            </div>
          </div>
          {result.reasons?.length > 0 && (
            <div style={cardStyle(t)}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>判据理由</div>
              {result.reasons.map((r: string, i: number) => (
                <div key={i} style={{ fontSize: 12, padding: '2px 0' }}>• {r}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}