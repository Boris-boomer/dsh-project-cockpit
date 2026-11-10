/**
 * dsh-project-cockpit · Client 入口（浏览器半）。
 *
 * 资源所有权：所有 DOM 节点、React root、icon 注册、settings slot、独立入口按钮
 * 都通过 ctx.effect 注册 disposer，HMR / dispose 时自动清理，无手动 ctx.on('dispose')。
 *
 * 独立入口：右下角悬浮按钮不依赖 dsh-icon-grid；同时保留 __dshIconRegistry 注册，
 * 装了图标网格的宿主会多一个入口，没装也能通过悬浮按钮打开面板。
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

const LAUNCHER_LABEL = '打开项目驾驶舱'

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

  // 独立入口：右下角悬浮按钮（不依赖 dsh-icon-grid）。
  ctx.effect(() => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = '🛰️'
    btn.title = '项目驾驶舱'
    btn.setAttribute('aria-label', LAUNCHER_LABEL)
    btn.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      'width:44px',
      'height:44px',
      'border-radius:50%',
      'border:1px solid rgba(0,0,0,0.12)',
      'background:#4f46e5',
      'color:#fff',
      'font-size:20px',
      'line-height:1',
      'padding:0',
      'cursor:pointer',
      'box-shadow:0 4px 12px rgba(0,0,0,0.25)',
      'z-index:999998',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';')

    const onClick = (): void => togglePanel()
    btn.addEventListener('click', onClick)
    document.body.appendChild(btn)

    return () => {
      btn.removeEventListener('click', onClick)
      btn.remove()
    }
  }, 'cockpit:launcher')

  // 图标注册：按 id 去重，disposer 里清理自己那条。
  // 装了 dsh-icon-grid 的宿主会消费该注册表；未装时由上面的悬浮按钮兜底。
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