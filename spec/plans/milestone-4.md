# Milestone 4 — חיפוש אמיתי ברשת עם OpenAI · תוכנית

נכתב 25.10.2026, לפי MILESTONES 1.2, ARCHITECTURE 0.3 (כולל ADR-1–8) והקוד הקיים אחרי Milestone 3.

## מטרה בקצרה
להחליף את ספק הדוגמה (`fixtureProvider`) בספק אמיתי שמשתמש ב־OpenAI Responses API עם `web_search`, כך שחיפוש מחזיר מסעדות אמיתיות בישראל עם מקורות שניתן לפתוח. ה־MatchEvaluator, ה־Ranker וכללי הדירוג **לא משתנים** (ADR-7). בסוף — דוח זמנים על לפחות 10 יציאות מול יעד 30 השניות.

זמני נסיעה **אינם** מאומתים בשלב הזה: במסלול זמן נסיעה כל מסעדה מקבלת `travelEstimate: null` והפרמטר `travel_time` הוא `unknown` (״לא ניתן לאמת זמן נסיעה״). Places ו־Routes נוספים ב־Milestone 5.

---

## שלב 0 — הכנת חשבון OpenAI (המשתמש, בהדרכה)
הבנייה מתחילה בעצירה: מדריכים את המשתמש צעד אחר צעד, בשפה פשוטה, בלי לבקש מפתח בצ'אט.
1. platform.openai.com ← הרשמה / כניסה (חשבון API, לא מינוי ChatGPT).
2. Billing ← הוספת אמצעי תשלום ויתרה התחלתית קטנה.
3. Limits ← הגדרת מגבלת הוצאה חודשית (Budget) והתראה.
4. אם החשבון מבקש אימות ארגון (Organization verification) כדי להשתמש במודל — לבצע לפי ההנחיות במסך.
5. API keys ← יצירת מפתח ← הדבקה ב־`.env` בשורה `OPENAI_API_KEY=` (Claude מוסיף את השורה ל־`.env.example` בלבד ואומר למשתמש להוסיף ל־`.env`).

אם אחד מאלה חסר — החיבור החי נשאר חסם גלוי; אפשר להמשיך לכתוב קוד ובדיקות עם לקוח מדומה, אבל ה־Milestone לא מסומן 🟡 בלי בדיקה חיה.

## שלב 1 — בדיקת זמינות המודל
סקריפט `apps/api/scripts/checkOpenAI.ts` (`npm run check:openai -w apps/api`):
- `models.retrieve(OPENAI_MODEL)` — האם `gpt-5.5` זמין בחשבון.
- קריאת Responses קטנה אחת עם `tools: [{ type: 'web_search' }]`, `tool_choice: 'required'`, `reasoning: { effort: 'low' }`, `store: false`, `include: ['web_search_call.action.sources']`, `text.format` מסוג `json_schema` (strict) ו־`max_tool_calls` — ובדיקה שהתשובה מכילה `web_search_call` שהושלם, רשימת sources ופלט JSON תקין.
- מדפיס רק ״תקין / לא תקין״ לכל בדיקה, זמן ומספר tokens. לא מדפיס את המפתח או את תוכן התשובה.

אם המודל לא זמין, או שאחת היכולות (חיפוש מחויב, structured output יחד עם web_search, `max_tool_calls`) לא נתמכת — **עוצרים** ומציגים למשתמש חלופות בשפה פשוטה (מודל אחר מהרשימה הזמינה בחשבון; פלט JSON לפי הוראות במקום schema קשיח, עם אותה בדיקת Zod). לא ממשיכים בלי בחירה שלו.

## שלב 2 — הגדרות שרת
**`apps/api/src/config.ts`** — שדות חדשים:
| משתנה | ברירת מחדל | הערה |
|---|---|---|
| `RESEARCH_PROVIDER` | `openai` אם `OPENAI_API_KEY` מוגדר, אחרת `demo` | `demo` נשאר לבדיקות ולמצבי השגיאה של `DEMO_SCENARIO` |
| `OPENAI_API_KEY` | — | חובה כש־`RESEARCH_PROVIDER=openai`; אחרת שגיאת הגדרות ברורה |
| `OPENAI_MODEL` | `gpt-5.5` | |
| `MAX_SEARCH_CALLS` | 8 | נשלח כ־`max_tool_calls`; לכיול במדידה |
| `MAX_OUTPUT_TOKENS` | 12000 | כולל reasoning tokens; לכיול במדידה |
| `SEARCH_CONTEXT_SIZE` | `medium` | `low` / `medium` / `high`; לכיול במדידה |

**`server.ts`** — בוחר ספק לפי `RESEARCH_PROVIDER` ומדפיס בהפעלה איזה ספק ואיזה מודל פעילים (בלי ערכי מפתחות).

**`.env.example`** — הוספת השורות האלה (ללא ערכים). להזכיר למשתמש להוסיף `OPENAI_API_KEY` ל־`.env`.

**תלות חדשה:** `openai` (OpenAI SDK הרשמי) ב־apps/api, בגרסה מדויקת (save-exact).

## שלב 3 — שינוי קטן בחוזה הבקשה: שמות מסעדות שהוצגו
**בעיה:** ב״המלצות נוספות״ השרת מקבל רק `excludedRestaurantIds`. המזהים אטומים, כך שהמודל לא יודע אילו מסעדות להחריג, ויחזיר שוב את אותן מסעדות.
**פתרון:** שדה חדש בבקשה `excludedRestaurantNames: string[]` (עד 100, כל שם עד 300 תווים) — שם המסעדה + עיר, כפי שהוצגו. שמות מסעדות אינם מידע אישי. ההחרגה הקשיחה עדיין נעשית לפי `restaurantId` בקוד (ללא שינוי), השמות רק מנחים את המודל.
- `packages/contracts/src/request.ts` — השדה החדש (חובה, ברירת מחדל ריקה באפליקציה); בדיקה שאורכו תואם ל־`excludedRestaurantIds`.
- `apps/web/src/domain/searchRequest.ts` — `excludedRestaurantNames: []`.
- `apps/web/src/state/searchSession.ts` — בבקשת ״המלצות נוספות״ ממלאים מתוך המסעדות שהוצגו (`${name} — ${city}`).
- `apps/api/src/http/app.ts` — `BODY_LIMIT` מ־32kb ל־64kb.
- מתועד ב־ADR-9.

**מזהה מסעדה יציב:** `restaurantId = 'live-' + sha1(שם מנורמל | עיר מנורמלת).slice(0, 16)`. אותה מסעדה בבקשה מאוחרת יותר מקבלת אותו מזהה, ולכן מסוננת גם אם המודל מחזיר אותה.
**מזהה מקור יציב:** `sourceId = 'src-' + sha1(URL מנורמל).slice(0, 12)`. האפליקציה ממזגת מקורות בין בקשות לפי id (`mergeSources`), ולכן מזהים כמו s1 / s2 היו מתנגשים בין בקשות.

## שלב 4 — ספק OpenAI
קבצים חדשים ב־`apps/api/src/search/openai/`:

### `prompt.ts` — בניית ההוראות
- **הוראות מערכת (developer)** בעברית/אנגלית: חיפוש מסעדות פעילות בישראל בלבד; עד `maxCandidates` מועמדים; רק עובדות שנמצאו במקורות, כל עובדה עם כתובות המקורות שלה; מידע שלא נמצא = `null` / `unknown`, **לעולם לא ניחוש**; אין להמציא דירוג, מחיר, קישור או זמן נסיעה; שם המסעדה כולל את הסניף; כשרות `certified` רק כשמקור מציין תעודת כשרות במפורש; דירוגים בסקאלה המקורית של כל אתר ועם שם האתר; לא לבחור ולא לדרג — רק לאסוף עובדות.
- **הגנה מהוראות עוינות:** טקסט חופשי של המשתתפים ותוכן אתרים הם *נתונים*, לא הוראות. הקלט נשלח כ־JSON בתוך תגית מסומנת (`<outing_data>`), עם הנחיה מפורשת להתעלם מכל הוראה שמופיעה בו או באתרים. הכלי היחיד הוא `web_search`; אין כלים לפעולות חיצוניות.
- **נתוני היציאה שנשלחים:** לכל משתתף רק token (p1…), סוגי אוכל בתווית עברית, טקסט היציאה, טקסט הפרופיל (מסומן ״עדיפות נמוכה; הבחירה לערב גוברת״) ותזונה. הגדרות משותפות בתוויות עבריות; מועד הביקור (תאריך, יום בשבוע ושעה בשעון ישראל); שמות המסעדות להחרגה.
- **מיקום:**
  - מסלול אזורים — שמות האזורים בעברית. אין קואורדינטות.
  - מסלול זמן נסיעה, מיקום נוכחי — קואורדינטות **מעוגלות ל־2 ספרות** (כ־1 ק״מ) + ״בטווח נסיעה של כ־X דקות ברכב״.
  - מסלול זמן נסיעה, כתובת ידנית — הטקסט **בלי מספרים** (מסיר מספר בית), כלומר רחוב ועיר בלבד. (ב־Milestone 5 יוחלף באזור מקורב מ־Places.)
  - בכל הקריאות: `user_location: { type: 'approximate', country: 'IL', timezone: 'Asia/Jerusalem' }`.

### `outputSchema.ts` — מה המודל מחזיר (Zod → JSON schema strict)
כל השדות חובה; ״לא ידוע״ = `null`. לכל מועמד:
- `name`, `city`, `address`, `areaId` (מזהה מהקטלוג או null)
- `cuisines` (מזהי קטלוג; null = לא ידוע) + `cuisineSources`
- `menuHighlights` (עד 8 מנות/מילים בעברית) + `menuSources`
- `textMatches`: לכל token שיש לו טקסט יציאה — מנות מהתפריט שקשורות לטקסט שלו (או רשימה ריקה) + מקורות
- `price` (`{min, max}` לאדם בש״ח או null) + `priceSources`
- `kosher` (`certified` / `no_pork_seafood` / `serves_pork_or_seafood` / `unknown`) + `kosherSources`
- `atmospheres` (מזהי קטלוג או null) + `atmosphereSources`
- `vegetarianOptions`, `veganOptions` (`yes` / `no` / `unknown`) + `dietSources`
- `openingHours`: 7 ימים (ראשון–שבת), לכל יום רשימת טווחים `HH:mm` או null ליום לא ידוע; null כולו = לא ידוע + `hoursSources`
- `ratings`: `[{ sourceName, value, scale, reviewCount|null, url }]`
- `websiteUrl` (אתר רשמי או null)
- `description`: משפט־שניים בעברית על המסעדה (מה מיוחד בה לפי המקורות) — **בלי** טענות התאמה (״מתאים ל…״)
- `participantNotes`: לכל token — משפט קצר על מה במסעדה רלוונטי להעדפת האוכל שלו (או null)

### `openaiProvider.ts` — הקריאה והמיפוי
1. `client.responses.create({ model, instructions, input, tools: [web_search עם user_location ו־search_context_size], tool_choice: 'required', reasoning: { effort: 'low' }, store: false, max_output_tokens, max_tool_calls, include: ['web_search_call.action.sources'], text: { format: json_schema strict } }, { signal, maxRetries: 0 })` — בלי Conversations, threads או background. ה־signal של ה־orchestrator מבטל את הקריאה בתקרת הזמן (55 שניות).
2. **הוכחת חיפוש:** חייב להיות לפחות `web_search_call` אחד במצב `completed`; אחרת `PROVIDER_UNAVAILABLE` (`no_search`).
3. `status` חייב להיות `completed` (לא `incomplete` / `failed`), בלי refusal; הפלט מפוענח ונבדק מול ה־Zod schema. כל כשל → `PROVIDER_UNAVAILABLE`, בלי JSON חלקי (ההתנהגות הקיימת ב־orchestrator).
4. **אוסף מקורות מאומתים:** כל ה־URLs מ־`action.sources` של קריאות החיפוש + `url_citation` annotations (עם title כשיש). נרמול: https בלבד, הסרת `#`, פרמטרי `utm_*` ו־`/` בסוף.
5. **מיפוי ל־`Candidate`** (הסכמה הקיימת ב־`researchProvider.ts`) עם בדיקות:
   - כל URL שהמודל ציטט ושאינו ברשימת המקורות המאומתים — **נזרק**. עובדה שנשארה בלי מקור מאומת הופכת ל־null / `unknown` (מחיר → null, כשרות → `unknown`, אווירה → null, מטבח → null, תזונה → `unknown`, שעות → null).
   - `kosher: 'certified'` בלי מקור מאומת → `unknown` (״אתר ללא הוכחת תעודה אינו הופך למסעדה עם תעודה״).
   - `price` עם `min > max`, ערכים שליליים או טווח לא סביר (מעל 3000 ₪) → null.
   - דירוג נשמר רק אם ה־url שלו מאומת ו־`0 ≤ value ≤ scale`.
   - **`primaryRating`** (לשבירת שוויון בלבד): מקור הדירוג הנפוץ ביותר בין המועמדים בבקשה (למשל אותו אתר לכולם), מנורמל לסקאלה 0–5. מועמד בלי דירוג מאותו מקור → null (חוסר מידע, לא אפס). ב־Milestone 5 יוחלף בדירוג Google מ־Places.
   - **קישור:** `websiteUrl` נשמר כ־`official_site` רק אם הדומיין שלו מופיע במקורות המאומתים; אחרת `alternative` = מקור מאומת ראשון של המועמד שמתאר אותו; אחרת null.
   - **זהות וכפילויות:** מועמד בלי שם, עיר, כתובת או לפחות מקור מאומת אחד — **נזרק** (לא משלימים). שני מועמדים עם אותו שם+עיר מנורמלים — נשאר הראשון.
   - `travelMinutes: null`, `travelNote: 'לא ניתן לאמת זמן נסיעה'` (עד Milestone 5).
   - `dataSource: 'live'`, `sources: [{ id, title (או שם הדומיין), url, retrievedAt }]`.
6. מחזיר גם **מדדים** (ללא תוכן): זמן הקריאה, מספר קריאות חיפוש, input / output / reasoning tokens, מודל.

**הלקוח מוזרק** (ממשק קטן `ResponsesClient`) כדי לבדוק הכול בבדיקות אוטומטיות בלי רשת ובלי עלות.

## שלב 5 — שינויים קטנים בקוד הקיים
- **`researchProvider.ts`** — הרחבת `Candidate` בשדות אופציונליים: `factSources` (מזהי מקור לכל פרמטר: price / kosher / atmosphere / cuisine / diet / hours), `textMatches` (לכל token), `description`, `participantNotes`. ספק הדוגמה לא חייב למלא אותם.
- **`matchEvaluator.ts`** — שתי התאמות בלבד, בלי לשנות כללי סטטוס או דירוג:
  - `sourceIds` של כל פרמטר מ־`factSources[param]` כשקיים (אחרת כמו היום).
  - התאמת טקסט היציאה: אם יש `textMatches[token]` לא ריק — `match` ״בתפריט: …״; אחרת חיפוש המילים הקיים.
- **`explainer.ts`** — ההסבר הקבוצתי נשאר מבוסס תבנית (העובדות והסטטוסים) ומתווסף אליו `description` של המודל. הנימוק האישי: התבנית הקיימת, ואחריה `participantNotes[token]` **רק אם** פרמטר האוכל של אותו משתתף הוא `match` — אחרת ההערה מושמטת (כדי שהמודל לא ״יבטיח״ התאמה שהקוד לא אישר).
- **ניקוי טקסט מהמודל:** הסרת תגיות HTML, תווי בקרה, קישורים ו־tokens מסוג `p1` מתוך description / notes; קיצור לפי אורכי הסכמה. טקסט שנשאר ריק מושמט.
- **`orchestrator.ts`** — מעביר את המדדים מהספק לשכבת ה־HTTP.
- **`log.ts` / `app.ts`** — שורת הלוג של בקשה מקבלת שדות מספריים בלבד: `providerMs`, `searchCalls`, `inputTokens`, `outputTokens`, `model`. לא נרשם גוף בקשה, טקסט, כתובת, שמות מסעדות או הסברים. לוודא שמשתנה `OPENAI_LOG` לא מופעל.
- **אפליקציה, `RestaurantCard.tsx`** — מתחת ל״מקורות״: ״המידע נאסף ב־dd.mm.yyyy״ (מ־`retrievedAt` / `searchedAt`). כרטיס בנתונים חיים לא מציג תווית דוגמה (כבר כך). אין שינוי נוסף בממשק.

## שלב 6 — בדיקות אוטומטיות (Vitest, לקוח OpenAI מדומה)
`apps/api/src/search/openai/openaiProvider.test.ts`:
- נשלחת בקשה עם `tool_choice: 'required'`, `store: false`, `reasoning.effort: 'low'`, `max_tool_calls` ו־`max_output_tokens` מההגדרות.
- תשובה בלי `web_search_call` → `PROVIDER_UNAVAILABLE`.
- `status: incomplete` / JSON שבור / שדה חסר → `PROVIDER_UNAVAILABLE`, בלי פלט חלקי.
- קישור או מקור שלא הופיעו בחיפוש → נזרקים; מחיר / דירוג בלי מקור מאומת → null / לא מוצג.
- `certified` בלי מקור → `unknown`.
- מועמד בלי מקור מאומת → לא מגיע לתוצאה; כפילות שם+עיר → פעם אחת.
- מזהי מסעדה ומקור יציבים בין שתי קריאות.
- דירוגים ממקורות שונים נשמרים כל אחד בסקאלה שלו; `primaryRating` רק ממקור אחד עקבי.
- ה־prompt: אין בו שמות (אין לשרת שמות), יש בו שמות להחרגה, טקסט חופשי עטוף כנתונים, כתובת ידנית בלי מספר בית, קואורדינטות מעוגלות, אין קואורדינטות במסלול אזורים.
- ביטול (abort) מהתקרה → `SEARCH_TIMEOUT` (דרך ה־orchestrator).
- הערה אישית של המודל מושמטת כשהאוכל אינו `match`; טקסט עם HTML / קישור מנוקה.
- בדיקות הדירוג וה־MatchEvaluator הקיימות עוברות ללא שינוי (מוכיח שסדר ההתאמה לא תלוי בציון).
- בדיקת לוג: שורת הלוג מכילה רק את השדות המותרים.
- contracts: `excludedRestaurantNames` — אורך ומגבלות.

## שלב 7 — בדיקה חיה ומדידה
סקריפט `apps/api/scripts/measure.ts` (`npm run measure -w apps/api`):
- מריץ ברצף **10 יציאות לדוגמה** (נתונים בדויים, בלי שמות): שילובים של אזורים שונים (תל אביב–יפו, חיפה והקריות, ירושלים והסביבה, באר שבע והנגב, שרון), מסלול זמן נסיעה עם כתובת ידנית, 1–6 משתתפים, צמחוני / טבעוני, כשרות עם תעודה, תקציבים ואווירות שונים, טקסט חופשי (למשל ״פסטה טרייה״), מועד בערב שישי, ובקשת ״המלצות נוספות״ אחת.
- מודד לכל יציאה: זמן כולל, הצלחה / קוד שגיאה, מספר תוצאות, כמה ללא חריגה ידועה (מדד האיכות ב־PRD: לפחות שלוש), מספר קריאות חיפוש ו־tokens.
- כותב דוח ל־`reports/milestone-4-search-times.md`: טבלה + סיכום ״X מתוך 10 עמדו ב־30 שניות״. ללא תוכן אישי (היציאות בדויות). העלות בפועל נבדקת בלוח הבקרה של OpenAI.
- **אם רוב החיפושים לא עמדו ב־30 שניות** — עוצרים ומציגים למשתמש חלופות בשפה פשוטה (פחות מועמדים, `search_context_size: low`, פחות קריאות חיפוש, מודל מהיר יותר), עם הזמנים שנמדדו. לא משנים בלי אישורו.

**בדיקה ידנית של אמינות** (Claude, בדפדפן המובנה): לפחות 3 יציאות מתוך המדידה — פתיחת קישור המסעדה ומקור אחד לכל מסעדה, ובדיקה שהשם, הסניף, המחיר והדירוג תואמים לעמוד. התוצאות נרשמות באותו דוח.

**בדיקה בממשק:** `npm run dev` עם הספק החי — זרימה מלאה ממסך 01 עד 05, פתיחת מקורות, ״המלצות נוספות״ (אין חזרה על מסעדה), ושגיאה (למשל `SEARCH_TIMEOUT_MS` קצר מאוד) שמציגה הודעה וניסיון חוזר. סוגרים את ההרצה בסיום.

## שלב 8 — תיעוד
- **ADR-9** ב־ARCHITECTURE.md: ספק OpenAI — קריאה אחת עם חיפוש מחויב ו־structured output; המודל מחזיר עובדות עם מקורות, והקוד זורק כל עובדה שהמקור שלה לא הופיע בחיפוש; הסברים = תבנית + תיאור מהמודל עם בדיקת סתירה; `excludedRestaurantNames`; מזהי מסעדה ומקור יציבים; מיקום מקורב למודל (עיגול קואורדינטות / הסרת מספר בית); `primaryRating` ממקור נפוץ אחד עד Milestone 5; המודל והתקרות שנבחרו אחרי המדידה.
- עדכון `.env.example` ו־CLAUDE.md (פקודות `check:openai` ו־`measure`, `RESEARCH_PROVIDER`).
- סימון 🟡 ליד Milestone 4 ב־MILESTONES.md.

---

## קבצים
**חדשים:** `apps/api/src/search/openai/{prompt.ts, outputSchema.ts, openaiProvider.ts, sources.ts, sanitize.ts, openaiProvider.test.ts}`, `apps/api/scripts/{checkOpenAI.ts, measure.ts}`, `reports/milestone-4-search-times.md`.
**משתנים:** `apps/api/{package.json, src/config.ts, src/server.ts, src/log.ts, src/http/app.ts, src/search/researchProvider.ts, src/search/matchEvaluator.ts, src/search/explainer.ts, src/search/orchestrator.ts}`, `packages/contracts/src/request.ts` (+ בדיקות), `apps/web/src/{domain/searchRequest.ts, state/searchSession.ts, components/RestaurantCard.tsx}` (+ בדיקות), `.env.example`, `CLAUDE.md`, `spec/ARCHITECTURE.md` (ADR בלבד), `spec/MILESTONES.md` (סימון בלבד), `package-lock.json`.
**לא משתנים:** `ranker.ts`, כללי ה־MatchEvaluator, `fixtureProvider.ts` (נשאר לבדיקות ולמצבי שגיאה).

## מחוץ להיקף (לא בונים עכשיו)
Places, Routes, פתרון כתובת ו־`/v1/places/resolve` (Milestone 5); לב ומועדפים (Milestone 6); הגבלת קצב ופריסה (Milestone 7). אין מסכים חדשים.

## מיפוי ל־Definition of Done
| תנאי | איך נבדק |
|---|---|
| בוצעה קריאת חיפוש ברשת | הספק דוחה תשובה בלי `web_search_call` (בדיקה אוטומטית); `searchCalls > 0` בלוג ובדוח המדידה |
| שמות וסניפים תואמים לקישורים | בדיקה ידנית של 3+ יציאות, רשומה בדוח |
| אין דירוג / מחיר מומצא | עובדה בלי מקור מאומת נזרקת (בדיקה אוטומטית) + בדיקה ידנית |
| פרמטר לא מאומת מסומן; אין תעודה בלי הוכחה | `unknown` במיפוי; `certified` בלי מקור → `unknown` (בדיקה אוטומטית) |
| דירוגים במקורם ובסקאלה שלהם; הסדר לא משתנה בגלל ציון | `ratingsBySource` עם sourceName+scale; בדיקות הדירוג הקיימות |
| חריגת זמן / שגיאת ספק → כשל מובן וניסיון חוזר | בדיקות אוטומטיות + בדיקה בממשק |
| מדידה על 10+ יציאות מול 30 שניות | `npm run measure` והדוח; עצירה עם חלופות אם רובן לא עמדו |
| מפתחות בשרת, שמות לא נשלחים, מגבלת הוצאה הוגדרה | המפתח רק ב־`.env` של השרת (לא `VITE_`); בדיקת prompt; אישור המשתמש בשלב 0 |
