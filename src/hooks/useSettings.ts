import { useState, useCallback } from 'react'
import type { ReticleStyle } from '../glass/shared'

export type { ReticleStyle }

export interface Settings {
  weatherEnabled: boolean
  micEnabled: boolean
  showDecibels: boolean
  reticleEnabled: boolean
  reticleStyle: ReticleStyle
}

const DEFAULTS: Settings = {
  weatherEnabled: false,
  micEnabled: false,
  showDecibels: true,
  reticleEnabled: false,
  reticleStyle: 'cross',
}

const STORAGE_KEY = 'hud-settings'

function load(): Settings {
  let settings: Settings = { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // ignore
  }

  return settings
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(load)

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return { settings, setSettings }
}
