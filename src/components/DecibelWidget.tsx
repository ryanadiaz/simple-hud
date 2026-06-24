import { Card } from 'even-toolkit/web'
import { SectionToggle } from './SectionToggle'

interface Props {
  db: number | null
  active: boolean
  enabled: boolean
  onToggle: (v: boolean) => void
  error: string | null
  mode: 'g2' | 'browser' | null
  showDecibels: boolean
  onShowDecibelsToggle: (v: boolean) => void
}

const DB_MAX = 100

function dbToLabel(db: number): { label: string; color: string } {
  if (db < 40) return { label: 'Quiet', color: 'var(--color-positive)' }
  if (db < 65) return { label: 'Moderate', color: 'var(--color-accent)' }
  if (db < 85) return { label: 'Loud', color: 'var(--color-accent-warning)' }
  return { label: 'Very Loud', color: 'var(--color-negative)' }
}

export function DecibelWidget({
  db, active, enabled, onToggle,
  error, mode,
  showDecibels, onShowDecibelsToggle,
}: Props) {
  const pct = db !== null ? Math.min(100, (db / DB_MAX) * 100) : 0
  const { label, color } = db !== null
    ? dbToLabel(db)
    : { label: '—', color: 'var(--color-text-muted)' }

  return (
    <Card>
      <div className="px-4 py-4 space-y-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Microphone
            </span>
            {active && mode && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-surface-light)] text-[var(--color-text-muted)]">
                {mode === 'g2' ? 'G2' : 'Browser'}
              </span>
            )}
          </div>
          <SectionToggle checked={enabled} onChange={onToggle} />
        </div>

        {/* ── Content ── */}
        <div className={enabled ? '' : 'opacity-40 pointer-events-none select-none'}>

          {error && <p className="text-sm text-[var(--color-negative)]">{error}</p>}

          {/* Show on glasses sub-toggle */}
          <label className="flex items-center justify-between cursor-pointer py-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">Show sound level</span>
            <SectionToggle checked={showDecibels} onChange={onShowDecibelsToggle} />
          </label>

          {/* dB meter — always rendered to prevent layout shift on toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              {showDecibels && active ? (
                <>
                  <span className="text-3xl font-bold tabular-nums text-[var(--color-text)]">
                    {db !== null ? Math.round(db) : '—'}
                    <span className="ml-1 text-base font-normal text-[var(--color-text-dim)]">dB</span>
                  </span>
                  <span className="text-sm font-medium" style={{ color }}>{label}</span>
                </>
              ) : (
                <>
                  <div className="h-8 w-12 rounded-md bg-[var(--color-surface-light)]" />
                  <div className="h-4 w-16 rounded-md bg-[var(--color-surface-light)]" />
                </>
              )}
            </div>
            <div className="relative h-3 rounded-full overflow-hidden bg-[var(--color-surface-light)]">
              {showDecibels && active && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              )}
            </div>
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>0</span><span>40</span><span>65</span><span>85</span><span>100 dB</span>
            </div>
          </div>

        </div>
      </div>
    </Card>
  )
}
