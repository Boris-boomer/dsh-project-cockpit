import { useState } from 'react'
import type { FC } from 'react'
import { useTheme } from './theme-context'
import type { CockpitStore } from './store'
import { OrchestrateTab } from './tabs/OrchestrateTab'
import { MatchTab } from './tabs/MatchTab'
import { CostTab } from './tabs/CostTab'
import { SignalTab } from './tabs/SignalTab'
import { GraphTab } from './tabs/GraphTab'

const TABS = [
  { key: 'orchestrate', label: '🧭 编排' },
  { key: 'match', label: '🎯 选题' },
  { key: 'cost', label: '💰 成本' },
  { key: 'signal', label: '📡 信号' },
  { key: 'graph', label: '🌌 图谱' },
] as const

type TabKey = typeof TABS[number]['key']

export const Panel: FC<{ store: CockpitStore }> = ({ store }) => {
  const t = useTheme()
  const [tab, setTab] = useState<TabKey>('orchestrate')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map((tt) => (
          <button
            key={tt.key}
            onClick={() => setTab(tt.key)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              border: tab === tt.key ? `1px solid ${t.primary}` : `1px solid ${t.border}`,
              background: tab === tt.key ? t.primarySoft : t.bg,
              color: tab === tt.key ? t.primary : t.muted,
            }}
          >
            {tt.label}
          </button>
        ))}
      </div>
      {tab === 'orchestrate' && <OrchestrateTab store={store} />}
      {tab === 'match' && <MatchTab store={store} />}
      {tab === 'cost' && <CostTab store={store} />}
      {tab === 'signal' && <SignalTab store={store} />}
      {tab === 'graph' && <GraphTab store={store} />}
    </div>
  )
}