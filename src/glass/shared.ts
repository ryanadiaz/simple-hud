import type { WeatherData } from '../hooks/useWeather'

export type { WeatherData }

export interface HudSnapshot {
  timeStr: string
  clockEnabled: boolean
  weather: WeatherData | null
  /** True once the user has granted GPS or entered a city — gates weather display on glasses */
  locationKnown: boolean
  db: number | null
  micActive: boolean
  showDecibels: boolean
  weatherEnabled: boolean
}

export interface AppActions {
  navigate: (path: string) => void
}
