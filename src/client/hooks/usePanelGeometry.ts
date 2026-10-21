import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface PanelGeometry {
  x: number
  y: number
  width: number
  height: number
}

const STORAGE_KEY = 'dsh-project-cockpit:geometry'
const MIN_WIDTH = 320
const MIN_HEIGHT = 240

function loadGeometry(): PanelGeometry | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw)
    if (typeof g.x === 'number' && typeof g.y === 'number'
      && typeof g.width === 'number' && typeof g.height === 'number') {
      return g
    }
  } catch { /* ignore */ }
  return null
}

function saveGeometry(g: PanelGeometry): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(g))
  } catch { /* ignore */ }
}

interface DragState {
  mode: 'move' | 'resize' | null
  startX: number
  startY: number
  orig: PanelGeometry
}

export function usePanelGeometry(initial: PanelGeometry) {
  const [geometry, setGeometry] = useState<PanelGeometry>(() => loadGeometry() ?? initial)
  const dragRef = useRef<DragState>({ mode: null, startX: 0, startY: 0, orig: geometry })

  useEffect(() => { saveGeometry(geometry) }, [geometry])

  const onHeaderPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    dragRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, orig: geometry }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [geometry])

  const onResizePointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    e.stopPropagation()
    dragRef.current = { mode: 'resize', startX: e.clientX, startY: e.clientY, orig: geometry }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [geometry])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d.mode) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.mode === 'move') {
      setGeometry({ ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy })
    } else {
      setGeometry({
        ...d.orig,
        width: Math.max(MIN_WIDTH, d.orig.width + dx),
        height: Math.max(MIN_HEIGHT, d.orig.height + dy),
      })
    }
  }, [])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current.mode) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
    }
    dragRef.current.mode = null
  }, [])

  return { geometry, onHeaderPointerDown, onResizePointerDown, onPointerMove, onPointerUp }
}