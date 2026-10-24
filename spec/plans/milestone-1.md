# תוכנית — Milestone 1: פרופילים מקומיים ובחירת משתתפים

מבוסס על PRD 0.5, ARCHITECTURE 0.3, DESIGN 0.3 ו־MILESTONES 1.2 · נכתב 24.10.2026

## 1. מטרה ותוצר

משתמש יכול להוסיף, לערוך ולמחוק סועדים, לשמור את העדפותיהם במכשיר ולבחור מי יוצא (1–10). האפליקציה רצה בדפדפן המחשב בתצוגת טלפון, ניתנת לשמירה למסך הבית בטלפון דרך קישור HTTPS זמני, ונפתחת גם ללא רשת.

בשלב זה אין שרת, אין AI ואין קובץ `.env` (מפתח הגישה `VITE_APP_ACCESS_KEY` נוסף רק ב־Milestone 3).

## 2. החלטות שהתקבלו לפני הבנייה

| נושא | החלטה | מקור |
|---|---|---|
| שם האפליקציה במסך הבית | **RestCommend** (ב־Manifest וב־`<title>`) | תשובת המשתמש, 24.10.2026 |
| אייקון | סכין ומזלג בקו שמנת (#F5EFE4) על רקע בורדו (#6D2932), לפי אייקון הסכו״ם ב־Style Guide | תשובת המשתמש |
| מסך 03 בשלב זה | כפתור ״המשך להעדפות היציאה״ פותח גרסה זמנית של מסך 03: הכותרת ״מה בא לכם הפעם?״, שמות הנבחרים לפי הסדר והערה ״המסך הזה ייבנה באבן הדרך הבאה״. ב־Milestone 2 היא מוחלפת במסך המלא. אין מסך נוסף. | הכרעה תכנונית (מסך 03 שייך ל־Milestone 2) |
| כפתור ״מועדפים״ | מציג את מסך 06 במצב רשימה ריקה בלבד | MILESTONES |
| שם כפול | השוואה אחרי הסרת רווחים בקצוות, וללא הבדל בין אותיות גדולות לקטנות באנגלית (״Dana״ = ״dana״) | ARCHITECTURE 2.2 + הרחבה קטנה |
| פרופיל חדש | אינו נבחר אוטומטית ליציאה | אין דרישה אחרת ב־spec |
| סדר הרשימה במסך 01 | לפי סדר ההוספה | אין דרישה אחרת ב־spec |
| הנחיית התקנה | iPhone / iPad → נוסח Safari; כל דפדפן אחר → נוסח Chrome | DESIGN 1.2 |

**נוסחים שה־spec אינו מגדיר — מוצעים כאן (אפשר לשנות בבדיקה):**
- שם ריק בשמירה: ״יש להזין שם״.
- כשל שמירה כללי (לא שם כפול): ״השמירה נכשלה. נסו שוב.״
- ספירה: ״{n} משתתפים נבחרו״; עבור אחד: ״משתתף אחד נבחר״.
- תקציר פרופיל ללא סוג אוכל: ״לא משנה״ (ואם מוגדרת תזונה — ״לא משנה, צמחוני״).

## 3. מבנה הפרויקט

Monorepo עם npm workspaces (מובנה ב־npm, ללא כלי נוסף). רק `apps/web` נוצר עכשיו; `apps/api` ו־`packages/contracts` נוספים ב־Milestone 3.

```
RestCommend/
├─ package.json            # workspaces: ["apps/*"]; scripts שמפנים ל־apps/web
├─ package-lock.json       # נעילת גרסאות
├─ .npmrc                  # save-exact=true — גרסאות מדויקות ללא ^
└─ apps/web/
   ├─ package.json
   ├─ index.html           # lang="he" dir="rtl", viewport-fit=cover, meta של iOS
   ├─ vite.config.ts       # React + vite-plugin-pwa; host + allowedHosts לקישור הזמני
   ├─ pwa-assets.config.ts # יצירת האייקונים מקובץ SVG אחד
   ├─ tsconfig.json, tsconfig.app.json, tsconfig.node.json
   ├─ eslint.config.js     # כולל no-console: "error"
   ├─ public/
   │  ├─ icon.svg          # מקור האייקון
   │  └─ (נוצרים) favicon.ico, pwa-192x192.png, pwa-512x512.png,
   │     maskable-icon-512x512.png, apple-touch-icon-180x180.png
   └─ src/
      ├─ main.tsx                 # פונטים, CSS, Router, בקשת אחסון קבוע
      ├─ App.tsx                  # נתיבים ו־OutingProvider
      ├─ styles/
      │  ├─ tokens.css            # צבעים, טיפוגרפיה, ריווח, רדיוסים
      │  └─ base.css              # בסיס RTL, safe areas, רכיבים (כפתור, כרטיס, chip, שדה)
      ├─ catalogs/
      │  └─ foodTypes.ts          # קטלוג סוגי אוכל ואפשרויות תזונה
      ├─ domain/
      │  ├─ person.ts             # טיפוס Person, נרמול שם, אימות, לוגיקת chips, תקציר
      │  └─ person.test.ts
      ├─ db/
      │  ├─ db.ts                 # Dexie, גרסת מבנה 1
      │  ├─ personsRepository.ts  # list / get / create / update / remove
      │  └─ personsRepository.test.ts
      ├─ state/
      │  ├─ OutingContext.tsx     # selectedPersonIds בזיכרון
      │  ├─ outingSelection.ts    # לוגיקה טהורה: בחירה, מגבלת 10, ניקוי
      │  └─ outingSelection.test.ts
      ├─ platform/
      │  ├─ install.ts            # מצב מותקן, זיהוי iOS, סגירת ההנחיה
      │  └─ storage.ts            # navigator.storage.persist()
      ├─ components/
      │  ├─ ScreenHeader.tsx      # כותרת 28/700 + קו דק
      │  ├─ BottomNav.tsx         # ״יציאה חדשה״ (ימין) · ״מועדפים״ (שמאל)
      │  ├─ ChipGroup.tsx         # בחירה מרובה / יחידה, ״לא משנה״ בלעדי
      │  ├─ PersonCard.tsx        # תיבת סימון, שם, תקציר, ״עריכה״
      │  ├─ ConfirmDialog.tsx     # חלון אישור על בסיס <dialog>
      │  ├─ InstallBanner.tsx     # רצועת הנחיית התקנה שניתן לסגור
      │  └─ icons.tsx             # אייקונים קוויים כ־SVG: פלוס, לב, אדם, סימון
      └─ screens/
         ├─ WhoIsJoiningScreen.tsx      # 01 — "/"
         ├─ ProfileScreen.tsx           # 02 — "/people/new", "/people/:id"
         ├─ OutingPreferencesScreen.tsx # 03 זמני — "/outing/preferences"
         └─ FavoritesScreen.tsx         # 06 ריק — "/favorites"
```

## 4. תלויות

הגרסה היציבה העדכנית ביותר בזמן ההתקנה, נשמרת מדויקת (`.npmrc` + `package-lock.json`). Node.js 24 כבר מותקן במחשב.

- **ריצה:** react, react-dom, react-router, dexie, dexie-react-hooks (רענון רשימה אוטומטי), @fontsource/heebo.
- **פיתוח:** vite, @vitejs/plugin-react, typescript, vite-plugin-pwa, @vite-pwa/assets-generator, vitest, fake-indexeddb (בדיקות מסד נתונים בלי דפדפן), eslint + typescript-eslint + eslint-plugin-react-hooks.
- אין ספריית UI, אין ספריית טפסים ואין ניהול state חיצוני.

**סקריפטים בשורש:**
- `npm run dev` — שרת פיתוח (localhost:5173).
- `npm run serve` — build + preview (localhost:4173). כאן ה־Service Worker פעיל, ולכן זו ההרצה לבדיקת התקנה, מצב לא מקוון וקישור לטלפון.
- `npm test` — Vitest. `npm run lint` — ESLint + בדיקת TypeScript.

## 5. שלבי הבנייה

### שלב א — שלד הפרויקט
1. יצירת `package.json` בשורש עם workspaces, `.npmrc`, ו־`apps/web` (React + TypeScript + Vite).
2. ESLint עם `no-console: "error"` — כך אף שם או העדפה לא נכתבים ללוג בטעות.
3. בדיקה ש־`npm run dev` ו־`npm run build` עובדים.

### שלב ב — עיצוב בסיס ו־RTL
1. `index.html`: `<html lang="he" dir="rtl">`, `viewport-fit=cover`, `theme-color` #F5EFE4, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` = RestCommend, `apple-touch-icon`.
2. `tokens.css` לפי DESIGN 2.1–2.5:
   - צבעים: text.primary #211C19, background #F5EFE4, surface #FFFFFF, action.primary #6D2932, accent.decorative #BA925B (קווים בלבד), accent.secondary #686B43 (סימוני בחירה). גוני משנה לכיתוב/גבולות נגזרים מ־text.primary בשקיפות, בלי לפגוע בקריאות.
   - טיפוגרפיה: Heebo 400/500/700 מ־@fontsource (ארוז באפליקציה); 28/700, 20/600, 16/400–500, 14/400; line-height 1.45; גדלים ב־rem כדי לכבד הגדלת טקסט.
   - ריווח 8/16/24, שוליים אופקיים 20, padding כרטיס 16, מרווח בין כרטיסים 12, radius כרטיס 14.
3. `base.css`:
   - safe areas: `padding` עם `env(safe-area-inset-*)` לתוכן ולניווט התחתון.
   - כפתור ראשי (בורדו, טקסט שמנת, גובה ≥48, מתרחב לשתי שורות), כפתור משני (מסגרת בורדו), כפתור טקסט.
   - Chips בצורת גלולה לפי ה־Style Guide: נבחר = מילוי בורדו + טקסט שמנת + סימן ✓; לא נבחר = לבן עם גבול. נשברים לשורות, ללא גלילה אופקית.
   - שדות קלט עם תווית קבועה מעל השדה, focus ברור. שמות בעברית/אנגלית מעורבים: `unicode-bidi: plaintext` ויישור לימין בשדה, ו־`<bdi>` סביב שמות בתצוגה — כך ״Dana דנה״ מוצג בסדר הנכון.
   - אף רכיב לא נחתך: גלילה אנכית, טקסט נשבר לשורות.

### שלב ג — מסד נתונים מקומי
1. `db.ts` — Dexie בשם `restcommend`, גרסה 1:
   `persons: 'id, &nameKey, createdAt'` (`&` = ייחודי — הגנה שנייה מפני שם כפול).
   טבלת `favorites` תתווסף ב־Milestone 6 כגרסה 2 (migration).
2. מבנה Person (ARCHITECTURE 2.2, ללא שדות אלרגיות):
   `id` (crypto.randomUUID), `displayName` (אחרי trim), `nameKey` (trim + lowercase, לבדיקת כפילות), `foodTypes: string[]` (ריק = ״לא משנה״), `foodText` (עד 200 תווים), `diet: 'vegetarian' | 'vegan' | 'indifferent'`, `createdAt`, `updatedAt`.
3. `personsRepository.ts`:
   - `create` / `update` — אימות שם (ריק → `EmptyNameError`), בדיקת כפילות מול פרופילים אחרים (→ `DuplicateNameError`, וגם לכידת שגיאת האינדקס הייחודי), חיתוך foodText ל־200.
   - `update` מעדכן לפי id בלבד — עריכה לעולם לא יוצרת פרופיל נוסף.
   - `remove(id)` — מחיקה לצמיתות.
   - `list()` — לפי createdAt.
4. `storage.ts` — קריאה ל־`navigator.storage.persist()` בעליית האפליקציה (אם נתמך), להקטנת סיכוי למחיקה אוטומטית.

### שלב ד — קטלוגים ולוגיקה
1. `foodTypes.ts`: איטלקי, אסייתי, בשר, דגים, סושי, ים־תיכוני (מזהה באנגלית + תווית עברית; ניתן להרחבה). תזונה: צמחוני / טבעוני / לא משנה.
2. `person.ts`:
   - `toggleFoodType(current, id)` — בחירה מרובה; בחירת ״לא משנה״ מנקה את הרשימה; בחירת סוג מוציאה מ״לא משנה״. ״לא משנה״ מוצג נבחר כשהרשימה ריקה (ייצוג יחיד — פרופיל בלי סוגים = ״לא משנה״).
   - `normalizeName`, `validateName`, `summarizePerson` (למשל ״איטלקי, צמחוני״).
3. `outingSelection.ts` — בחירה בזיכרון בלבד:
   - `toggle(selected, id)` → אם כבר יש 10 ומנסים להוסיף: הבחירה לא משתנה ומוחזר סימון `limitReached`.
   - `prune(selected, existingIds)` — הסרת מזהים של פרופילים שנמחקו.
   - הבחירה אינה נוגעת בפרופילים.

### שלב ה — מסך 01 ״מי מצטרף?״ (`/`)
- הנחיית התקנה בראש המסך (שלב ח).
- כותרת ״מי מצטרף?״, הסבר ״בחרו מתוך האנשים ששמרתם״.
- כרטיס לכל אדם: סמל אדם דקורטיבי בעיגול, שם, תקציר העדפות, תיבת סימון (accent.secondary כשנבחר), קישור ״עריכה״ ← `/people/:id`. לחיצה על הכרטיס משנה בחירה בלבד; תיבת הסימון היא `<input type="checkbox">` אמיתי לנגישות.
- כפתור משני ״+ הוספת אדם״ ← `/people/new`.
- ספירת נבחרים; ניסיון לבחור את ה־11 → ״אפשר לבחור עד 10 משתתפים״ (נעלם בשינוי הבחירה הבא).
- כפתור ראשי ״המשך להעדפות היציאה״ — לא פעיל ללא נבחרים, ולידו ״בחרו לפחות משתתף אחד״; פעיל ← `/outing/preferences`.
- מצב ריק: ״עדיין לא הוספתם אנשים. הוסיפו את מי שיוצא איתכם.״ + כפתור ההוספה.
- ניווט תחתון.

### שלב ו — מסך 02 ״פרופיל סועד״ (`/people/new`, `/people/:id`)
- כותרת ״פרופיל סועד״. שדה ״שם״.
- ״העדפות אוכל כלליות״ + ״אפשר לבחור כמה אפשרויות״ + Chips של הקטלוג ו״לא משנה״.
- ״משהו נוסף שאוהבים?״ — textarea, placeholder ״טקסט חופשי · לא חובה״, `maxLength=200`, מונה ״{n}/200״.
- ״העדפות תזונה״ — Chips בחירה יחידה: צמחוני / טבעוני / לא משנה (ברירת מחדל ״לא משנה״).
- ״הפרופיל נשמר במכשיר הזה״ (טקסט משני).
- ״שמירת פרופיל״ (ראשי) → אימות; הצלחה ← `/`. שם ריק → ״יש להזין שם״; כפול → ״כבר יש פרופיל בשם הזה״; כשל אחר → ״השמירה נכשלה. נסו שוב.״. בכל כשל הערכים נשארים בטופס.
- ״ביטול וחזרה״ (משני) ← `/` בלי לשמור דבר (הטופס הוא state מקומי בלבד עד השמירה).
- במצב עריכה בלבד, בתחתית ומופרד: כפתור טקסט ״מחיקת פרופיל״ בצבע הפעולה הראשית → חלון אישור ״למחוק את הפרופיל של {שם}?״ עם ״מחיקה״ / ״ביטול״. מחיקה → הסרה מהמסד ומהבחירה ← `/`.
- מזהה שאינו קיים בנתיב (למשל אחרי מחיקה) → חזרה ל־`/`.

### שלב ז — מסכים 03 (זמני) ו־06 (ריק) + ניווט
- `/outing/preferences`: אם אין נבחרים → חזרה ל־`/`. אחרת: כותרת ״מה בא לכם הפעם?״, שמות הנבחרים לפי סדר מסך 01 וההערה הזמנית (סעיף 2).
- `/favorites`: כותרת ״המועדפים שלי״, הסבר ״המסעדות ששמרתם במכשיר״, מצב ריק ״עוד לא שמרתם מסעדות במועדפים״, ניווט תחתון.
- `BottomNav` במסכים 01 ו־06 בלבד: מימין ״יציאה חדשה״ (אייקון פלוס), משמאל ״מועדפים״ (אייקון לב). הכפתור של המסך הפעיל מודגש בבורדו ובמשקל 700, כולל `aria-current`.

### שלב ח — התקנה למסך הבית ומצב לא מקוון
1. `vite-plugin-pwa` (`registerType: 'autoUpdate'`):
   - Manifest: `name` ו־`short_name` = RestCommend, `lang: 'he'`, `dir: 'rtl'`, `display: 'standalone'`, `start_url: '/'`, `scope: '/'`, `theme_color` ו־`background_color` = #F5EFE4, אייקונים 192 / 512 / maskable 512.
   - Workbox: שמירת כל קובצי ה־build (כולל פונטי Heebo) מראש, ו־`navigateFallback: 'index.html'` כך שכל נתיב נפתח גם ללא רשת.
2. אייקונים: `icon.svg` (סכו״ם שמנת על בורדו) → `pwa-assets-generator` יוצר את כל הגדלים, כולל apple-touch-icon ל־iPhone.
3. `install.ts`:
   - מותקן = `matchMedia('(display-mode: standalone)')` או `navigator.standalone` (iPhone).
   - iOS = iPhone / iPad (כולל iPad שמדווח כ־Mac עם מסך מגע).
   - סגירת ההנחיה נשמרת ב־localStorage (עטוף ב־try/catch) — לא מוצגת שוב באותו דפדפן.
4. `InstallBanner`: מוצגת רק כשלא מותקן ולא נסגרה, עם הנוסח מ־DESIGN 1.2 וכפתור סגירה (×, יעד לחיצה 48).
5. `vite.config.ts`: `server.host` ו־`preview.host` פתוחים, ו־`allowedHosts: ['.trycloudflare.com']` לקישור הזמני.

### שלב ט — קישור זמני לבדיקה בטלפון
- התקנה חד־פעמית של Cloudflare Quick Tunnel (`cloudflared`, אינו מותקן כרגע) — `winget install --id Cloudflare.cloudflared`. אבקש אישור לפני ההתקנה.
- הרצה: `npm run serve` ובמקביל `cloudflared tunnel --url http://localhost:4173` → כתובת `https://….trycloudflare.com` שפועלת רק כל עוד ההרצה פעילה. ללא חשבון וללא עלות.
- הקישור הזה הוא כלי בדיקה בלבד ואינו פריסה.

### שלב י — עדכון מסמכים בסיום הבנייה
- `CLAUDE.md` → פקודות הרצה: dev = `npm run dev`; בדיקת התקנה/טלפון = `npm run serve`; בדיקות = `npm test`.
- `ARCHITECTURE.md` → ADR-4: Monorepo עם npm workspaces (במקום כלי נוסף), ו־`npm run serve` כהרצת הבדיקה כי ה־Service Worker פעיל רק ב־build.
- `MILESTONES.md` → 🟡 ליד כותרת Milestone 1.

## 6. בדיקות

**אוטומטיות (Vitest):**
- `person.test.ts` — נרמול שם; שם ריק/רווחים בלבד נדחה; ״לא משנה״ מנקה סוגים; בחירת סוג מוציאה מ״לא משנה״; תקציר.
- `personsRepository.test.ts` (fake-indexeddb) — יצירה וקריאה; עריכה לא מוסיפה רשומה; שם כפול (כולל רווחים ואותיות גדולות/קטנות) נדחה ביצירה ובעריכה; עריכת פרופיל בלי לשנות את שמו מותרת; מחיקה; foodText נחתך ל־200; אין שדות מעבר למבנה המוגדר.
- `outingSelection.test.ts` — בחירה/ביטול; 10 מותר, 11 נחסם; prune אחרי מחיקה; הבחירה לא משנה אובייקטי פרופיל.

**ידניות על ידי (בדפדפן המובנה, תצוגת טלפון 390×844, על `npm run serve`):**
1. יצירת 4 פרופילים, כולל שם מעורב ״Dana דנה״ וטקסט חופשי באנגלית.
2. עריכה ← ספירת פרופילים לא משתנה; ביטול ← שום שינוי לא נשמר.
3. שם ריק ושם כפול ← הודעה, לא נשמר.
4. מחיקה ← חלון אישור; ״ביטול״ לא מוחק; ״מחיקה״ מסירה מהרשימה ומהבחירה.
5. רענון הדף ← הנתונים נשארים.
6. יצירת 11 פרופילים ← הבחירה ה־11 נחסמת עם הודעה.
7. מצב רשימה ריקה; כפתור המשך לא פעיל; כפתור מועדפים מציג מסך 06 ריק.
8. בדיקה שה־Service Worker רשום ושכל הקבצים נשמרו (Cache Storage), והאפליקציה נטענת מחדש בלי רשת.
9. בדיקת הקוד: אין `console.*` (ESLint), אין שליחת נתונים לשום כתובת.

בסיום — סגירת ההרצה.

## 7. מיפוי Definition of Done

| תנאי | איך מוכח |
|---|---|
| שם והעדפות נשמרים אחרי סגירה ופתיחה; עריכה לא יוצרת פרופיל נוסף | בדיקת repository + בדיקה ידנית 2, 5 |
| ביטול לא שומר; שם ריק/כפול לא נשמר | בדיקות אוטומטיות + ידנית 2, 3 |
| מחיקה מבקשת אישור, מסירה מהמכשיר ומהבחירה | בדיקות repository + prune + ידנית 4 |
| כמה סוגי אוכל; ״לא משנה״ בלעדי | `person.test.ts` + ידנית |
| הבחירה לא משנה פרופילים; עד 10 | `outingSelection.test.ts` + ידנית 6 |
| שמות והעדפות לא נכתבים ללוגים | ESLint `no-console` + אין קריאות רשת ב־Milestone זה |
| RTL תקין ב־iPhone וב־Android, טקסט מעורב, טלפון באנגלית | אני בודק בתצוגת טלפון במחשב; **הבדיקה בטלפונים אמיתיים נעשית על ידך** דרך הקישור הזמני (האפליקציה לא תלויה בשפת הטלפון — `lang`/`dir` קבועים) |
| נשמרת למסך הבית ונפתחת במסך מלא; הנחיה רק בדפדפן; נפתחת ללא רשת | אני בודק Manifest, Service Worker ומצב לא מקוון במחשב; **ההתקנה בטלפונים אמיתיים נבדקת על ידך** דרך הקישור הזמני |

## 8. מחוץ לתחום ב־Milestone זה

מסכים 03 (המלא), 04, 05; שרת ו־API; `.env`; OpenAI ו־Google; שמירת מועדפים; פריסה ל־Cloud Run; commit / push.
