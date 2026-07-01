import { Card, Button, Input, Loading } from 'even-toolkit/web'
import { SectionToggle } from './SectionToggle'
import type { WeatherState } from '../hooks/useWeather'

type Props = WeatherState & {
  enabled: boolean
  onToggle: (v: boolean) => void
}

export function WeatherWidget({
  weather,
  location,
  error,
  loading,
  cityInput,
  setCityInput,
  autoDetect,
  searchCity,
  reset,
  enabled,
  onToggle,
}: Props) {
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (cityInput.trim()) searchCity(cityInput.trim())
  }

  return (
    <Card>
      <div className="px-4 py-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Weather
            </span>
          </div>
          <div className="flex items-center gap-3">
            {enabled && location && (
              <button
                onClick={reset}
                className="text-xs text-[var(--color-text-muted)] hover:opacity-70"
              >
                ↺ GPS
              </button>
            )}
            <SectionToggle checked={enabled} onChange={onToggle} />
          </div>
        </div>

        {/* Content */}
        <div className={enabled ? '' : 'opacity-40 pointer-events-none select-none'}>

          {!location && !loading && (
            <>
              {error && (
                <p className="text-sm text-[var(--color-negative)]">{error}</p>
              )}
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="City or Zip Code (e.g. Austin or 78704)"
                  className="flex-1 text-sm"
                />
                <Button type="submit" size="sm" variant="highlight">
                  Go
                </Button>
              </form>
              <Button size="sm" variant="secondary" onClick={autoDetect} className="w-full" style={{ marginTop: '10px' }}>
                📍 Use my location
              </Button>
            </>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loading />
            </div>
          )}

          {weather && location && !loading && (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[var(--color-text)]">
                    {weather.temp}°F
                  </span>
                  <span className="text-3xl">{weather.emoji}</span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-text-dim)]">
                  {weather.condition}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Feels like {weather.feelsLike}°F
                </p>
              </div>
              <p className="text-right text-xs text-[var(--color-text-muted)] max-w-[120px]">
                {location.label}
              </p>
            </div>
          )}

        </div>
      </div>
    </Card>
  )
}
