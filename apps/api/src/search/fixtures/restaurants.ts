// DEMO DATA ONLY. Fictional restaurants — not real places, prices, ratings or
// travel times. Every name starts with "דוגמה:" and every link points to
// example.com (a domain reserved for examples).
import type { AreaId, Atmosphere, FoodTypeId, Rating } from '@restcommend/contracts'
import type { Candidate, Tri, WeeklyHours } from '../researchProvider'

type Kosher = Candidate['kosher']

interface DemoRestaurant {
  id: string
  name: string
  city: string
  street: string
  areaId: AreaId
  cuisines: FoodTypeId[] | null
  menu: string[]
  price: [number, number] | null
  kosher: Kosher
  atmospheres: Atmosphere[] | null
  veg: Tri
  vegan: Tri
  hours: WeeklyHours | null
  /** Demo rating on a 0–5 scale: [value, reviews]. */
  rating: [number, number] | null
  /** Optional second demo source on a 0–10 scale. */
  guide?: number
  travel: number
  link: 'official' | 'alternative' | 'none'
}

const all = (open: string, close: string): WeeklyHours =>
  Object.fromEntries(['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, [{ open, close }]])) as WeeklyHours

const STANDARD = all('12:00', '23:00')
const NIGHT = all('18:00', '02:00')
/** Kosher style: closed on Friday evening, opens again on Saturday night. */
const SHABBAT_CLOSED: WeeklyHours = {
  '0': [{ open: '12:00', close: '23:00' }],
  '1': [{ open: '12:00', close: '23:00' }],
  '2': [{ open: '12:00', close: '23:00' }],
  '3': [{ open: '12:00', close: '23:00' }],
  '4': [{ open: '12:00', close: '23:30' }],
  '5': [{ open: '11:00', close: '15:00' }],
  '6': [{ open: '20:00', close: '23:30' }],
}
/** Lunch only: closed in the evening. */
const LUNCH_ONLY: WeeklyHours = {
  '0': [{ open: '11:00', close: '17:00' }],
  '1': [{ open: '11:00', close: '17:00' }],
  '2': [{ open: '11:00', close: '17:00' }],
  '3': [{ open: '11:00', close: '17:00' }],
  '4': [{ open: '11:00', close: '17:00' }],
  '5': [{ open: '10:00', close: '15:00' }],
}

const DEMO: DemoRestaurant[] = [
  // Tel Aviv–Yafo
  { id: 'demo-tlv-01', name: 'דוגמה: טרטוריה על הים', city: 'תל אביב–יפו', street: 'שדרות הדוגמה 12', areaId: 'tel_aviv_yafo', cuisines: ['italian', 'fish'], menu: ['פסטה', 'פיצה', 'ריזוטו'], price: [150, 220], kosher: 'serves_pork_or_seafood', atmospheres: ['romantic', 'lively'], veg: 'yes', vegan: 'unknown', hours: STANDARD, rating: [4.6, 820], guide: 8.7, travel: 18, link: 'official' },
  { id: 'demo-tlv-02', name: 'דוגמה: סושי בר הנמל', city: 'תל אביב–יפו', street: 'רחוב הנמל לדוגמה 3', areaId: 'tel_aviv_yafo', cuisines: ['sushi', 'asian', 'fish'], menu: ['סושי', 'ראמן', 'אורז'], price: [120, 180], kosher: 'serves_pork_or_seafood', atmospheres: ['lively'], veg: 'yes', vegan: 'yes', hours: NIGHT, rating: [4.3, 1500], travel: 22, link: 'official' },
  { id: 'demo-tlv-03', name: 'דוגמה: ביסטרו הכרם', city: 'תל אביב–יפו', street: 'רחוב השוק לדוגמה 8', areaId: 'tel_aviv_yafo', cuisines: ['mediterranean', 'meat'], menu: ['קבב', 'חומוס', 'סלט', 'שקשוקה'], price: [90, 140], kosher: 'certified', atmospheres: ['family'], veg: 'yes', vegan: 'no', hours: SHABBAT_CLOSED, rating: [4.1, 300], travel: 25, link: 'alternative' },
  { id: 'demo-tlv-04', name: 'דוגמה: גינת הירקות', city: 'תל אביב–יפו', street: 'רחוב הגן לדוגמה 21', areaId: 'tel_aviv_yafo', cuisines: ['mediterranean'], menu: ['סלט', 'קינואה', 'טופו', 'מרק'], price: [60, 95], kosher: 'certified', atmospheres: ['quiet', 'family'], veg: 'yes', vegan: 'yes', hours: LUNCH_ONLY, rating: [4.5, 210], travel: 20, link: 'official' },
  { id: 'demo-tlv-05', name: 'דוגמה: אש ועשן', city: 'תל אביב–יפו', street: 'רחוב התעשייה לדוגמה 40', areaId: 'tel_aviv_yafo', cuisines: ['meat'], menu: ['סטייק', 'המבורגר', 'צלעות'], price: [220, 320], kosher: 'unknown', atmospheres: ['lively', 'business'], veg: 'no', vegan: 'no', hours: STANDARD, rating: [4.7, 2100], guide: 9.1, travel: 28, link: 'official' },
  { id: 'demo-tlv-06', name: 'דוגמה: נודלס ברחוב', city: 'תל אביב–יפו', street: 'רחוב הלילה לדוגמה 5', areaId: 'tel_aviv_yafo', cuisines: ['asian'], menu: ['נודלס', 'פאד תאי', 'ראמן', 'חריף'], price: [70, 110], kosher: 'no_pork_seafood', atmospheres: null, veg: 'yes', vegan: 'unknown', hours: NIGHT, rating: null, travel: 15, link: 'none' },
  { id: 'demo-tlv-07', name: 'דוגמה: שולחן השף', city: 'תל אביב–יפו', street: 'שדרת הטעמים לדוגמה 2', areaId: 'tel_aviv_yafo', cuisines: ['mediterranean', 'fish'], menu: ['דגים', 'טאפאס', 'יין'], price: [380, 520], kosher: 'serves_pork_or_seafood', atmospheres: ['romantic', 'quiet'], veg: 'yes', vegan: 'unknown', hours: null, rating: [4.8, 450], travel: 30, link: 'official' },
  // Gush Dan
  { id: 'demo-gd-01', name: 'דוגמה: פסטה ומשפחה', city: 'רמת גן', street: 'רחוב הבורסה לדוגמה 7', areaId: 'gush_dan', cuisines: ['italian'], menu: ['פסטה', 'פיצה', 'לזניה'], price: [80, 130], kosher: 'certified', atmospheres: ['family'], veg: 'yes', vegan: 'yes', hours: SHABBAT_CLOSED, rating: [4.2, 640], travel: 24, link: 'official' },
  { id: 'demo-gd-02', name: 'דוגמה: המעשנה', city: 'פתח תקווה', street: 'רחוב המושבה לדוגמה 15', areaId: 'gush_dan', cuisines: ['meat'], menu: ['סטייק', 'אסאדו', 'המבורגר'], price: [160, 240], kosher: 'certified', atmospheres: ['family', 'lively'], veg: 'no', vegan: 'no', hours: SHABBAT_CLOSED, rating: [4.4, 980], travel: 35, link: 'official' },
  { id: 'demo-gd-03', name: 'דוגמה: טוקיו קטנה', city: 'גבעתיים', street: 'רחוב הגבעה לדוגמה 9', areaId: 'gush_dan', cuisines: ['sushi', 'asian'], menu: ['סושי', 'טמפורה', 'אודון'], price: [110, 170], kosher: 'no_pork_seafood', atmospheres: ['quiet'], veg: 'yes', vegan: 'yes', hours: STANDARD, rating: [4.0, 150], travel: 27, link: 'alternative' },
  { id: 'demo-gd-04', name: 'דוגמה: דג על האש', city: 'בת ים', street: 'טיילת הדוגמה 30', areaId: 'gush_dan', cuisines: ['fish', 'mediterranean'], menu: ['דגים', 'פירות ים', 'סלטים'], price: [140, 210], kosher: 'serves_pork_or_seafood', atmospheres: ['lively'], veg: 'yes', vegan: 'unknown', hours: null, rating: [3.9, 90], travel: 26, link: 'official' },
  { id: 'demo-gd-05', name: 'דוגמה: קפה השכונה', city: 'חולון', street: 'רחוב השכונה לדוגמה 4', areaId: 'gush_dan', cuisines: ['italian', 'mediterranean'], menu: ['פסטה', 'סלט', 'שקשוקה', 'כריך'], price: [50, 90], kosher: 'unknown', atmospheres: ['family', 'quiet'], veg: 'yes', vegan: 'yes', hours: STANDARD, rating: [4.3, 400], travel: 32, link: 'official' },
  // Haifa and the Krayot
  { id: 'demo-hf-01', name: 'דוגמה: מרפסת הכרמל', city: 'חיפה', street: 'שדרות הכרמל לדוגמה 11', areaId: 'haifa_krayot', cuisines: ['mediterranean', 'meat'], menu: ['קבב', 'סלטים', 'דג'], price: [130, 190], kosher: 'certified', atmospheres: ['romantic', 'quiet'], veg: 'yes', vegan: 'unknown', hours: SHABBAT_CLOSED, rating: [4.5, 520], travel: 75, link: 'official' },
  { id: 'demo-hf-02', name: 'דוגמה: נמל הדגים', city: 'חיפה', street: 'רחוב הנמל לדוגמה 6', areaId: 'haifa_krayot', cuisines: ['fish', 'sushi'], menu: ['דגים', 'סושי', 'פירות ים'], price: [170, 260], kosher: 'serves_pork_or_seafood', atmospheres: ['lively'], veg: 'yes', vegan: 'no', hours: STANDARD, rating: [4.2, 330], travel: 80, link: 'official' },
  { id: 'demo-hf-03', name: 'דוגמה: פיצה בקריות', city: 'קריית ביאליק', street: 'רחוב הקריה לדוגמה 19', areaId: 'haifa_krayot', cuisines: ['italian'], menu: ['פיצה', 'פסטה', 'סלט'], price: [60, 100], kosher: 'no_pork_seafood', atmospheres: ['family'], veg: 'yes', vegan: 'yes', hours: NIGHT, rating: [4.0, 210], travel: 85, link: 'alternative' },
  // Jerusalem area
  { id: 'demo-jm-01', name: 'דוגמה: בית האבן', city: 'ירושלים', street: 'רחוב האבן לדוגמה 14', areaId: 'jerusalem_area', cuisines: ['meat', 'mediterranean'], menu: ['סטייק', 'קבב', 'חומוס'], price: [200, 290], kosher: 'certified', atmospheres: ['romantic', 'business'], veg: 'yes', vegan: 'no', hours: SHABBAT_CLOSED, rating: [4.6, 760], travel: 55, link: 'official' },
  { id: 'demo-jm-02', name: 'דוגמה: שוק וטעמים', city: 'ירושלים', street: 'רחוב השוק לדוגמה 2', areaId: 'jerusalem_area', cuisines: ['mediterranean', 'asian'], menu: ['חומוס', 'נודלס', 'סלט'], price: [70, 120], kosher: 'certified', atmospheres: ['lively'], veg: 'yes', vegan: 'yes', hours: LUNCH_ONLY, rating: [4.4, 1200], travel: 58, link: 'official' },
  { id: 'demo-jm-03', name: 'דוגמה: הגפן', city: 'מבשרת ציון', street: 'רחוב הגפן לדוגמה 1', areaId: 'jerusalem_area', cuisines: ['italian'], menu: ['פסטה', 'ריזוטו', 'יין'], price: [120, 170], kosher: 'unknown', atmospheres: ['quiet'], veg: 'yes', vegan: 'unknown', hours: null, rating: null, travel: 50, link: 'official' },
  // Eilat
  { id: 'demo-el-01', name: 'דוגמה: חוף האלמוגים', city: 'אילת', street: 'טיילת הדוגמה 50', areaId: 'eilat', cuisines: ['fish', 'sushi'], menu: ['דגים', 'סושי', 'פירות ים'], price: [180, 260], kosher: 'serves_pork_or_seafood', atmospheres: ['romantic', 'lively'], veg: 'yes', vegan: 'no', hours: NIGHT, rating: [4.3, 640], travel: 240, link: 'official' },
  { id: 'demo-el-02', name: 'דוגמה: מדבר וגריל', city: 'אילת', street: 'רחוב המדבר לדוגמה 3', areaId: 'eilat', cuisines: ['meat'], menu: ['סטייק', 'המבורגר', 'צלעות'], price: [150, 230], kosher: 'certified', atmospheres: ['family'], veg: 'no', vegan: 'no', hours: SHABBAT_CLOSED, rating: [4.1, 300], travel: 245, link: 'official' },
]

const BASE = 'https://example.com/demo'

export const DEMO_TRAVEL_NOTE = 'נתוני דוגמה'

function ratingsOf(d: DemoRestaurant): Rating[] {
  const out: Rating[] = []
  if (d.rating) {
    out.push({ sourceName: 'אתר דירוגים לדוגמה', value: d.rating[0], scale: 5, reviewCount: d.rating[1], url: `${BASE}/ratings/${d.id}` })
  }
  if (d.guide !== undefined) out.push({ sourceName: 'מדריך מסעדות לדוגמה', value: d.guide, scale: 10 })
  return out
}

function linkOf(d: DemoRestaurant): Candidate['link'] {
  if (d.link === 'official') return { url: `${BASE}/restaurants/${d.id}`, kind: 'official_site' }
  if (d.link === 'alternative') return { url: `${BASE}/guide/${d.id}`, kind: 'alternative' }
  return null
}

export const DEMO_RESTAURANT_IDS = DEMO.map((d) => d.id)

/** Demo restaurants as research candidates (travel minutes only when asked for). */
export function demoCandidates(withTravel: boolean): Candidate[] {
  return DEMO.map((d) => ({
    restaurantId: d.id,
    name: d.name,
    city: d.city,
    address: `${d.street}, ${d.city}`,
    areaId: d.areaId,
    cuisines: d.cuisines,
    menuKeywords: d.menu,
    priceEstimate: d.price ? { min: d.price[0], max: d.price[1] } : null,
    kosher: d.kosher,
    atmospheres: d.atmospheres,
    vegetarianOptions: d.veg,
    veganOptions: d.vegan,
    openingHours: d.hours,
    ratings: ratingsOf(d),
    primaryRating: d.rating ? { value: d.rating[0], reviewCount: d.rating[1] } : null,
    travelMinutes: withTravel ? d.travel : null,
    travelNote: DEMO_TRAVEL_NOTE,
    link: linkOf(d),
    sourceIds: [`src-${d.id}`],
  }))
}

export function demoSources() {
  return DEMO.map((d) => ({ id: `src-${d.id}`, title: `מקור דוגמה — ${d.name.replace('דוגמה: ', '')}`, url: `${BASE}/sources/${d.id}` }))
}
