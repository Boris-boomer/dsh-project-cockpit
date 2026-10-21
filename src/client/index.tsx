/**
 * dsh-project-cockpit · Client 入口（浏览器半）。
 *
 * 资源所有权：所有 DOM 节点、React root、icon 注册、settings slot 都通过
 * ctx.effect 注册 disposer，HMR / dispose 时自动清理，无手动 ctx.on('dispose')。
 */

import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { ThemeProvider } from './theme-context'
import { FloatingPanel } from './components/FloatingPanel'
import { Panel } from './Panel'
import { createCockpitStore } from './store'
import { createSettingsCard } from './slots'
import { REGISTRY_ID } from './rpc'
import type { ClientCtx, Disposer } from './types'

export const inject = ['slots', 'remote', 'remote.settings']

export function apply(ctx: ClientCtx): void {
  if (typeof window === 'undefined') return

  const store = createCockpitStore()

  // 浮动容器（React root 的宿主）+ root 一起管理，dispose 时 unmount 再 remove。
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  ctx.effect(() => {
    const el = document.createElement('div')
    el.style.display = 'none'
    document.body.appendChild(el)
    container = el
    root = createRoot(el)
    return () => {
      try { root?.unmount() } catch { /* noop */ }
      root = null
      el.remove()
      container = null
    }
  }, 'cockpit:root')

  let panelVisible = false

  function renderPanelContent(): void {
    if (!root || !container) return
    root.render(
      <ThemeProvider mode="auto">
        <FloatingPanel
          title="🛰️ 项目驾驶舱"
          onClose={() => {
            panelVisible = false
            if (container) container.style.display = 'none'
          }}
        >
          <Panel store={store} />
        </FloatingPanel>
      </ThemeProvider>,
    )
  }

  function togglePanel(): void {
    if (!container) return
    panelVisible = !panelVisible
    if (panelVisible) {
      renderPanelContent()
      container.style.display = 'block'
    } else {
      container.style.display = 'none'
    }
  }

  // 图标注册：按 id 去重，disposer 里清理自己那条。
  ctx.effect(() => {
    const registry = ((window as any).__dshIconRegistry ??= []) as any[]
    const entry = {
      id: REGISTRY_ID,
      icon: '🛰️',
      label: '项目驾驶舱',
      onClick: togglePanel,
    }
    const dup = registry.findIndex((e: any) => e.id === entry.id)
    if (dup >= 0) registry.splice(dup, 1)
    registry.push(entry)
    return () => {
      const i = registry.findIndex((e: any) => e.id === entry.id)
      if (i >= 0) registry.splice(i, 1)
    }
  }, 'cockpit:icon')

  // 设置卡片：注册到 settings.plugin.item slot。
  ctx.effect(() => {
    try {
      const SettingsCard = createSettingsCard(ctx)
      const dispose = ctx.slots?.render?.('settings.plugin.item', SettingsCard)
      return () => {
        try { (dispose as Disposer | undefined)?.() } catch { /* noop */ }
      }
    } catch (e) {
      console.warn('[cockpit] settings slot failed', e)
      return () => {}
    }
  }, 'cockpit:settings')
}