/**
 * GraphCanvas —— Canvas 2D 力导向图谱。
 *
 * 布局：斥力（O(n²)，≤500 节点可接受）+ 弹簧（边）+ 中心引力 + 阻尼。
 * 渲染：Canvas 2D，dpr 自适应，节点圆形 + 文本标签，边按类型着色。
 * 模拟：requestAnimationFrame 驱动，alpha 衰减到 0.02 停止。
 *
 * 相比原 SVG 圆环布局：节点不再固定重叠，规模上去后仍可读。
 */
import { useEffect, useRef } from 'react'
import type { FC } from 'react'
import { useTheme } from '../theme-context'

export interface GraphNode {
  id: string
  name?: string
}

export interface GraphEdge {
  source: string
  target: string
  type?: string
  confidence?: number
}

export interface GraphData {
  nodes?: GraphNode[]
  projectRelations?: GraphEdge[]
  capabilityEdges?: GraphEdge[]
}

interface SimNode {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
}

interface SimEdge {
  source: string
  target: string
  type?: string
  confidence?: number
}

const WIDTH = 460
const HEIGHT = 340
const NODE_RADIUS = 15

function toLabel(n: GraphNode): string {
  return String(n.name ?? n.id ?? '?').slice(0, 10)
}

function buildSim(data: GraphData): { nodes: SimNode[]; edges: SimEdge[] } {
  const rawNodes = data.nodes ?? []
  const count = Math.max(1, rawNodes.length)
  const nodes: SimNode[] = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / count
    return {
      id: n.id,
      label: toLabel(n),
      x: Math.cos(angle) * 80,
      y: Math.sin(angle) * 80,
      vx: 0,
      vy: 0,
    }
  })
  const edges: SimEdge[] = [
    ...(data.projectRelations ?? []).map((e) => ({
      source: e.source, target: e.target, type: e.type, confidence: e.confidence,
    })),
    ...(data.capabilityEdges ?? []).map((e) => ({
      source: e.source, target: e.target, type: 'provides', confidence: 0.5,
    })),
  ]
  return { nodes, edges }
}

function tick(nodes: SimNode[], edges: SimEdge[], alpha: number): void {
  // 斥力
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist2 = dx * dx + dy * dy
      if (dist2 < 1) {
        dx = (Math.random() - 0.5) * 2
        dy = (Math.random() - 0.5) * 2
        dist2 = dx * dx + dy * dy
      }
      const dist = Math.sqrt(dist2)
      const force = 2000 / dist2
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx * alpha
      a.vy -= fy * alpha
      b.vx += fx * alpha
      b.vy += fy * alpha
    }
  }
  // 弹簧
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const e of edges) {
    const a = byId.get(e.source)
    const b = byId.get(e.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const force = (dist - 90) * 0.02
    const fx = (dx / dist) * force * alpha
    const fy = (dy / dist) * force * alpha
    a.vx += fx
    a.vy += fy
    b.vx -= fx
    b.vy -= fy
  }
  // 中心引力 + 阻尼
  for (const n of nodes) {
    n.vx += -n.x * 0.002 * alpha
    n.vy += -n.y * 0.002 * alpha
    n.vx *= 0.85
    n.vy *= 0.85
    n.x += n.vx
    n.y += n.vy
  }
}

export const GraphCanvas: FC<{ data: GraphData; emptyHint?: string }> = ({
  data,
  emptyHint = '（空图谱 — 先添加项目并扫描）',
}) => {
  const t = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { nodes, edges } = buildSim(data)
    if (nodes.length === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    canvas.style.width = `${WIDTH}px`
    canvas.style.height = `${HEIGHT}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let alpha = 1
    let raf: number | null = null

    function draw(): void {
      if (!ctx) return
      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      ctx.save()
      ctx.translate(WIDTH / 2, HEIGHT / 2)

      const byId = new Map(nodes.map((n) => [n.id, n]))

      for (const e of edges) {
        const a = byId.get(e.source)
        const b = byId.get(e.target)
        if (!a || !b) continue
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        if (e.type === 'combine' || e.type === 'shares_stack') {
          ctx.strokeStyle = t.purple
          ctx.setLineDash([])
        } else if (e.type === 'overlap') {
          ctx.strokeStyle = t.orange
          ctx.setLineDash([4, 3])
        } else {
          ctx.strokeStyle = t.border
          ctx.setLineDash([])
        }
        ctx.lineWidth = 1 + (e.confidence ?? 0.5) * 2
        ctx.stroke()
      }
      ctx.setLineDash([])

      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, NODE_RADIUS, 0, 2 * Math.PI)
        ctx.fillStyle = t.text
        ctx.fill()
        ctx.strokeStyle = t.muted
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = t.bg
        ctx.font = '10px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.label, n.x, n.y)
      }
      ctx.restore()
    }

    function loop(): void {
      if (alpha > 0.02) {
        tick(nodes, edges, alpha)
        alpha *= 0.98
        draw()
        raf = requestAnimationFrame(loop)
      } else {
        draw()
        raf = null
      }
    }

    loop()

    return () => {
      if (raf != null) cancelAnimationFrame(raf)
      raf = null
    }
  }, [data, t])

  const isEmpty = !data?.nodes || data.nodes.length === 0
  if (isEmpty) return <div style={{ color: t.muted, fontSize: 12 }}>{emptyHint}</div>

  return <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
}