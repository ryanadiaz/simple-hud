import { Card } from 'even-toolkit/web'
import { SectionToggle } from './SectionToggle'
import type { HealthData } from '../hooks/useHealth'

interface Props {
  health: HealthData | null
  enabled: boolean
  onToggle: (v: boolean) => void
}

const STEP_GOAL = 10_000
const CAL_GOAL = 600

function Progress({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100)
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden bg-[var(--color-surface-light)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function HealthWidget({ health, enabled, onToggle }: Props) {
  return (
    <Card>
      <div className="px-4 py-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Activity
          </span>
          <SectionToggle checked={enabled} onChange={onToggle} />
        </div>

        {/* Content */}
        <div className={enabled ? '' : 'opacity-40 pointer-events-none select-none'}>
          {!health ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No health data yet. Send via iOS Shortcuts.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-[var(--color-text-muted)]">Steps</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">
                    {health.steps.toLocaleString()}
                    <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">
                      / {STEP_GOAL.toLocaleString()}
                    </span>
                  </span>
                </div>
                <Progress value={health.steps} goal={STEP_GOAL} color="var(--color-accent)" />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-[var(--color-text-muted)]">Active Cal</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">
                    {health.calories}
                    <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">
                      / {CAL_GOAL} kcal
                    </span>
                  </span>
                </div>
                <Progress value={health.calories} goal={CAL_GOAL} color="var(--color-positive)" />
              </div>
            </div>
          )}
        </div>

      </div>
    </Card>
  )
}
