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
import { ReticleWidget } from './components/ReticleWidget'

function Home() {
  const time = useClock()
  const weather = useWeather()
  const { settings, setSettings } = useSettings()

  const mic = useMicStream()
  const { db } = useDecibels(mic.active)

  useServerBridge((_msg) => {})

  useEffect(() => {
    if (!settings.micEnabled && mic.active) mic.stop()
  }, [settings.micEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useHudGlasses({
    timeStr: formatTime12(time),
    weather: settings.weatherEnabled ? weather.weather : null,
    locationKnown: settings.weatherEnabled ? !!weather.location : false,
    db,
    micActive: mic.active,
    showDecibels: settings.showDecibels,
    weatherEnabled: settings.weatherEnabled,
    reticleEnabled: settings.reticleEnabled,
    reticleStyle: settings.reticleStyle,
  })

  return (
    <AppShell header={null}>
      <div className="px-3 pt-4 pb-8 space-y-3">
        <ClockWidget time={time} />

        <WeatherWidget
          {...weather}
          enabled={settings.weatherEnabled}
          onToggle={(v) => setSettings({ weatherEnabled: v })}
        />

        <DecibelWidget
          db={db}
          active={mic.active}
          enabled={settings.micEnabled}
          onToggle={(v) => { setSettings({ micEnabled: v }); if (v) mic.start(); else mic.stop() }}
          error={mic.error}
          mode={mic.mode}
          showDecibels={settings.showDecibels}
          onShowDecibelsToggle={(v) => setSettings({ showDecibels: v })}
        />

        <ReticleWidget
          enabled={settings.reticleEnabled}
          onToggle={(v) => setSettings({ reticleEnabled: v })}
          style={settings.reticleStyle}
          onStyleChange={(s) => setSettings({ reticleStyle: s })}
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
