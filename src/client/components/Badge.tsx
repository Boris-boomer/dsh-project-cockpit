import type { FC, ReactNode } from 'react'
import { useTheme } from '../theme-context'

export type BadgeTone = 'good' | 'warn' | 'bad' | 'info' | 'purple' | 'orange'

export const Badge: FC<{ tone: BadgeTone; children: ReactNode }> = ({ tone, children }) => {
  const t = useTheme()
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    good: { bg: t.goodSoft, fg: t.good },
    warn: { bg: t.warnSoft, fg: t.warn },
    bad: { bg: t.badSoft, fg: t.bad },
    info: { bg: t.infoSoft, fg: t.info },
    purple: { bg: t.purpleSoft, fg: t.purple },
    orange: { bg: t.orangeSoft, fg: t.orange },
  }
  const s = map[tone]
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, background: s.bg, color: s.fg,
    }}>
      {children}
    </span>
  )
}