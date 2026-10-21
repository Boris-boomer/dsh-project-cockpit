import { useState } from 'react'
import type { FC } from 'react'
import { useTheme } from '../theme-context'
import { useCockpit } from '../store'
import type { CockpitStore } from '../store'
import { callRpc } from '../rpc'
import { useRpc } from '../hooks/useRpc'
import { OutError } from '../components/OutError'
import { Row } from '../components/Row'
import { GraphCanvas } from '../components/GraphCanvas'

const cardStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px',
})
const labelStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  fontSize: 12, color: t.muted, display: 'block', marginBottom: 3,
})
const inputStyle = (t: ReturnType<typeof useTheme>): React.CSSProperties => ({
  width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${t.border}`,
  fontSize: 12, boxSizing: 'border-box', background: t.bg, color: t.text,
})

export const GraphTab: FC<{ store: CockpitStore }> = ({ store }) => {
  const t = useTheme()
  const projects = useCockpit(store, (s) => s.projects)
  const relations = useCockpit(store, (s) => s.relations)
  const rootPath = useCockpit(store, (s) => s.rootPath)

  const [files, setFiles] = useState<string[] | null>(null)
  const scan = useRpc(() => callRpc<any>('scan', { rootPath }))
  const graph = useRpc(() =>
    callRpc<any>('graph', {
      projects,
      capabilities: [],
      projectCaps: [],
      projectRelations: relations,
      rootPath,
    }),
  )

  async function doScan() {
    const r = await scan.run()
    if (r.ok) setFiles(r.data.files ?? [])
    else setFiles(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={cardStyle(t)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>扫描 &amp; 构建</div>
        <label style={labelStyle(t)}>根目录</label>
        <Row gap={6}>
          <input
            style={inputStyle(t)}
            value={rootPath}
            onChange={(e) => store.setState((s) => ({ ...s, rootPath: e.currentTarget.value }))}
          />
          <button
            onClick={doScan}
            disabled={scan.loading}
            style={{
              padding: '6px 14px', borderRadius: 6, border: `1px solid ${t.primary}`,
              color: t.primary, background: t.primarySoft, fontSize: 12, cursor: 'pointer',
            }}
          >
            {scan.loading ? '…' : '扫描'}
          </button>
        </Row>
        {scan.error && <OutError error={scan.error} />}
        {files != null && (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 4, maxHeight: 60, overflow: 'auto' }}>
            {files.length} 个文件：{files.slice(0, 6).join(' · ')}
          </div>
        )}
      </div>

      <div style={cardStyle(t)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>项目节点</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {projects.map((p, i) => (
            <Row key={p.id} gap={6}>
              <input
                style={{ ...inputStyle(t), flex: 1 }}
                value={p.name}
                onChange={(e) => store.setState((s) => ({
                  ...s,
                  projects: s.projects.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value } : x)),
                }))}
              />
              <span style={{ fontSize: 11, color: t.muted, width: 40 }}>stack</span>
              <input
                style={{ ...inputStyle(t), width: 80 }}
                value={p.stack.join(',')}
                onChange={(e) => store.setState((s) => ({
                  ...s,
                  projects: s.projects.map((x, j) => (j === i ? { ...x, stack: e.currentTarget.value.split(',').filter(Boolean) } : x)),
                }))}
              />
              <span
                style={{ cursor: 'pointer', fontSize: 12, color: t.muted }}
                onClick={() => store.setState((s) => ({ ...s, projects: s.projects.filter((_, j) => j !== i) }))}
              >✕</span>
            </Row>
          ))}
        </div>
        <button
          onClick={() => store.setState((s) => ({
            ...s,
            projects: [...s.projects, { id: `p${Date.now()}`, name: '新项目', path: '', stack: [], tags: [], summary: '' }],
          }))}
          style={{
            marginTop: 6, padding: '4px 10px', borderRadius: 6, border: `1px solid ${t.border}`,
            color: t.text, background: t.bg, cursor: 'pointer', fontSize: 12,
          }}
        >
          ＋ 添加项目
        </button>
      </div>

      <div style={cardStyle(t)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.muted, textTransform: 'uppercase', marginBottom: 6 }}>项目关系</div>
        {relations.map((r, i) => (
          <Row key={r.id} gap={6} style={{ marginBottom: 4 }}>
            <input
              style={{ ...inputStyle(t), flex: 1 }}
              value={r.source}
              onChange={(e) => store.setState((s) => ({
                ...s,
                relations: s.relations.map((x, j) => (j === i ? { ...x, source: e.currentTarget.value } : x)),
              }))}
            />
            <span style={{ fontSize: 11, color: t.muted }}>→</span>
            <input
              style={{ ...inputStyle(t), flex: 1 }}
              value={r.target}
              onChange={(e) => store.setState((s) => ({
                ...s,
                relations: s.relations.map((x, j) => (j === i ? { ...x, target: e.currentTarget.value } : x)),
              }))}
            />
            <select
              style={{ ...inputStyle(t), width: 90 }}
              value={r.type}
              onChange={(e) => store.setState((s) => ({
                ...s,
                relations: s.relations.map((x, j) => (j === i ? { ...x, type: e.currentTarget.value as any } : x)),
              }))}
            >
              <option value="combine">combine</option>
              <option value="overlap">overlap</option>
            </select>
            <span
              style={{ cursor: 'pointer', fontSize: 12, color: t.muted }}
              onClick={() => store.setState((s) => ({ ...s, relations: s.relations.filter((_, j) => j !== i) }))}
            >✕</span>
          </Row>
        ))}
        <button
          onClick={() => store.setState((s) => ({
            ...s,
            relations: [...s.relations, { id: `r${Date.now()}`, source: 'p1', target: 'p2', type: 'combine', confidence: 0.7, reason: '' }],
          }))}
          style={{
            marginTop: 4, padding: '4px 10px', borderRadius: 6, border: `1px solid ${t.border}`,
            color: t.text, background: t.bg, cursor: 'pointer', fontSize: 12,
          }}
        >
          ＋ 添加关系
        </button>
      </div>

      <button
        onClick={() => graph.run()}
        disabled={graph.loading}
        style={{
          padding: '9px 0', borderRadius: 6, border: `1px solid ${t.primary}`,
          color: t.primary, background: t.primarySoft, fontSize: 13,
          cursor: graph.loading ? 'not-allowed' : 'pointer', fontWeight: 700,
        }}
      >
        {graph.loading ? '构建中…' : '🌌 构建星座图谱'}
      </button>
      <OutError error={graph.error} />

      {graph.data?.graph && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <GraphCanvas data={graph.data.graph} />
          <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
            {graph.data.graph.nodes?.length ?? 0} 节点 · {graph.data.graph.projectRelations?.length ?? 0} 关系边
          </div>
        </div>
      )}
    </div>
  )
}