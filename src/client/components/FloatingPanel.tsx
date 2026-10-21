import type { FC, ReactNode } from 'react'
import { useTheme } from '../theme-context'
import { usePanelGeometry } from '../hooks/usePanelGeometry'

export const FloatingPanel: FC<{ title: string; onClose: () => void; children: ReactNode }> = ({ title, onClose, children }) => {
  const t = useTheme()
  const { geometry, onHeaderPointerDown, onResizePointerDown, onPointerMove, onPointerUp } = usePanelGeometry({
    x: typeof window !== 'undefined' ? Math.max(24, window.innerWidth - 424) : 24,
    y: typeof window !== 'undefined' ? Math.max(24, window.innerHeight - 620) : 24,
    width: 400,
    height: 600,
  })

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: geometry.height,
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.24)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif, "PingFang SC", "Microsoft YaHei"',
        overflow: 'hidden',
        color: t.text,
        fontSize: 13,
      }}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        style={{
          padding: '10px 12px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span>{title}</span>
        <span
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ fontSize: 12, color: t.muted, cursor: 'pointer', padding: '0 4px' }}
        >
          ✕
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>{children}</div>
      <div
        onPointerDown={onResizePointerDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          background: `linear-gradient(135deg, transparent 50%, ${t.border} 50%)`,
        }}
      />
    </div>
  )
}