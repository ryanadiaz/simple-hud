import { Card } from 'even-toolkit/web'
import { formatTime12, formatDate } from '../hooks/useClock'
import { SectionToggle } from './SectionToggle'

interface Props {
  time: Date
  enabled: boolean
  onToggle: (v: boolean) => void
  hidden?: boolean
}

export function ClockWidget({ time, enabled, onToggle, hidden }: Props) {
  const [timeStr, period] = splitPeriod(formatTime12(time))

  return (
    <Card>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Clock
            </span>
            {hidden && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-negative)] text-white uppercase tracking-wide">
                Hidden
              </span>
            )}
          </div>
          <SectionToggle checked={enabled} onChange={onToggle} />
        </div>

        <div className={enabled ? '' : 'opacity-40 pointer-events-none select-none'}>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-[var(--color-text)]">
              {timeStr}
            </span>
            <span className="text-2xl font-semibold text-[var(--color-text-dim)]">{period}</span>
          </div>
          <p className="mt-1 text-sm text-center text-[var(--color-text-muted)]">{formatDate(time)}</p>
        </div>
      </div>
    </Card>
  )
}

function splitPeriod(formatted: string): [string, string] {
  const parts = formatted.split(' ')
  if (parts.length === 2) return [parts[0], parts[1]]
  return [formatted, '']
}
