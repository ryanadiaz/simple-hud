import type { WeatherData } from '../hooks/useWeather'

export type { WeatherData }

export type ReticleStyle = 'cross' | 'circle' | 'bullseye' | 'diamond'

export interface FunModeData {
  matchTimerStr: string
  weaponAmmoText: string
  hpArmorText: string
  compassStr: string
  threatStr: string
}

export interface HudSnapshot {
  timeStr: string
  clockEnabled: boolean
  hidden: boolean
  weather: WeatherData | null
  /** True once the user has granted GPS or entered a city — gates weather display on glasses */
  locationKnown: boolean
  db: number | null
  micActive: boolean
  showDecibels: boolean
  weatherEnabled: boolean
  reticleEnabled: boolean
  reticleStyle: ReticleStyle
  funModeData: FunModeData | null
}

export interface AppActions {
  navigate: (path: string) => void
}
