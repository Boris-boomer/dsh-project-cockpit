import type { FC, ReactNode } from 'react'
import type { CSSProperties } from 'react'

export const Row: FC<{ children: ReactNode; gap?: number; style?: CSSProperties }> = ({ children, gap = 6, style }) => (
  <div style={{ display: 'flex', gap, alignItems: 'center', ...style }}>{children}</div>
)