import type { FC } from 'react'
import { useTheme } from '../theme-context'

export const OutError: FC<{ error?: string | null }> = ({ error }) => {
  const t = useTheme()
  if (!error) return null
  return <div style={{ color: t.bad, fontSize: 12, marginTop: 4 }}>⚠ {error}</div>
}