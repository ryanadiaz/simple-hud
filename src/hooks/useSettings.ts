import { useState, useCallback } from 'react'

export interface Settings {
  clockEnabled: boolean
  weatherEnabled: boolean
  micEnabled: boolean
  showDecibels: boolean
}

const DEFAULTS: Settings = {
  clockEnabled: true,
  weatherEnabled: false,
  micEnabled: false,
  showDecibels: true,
}

const STORAGE_KEY = 'hud-settings-v2'

function load(): Settings {
  let settings: Settings = { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // ignore
  }

  return { ...settings, clockEnabled: true, micEnabled: false }
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
