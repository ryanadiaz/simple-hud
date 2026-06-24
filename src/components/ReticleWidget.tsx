import { Card } from 'even-toolkit/web'
import { SectionToggle } from './SectionToggle'
import type { ReticleStyle } from '../hooks/useSettings'

interface Props {
  enabled: boolean
  onToggle: (v: boolean) => void
  style: ReticleStyle
  onStyleChange: (s: ReticleStyle) => void
}

const STYLES: { value: ReticleStyle; label: string; char: string }[] = [
  { value: 'cross',    label: 'Cross',    char: '┼' },
  { value: 'circle',   label: 'Circle',   char: '○' },
  { value: 'bullseye', label: 'Bullseye', char: '◎' },
  { value: 'diamond',  label: 'Diamond',  char: '◆' },
]

export function ReticleWidget({ enabled, onToggle, style, onStyleChange }: Props) {
  return (
    <Card>
      <div className="px-4 py-4 space-y-3">

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Reticle
          </span>
          <SectionToggle checked={enabled} onChange={onToggle} />
        </div>

        <div className={enabled ? '' : 'opacity-40 pointer-events-none select-none'}>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => onStyleChange(s.value)}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors',
                  style === s.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                <span className="text-xl leading-none font-mono">{s.char}</span>
                <span className="text-sm">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </Card>
  )
}
