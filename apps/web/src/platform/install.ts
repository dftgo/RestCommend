const DISMISS_KEY = 'installHintDismissed'

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
}

export function isIOS(): boolean {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS reports itself as a Mac with touch support.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}

export function isInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Storage unavailable; the hint may show again next time.
  }
}
