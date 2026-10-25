import type { GeoPoint } from '../domain/outingSettings'

/**
 * Ask the browser for the current position. Only called after the user
 * picks "current location". Rejects on denial, timeout or no support.
 * The position is never logged.
 */
export function getCurrentPosition(timeoutMs = 15000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(`geolocation_${err.code}`)),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    )
  })
}
