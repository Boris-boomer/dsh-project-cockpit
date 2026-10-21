import type { FC } from 'react'
import { useTheme } from '../theme-context'

export const Bar: FC<{ value: number; color?: string; height?: number }> = ({ value, color, height = 10 }) => {
  const t = useTheme()
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div style={{ background: t.border, borderRadius: 5, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color ?? t.primary, transition: 'width .3s ease' }} />
    </div>
  )
}