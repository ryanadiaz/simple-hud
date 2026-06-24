import { useState, useEffect, useRef } from 'react'

export interface WeatherData {
  temp: number
  feelsLike: number
  condition: string
  emoji: string
  code: number
}

interface GeoLocation {
  lat: number
  lon: number
  label: string
}

export interface WeatherState {
  weather: WeatherData | null
  location: GeoLocation | null
  error: string | null
  loading: boolean
  cityInput: string
  setCityInput: (v: string) => void
  autoDetect: () => void
  searchCity: (query: string) => Promise<void>
  /** Clear weather + location and return to the default search state. */
  reset: () => void
}

function codeToCondition(code: number): { condition: string; emoji: string } {
  if (code === 0) return { condition: 'Clear', emoji: '☀️' }
  if (code <= 2) return { condition: 'Mostly Clear', emoji: '🌤️' }
  if (code === 3) return { condition: 'Overcast', emoji: '☁️' }
  if (code <= 49) return { condition: 'Foggy', emoji: '🌫️' }
  if (code <= 57) return { condition: 'Drizzle', emoji: '🌦️' }
  if (code <= 67) return { condition: 'Rain', emoji: '🌧️' }
  if (code <= 77) return { condition: 'Snow', emoji: '❄️' }
  if (code <= 82) return { condition: 'Showers', emoji: '🌦️' }
  if (code <= 86) return { condition: 'Snow Showers', emoji: '🌨️' }
  return { condition: 'Thunderstorm', emoji: '⛈️' }
}

async function fetchWeatherAt(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&temperature_unit=fahrenheit`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather API error')
  const data = await res.json()
  const cur = data.current
  const { condition, emoji } = codeToCondition(cur.weather_code)
  return {
    temp: Math.round(cur.temperature_2m),
    feelsLike: Math.round(cur.apparent_temperature),
    condition,
    emoji,
    code: cur.weather_code,
  }
}

export function useWeather(): WeatherState {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const locationRef = useRef<GeoLocation | null>(null)
  locationRef.current = location

  function autoDetect() {
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const loc: GeoLocation = { lat: latitude, lon: longitude, label: 'Current Location' }
        setLocation(loc)
        try {
          setWeather(await fetchWeatherAt(latitude, longitude))
        } catch {
          setError('Failed to fetch weather')
        }
        setLoading(false)
      },
      () => {
        setError('Location access denied — search for a city below')
        setLoading(false)
      },
    )
  }

  async function searchCity(query: string) {
    setLoading(true)
    setError(null)
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`,
      )
      const geoData = await geoRes.json()
      if (!geoData.results?.length) {
        setError('City not found')
        setLoading(false)
        return
      }
      const { latitude, longitude, name, admin1 } = geoData.results[0]
      const label = admin1 ? `${name}, ${admin1}` : name
      const loc: GeoLocation = { lat: latitude, lon: longitude, label }
      setLocation(loc)
      setWeather(await fetchWeatherAt(latitude, longitude))
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }

  function reset() {
    setWeather(null)
    setLocation(null)
    setError(null)
    setCityInput('')
    setLoading(false)
  }

  // Refresh every 10 minutes
  useEffect(() => {
    if (!location) return
    const id = setInterval(async () => {
      const loc = locationRef.current
      if (!loc) return
      try {
        setWeather(await fetchWeatherAt(loc.lat, loc.lon))
      } catch {
        // silent refresh failure — keep showing last known value
      }
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [location?.lat, location?.lon])

  return { weather, location, error, loading, cityInput, setCityInput, autoDetect, searchCity, reset }
}
