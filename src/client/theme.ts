/**
 * 主题 token —— 亮/暗两套值，由 ThemeProvider 注入到组件树。
 * 所有组件只通过 useTheme() 读 token，不直接引用颜色字面量。
 */

export interface ThemeTokens {
  primary: string
  primarySoft: string
  text: string
  muted: string
  border: string
  bg: string
  cardBg: string
  good: string
  goodSoft: string
  warn: string
  warnSoft: string
  bad: string
  badSoft: string
  info: string
  infoSoft: string
  purple: string
  purpleSoft: string
  orange: string
  orangeSoft: string
}

export const lightTokens: ThemeTokens = {
  primary: '#4f46e5',
  primarySoft: '#eef2ff',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#ffffff',
  cardBg: '#f9fafb',
  good: '#16a34a',
  goodSoft: '#f0fdf4',
  warn: '#d97706',
  warnSoft: '#fffbeb',
  bad: '#dc2626',
  badSoft: '#fef2f2',
  info: '#2563eb',
  infoSoft: '#eff6ff',
  purple: '#7c3aed',
  purpleSoft: '#f5f3ff',
  orange: '#ea580c',
  orangeSoft: '#fff7ed',
}

export const darkTokens: ThemeTokens = {
  primary: '#818cf8',
  primarySoft: '#1e1b4b',
  text: '#f3f4f6',
  muted: '#9ca3af',
  border: '#374151',
  bg: '#111827',
  cardBg: '#1f2937',
  good: '#4ade80',
  goodSoft: '#052e16',
  warn: '#fbbf24',
  warnSoft: '#451a03',
  bad: '#f87171',
  badSoft: '#450a0a',
  info: '#60a5fa',
  infoSoft: '#172554',
  purple: '#a78bfa',
  purpleSoft: '#2e1065',
  orange: '#fb923c',
  orangeSoft: '#431407',
}

export type ThemeMode = 'light' | 'dark' | 'auto'

export function resolveTokens(mode: ThemeMode, prefersDark: boolean): ThemeTokens {
  if (mode === 'dark') return darkTokens
  if (mode === 'light') return lightTokens
  return prefersDark ? darkTokens : lightTokens
}

export function detectPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}