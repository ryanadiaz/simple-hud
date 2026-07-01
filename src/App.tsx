import { useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { AppShell } from 'even-toolkit/web'

// Hooks
import { useClock, formatTime12 } from './hooks/useClock'
import { useWeather } from './hooks/useWeather'
import { useMicStream } from './hooks/useMicStream'
import { useDecibels } from './hooks/useDecibels'
import { useServerBridge } from './hooks/useServerBridge'
import { useSettings } from './hooks/useSettings'
import { useHudGlasses } from './hooks/useHudGlasses'

// Components
import { ClockWidget } from './components/ClockWidget'
import { WeatherWidget } from './components/WeatherWidget'
import { DecibelWidget } from './components/DecibelWidget'

function Home() {
  const time = useClock()
  const weather = useWeather()
  const { settings, setSettings } = useSettings()

  const mic = useMicStream()
  const { db } = useDecibels(mic.active)

  useServerBridge((_msg) => {})

  // mic always loads as OFF (enforced in useSettings), so this effect only ever
  // fires on user-initiated toggles — never on mount. No bridge race condition.
  useEffect(() => {
    if (settings.micEnabled) mic.start()
    else mic.stop()
  }, [settings.micEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useHudGlasses({
    timeStr: formatTime12(time),
    clockEnabled: settings.clockEnabled,
    weather: settings.weatherEnabled ? weather.weather : null,
    locationKnown: settings.weatherEnabled ? !!weather.location : false,
    db,
    micActive: mic.active,
    showDecibels: settings.showDecibels,
    weatherEnabled: settings.weatherEnabled,
  })

  return (
    <AppShell header={null}>
      <div className="px-3 pt-4 pb-8 space-y-3">
        <p className="text-xs italic text-[var(--color-text-muted)] px-1">
          Double-tap the glasses touchpad to exit
        </p>

        <ClockWidget
          time={time}
          enabled={settings.clockEnabled}
          onToggle={(v) => setSettings({ clockEnabled: v })}
        />

        <WeatherWidget
          {...weather}
          enabled={settings.weatherEnabled}
          onToggle={(v) => setSettings({ weatherEnabled: v })}
        />

        <DecibelWidget
          db={db}
          active={mic.active}
          enabled={settings.micEnabled}
          onToggle={(v) => {
            setSettings({ micEnabled: v })
            if (v) mic.start(); else mic.stop()
          }}
          error={mic.error}
          mode={mic.mode}
          onReset={() => mic.restart()}
          showDecibels={settings.showDecibels}
          onShowDecibelsToggle={(v) => setSettings({ showDecibels: v })}
        />
      </div>
    </AppShell>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/*" element={<Home />} />
    </Routes>
  )
}
