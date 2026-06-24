import type { WeatherData } from '../hooks/useWeather'

export type { WeatherData }

export type ReticleStyle = 'cross' | 'circle' | 'bullseye' | 'diamond'

export interface HudSnapshot {
  timeStr: string
  weather: WeatherData | null
  /** True once the user has granted GPS or entered a city — gates weather display on glasses */
  locationKnown: boolean
  db: number | null
  micActive: boolean
  showDecibels: boolean
  reticleEnabled: boolean
  reticleStyle: ReticleStyle
}

export interface AppActions {
  navigate: (path: string) => void
}
