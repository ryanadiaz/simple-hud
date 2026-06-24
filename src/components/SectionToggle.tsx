interface Props {
  checked: boolean
  onChange: (v: boolean) => void
}

export function SectionToggle({ checked, onChange }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none',
        checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-light)]',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
          'transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
