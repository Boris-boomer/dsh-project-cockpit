import { useCallback, useEffect, useState } from 'react'
import type { FC } from 'react'
import { useTheme } from './theme-context'
import { SETTINGS_NS } from './rpc'
import type { ClientCtx } from './types'

export function createSettingsCard(ctx: ClientCtx): FC {
  return function SettingsCard() {
    const t = useTheme()
    const [snap, setSnap] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      let cancelled = false
      ;(async () => {
        try {
          const response = await ctx.remote.settings.describe()
          if (!cancelled && response?.ok) {
            const ns = response.value.namespaces?.find((c: any) => c.ns === SETTINGS_NS)
            setSnap(ns?.value ?? {})
          }
        } catch (e) {
          console.warn('[cockpit] settings read failed', e)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => { cancelled = true }
    }, [])

    const write = useCallback(async (key: string, value: unknown) => {
      try {
        const response = await ctx.remote.settings.describe()
        const ns = response?.ok
          ? response.value.namespaces?.find((c: any) => c.ns === SETTINGS_NS)
          : undefined
        await ctx.remote.settings.update(SETTINGS_NS, { [key]: value }, ns?.revision)
      } catch (e) {
        console.warn('[cockpit] settings write failed', e)
      }
    }, [])

    const field = (key: string) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 90, color: t.muted }}>{key}</span>
        <input
          value={String(snap[key] ?? '')}
          onChange={(e) => {
            const v = e.currentTarget.value
            setSnap((p) => ({ ...p, [key]: v }))
            write(key, v)
          }}
          style={{
            flex: 1, padding: '3px 6px', borderRadius: 4,
            border: `1px solid ${t.border}`, background: t.bg, color: t.text,
          }}
        />
      </div>
    )

    return (
      <div>
        {loading
          ? <span style={{ color: t.muted }}>加载中…</span>
          : (<>{field('rootPath')}{field('baseURL')}</>)}
      </div>
    )
  }
}