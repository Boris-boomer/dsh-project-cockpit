import { createContext, useContext, useEffect, useState } from 'react'
import type { FC, ReactNode } from 'react'
import { detectPrefersDark, resolveTokens } from './theme'
import type { ThemeMode, ThemeTokens } from './theme'

const ThemeContext = createContext<ThemeTokens>(lightTokensFallback())

function lightTokensFallback(): ThemeTokens {
  // 延迟求值避免在模块初始化时读到 lightTokens 之前的值
  return resolveTokens('light', false)
}

export const ThemeProvider: FC<{ mode: ThemeMode; children: ReactNode }> = ({ mode, children }) => {
  const [prefersDark, setPrefersDark] = useState(detectPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const tokens = resolveTokens(mode, prefersDark)
  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext)
}