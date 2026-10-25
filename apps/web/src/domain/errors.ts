import type { ErrorCode } from '@restcommend/contracts'

/** Server error codes plus the app's own "no internet" state. */
export type SearchErrorCode = ErrorCode | 'OFFLINE'

// DESIGN 1.8
const MESSAGES: Record<SearchErrorCode, string> = {
  UNAUTHORIZED: 'האפליקציה אינה מורשית להתחבר לשרת. פנו למי שהתקין לכם אותה.',
  VALIDATION_ERROR: 'חלק מהפרטים אינם תקינים. בדקו את ההגדרות ונסו שוב.',
  LOCATION_UNRESOLVED: 'לא הצלחנו למצוא את הכתובת. נסו לנסח אותה אחרת או לחפש לפי ערים / אזורים.',
  PROVIDER_UNAVAILABLE: 'שירות החיפוש אינו זמין כרגע. נסו שוב בעוד רגע.',
  SEARCH_TIMEOUT: 'החיפוש לקח יותר מדי זמן. נסו שוב.',
  RATE_LIMITED: 'בוצעו הרבה חיפושים בזמן קצר. נסו שוב בעוד כמה דקות.',
  OFFLINE: 'אין חיבור לאינטרנט. התחברו ונסו שוב.',
}

export function errorMessage(code: SearchErrorCode): string {
  return MESSAGES[code]
}

/** Every error offers "ניסיון חוזר" except UNAUTHORIZED. */
export function canRetry(code: SearchErrorCode): boolean {
  return code !== 'UNAUTHORIZED'
}
