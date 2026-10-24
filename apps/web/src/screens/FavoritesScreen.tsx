import { ScreenHeader } from '../components/ScreenHeader'
import { BottomNav } from '../components/BottomNav'

/** Screen 06 — "המועדפים שלי". Milestone 1 shows the empty state only. */
export function FavoritesScreen() {
  return (
    <>
      <main className="screen screen--with-nav">
        <ScreenHeader title="המועדפים שלי" />
        <p className="muted">המסעדות ששמרתם במכשיר</p>
        <p className="empty-state">עוד לא שמרתם מסעדות במועדפים</p>
      </main>
      <BottomNav />
    </>
  )
}
