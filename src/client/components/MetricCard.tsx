import type { FC } from 'react'
import { useTheme } from '../theme-context'

export const MetricCard: FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color }) => {
  const t = useTheme()
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color ?? t.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}