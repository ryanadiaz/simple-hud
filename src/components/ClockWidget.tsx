import { Card } from 'even-toolkit/web'
import { formatTime12, formatDate } from '../hooks/useClock'

interface Props {
  time: Date
}

export function ClockWidget({ time }: Props) {
  const [timeStr, period] = splitPeriod(formatTime12(time))

  return (
    <Card>
      <div className="px-4 py-5 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl font-bold tabular-nums tracking-tight text-[var(--color-text)]">
            {timeStr}
          </span>
          <span className="text-2xl font-semibold text-[var(--color-text-dim)]">{period}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{formatDate(time)}</p>
      </div>
    </Card>
  )
}

function splitPeriod(formatted: string): [string, string] {
  const parts = formatted.split(' ')
  if (parts.length === 2) return [parts[0], parts[1]]
  return [formatted, '']
}
