import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { OutingProvider } from './state/OutingContext'
import { WhoIsJoiningScreen } from './screens/WhoIsJoiningScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { OutingPreferencesScreen } from './screens/OutingPreferencesScreen'
import { OutingSettingsScreen } from './screens/OutingSettingsScreen'
import { FavoritesScreen } from './screens/FavoritesScreen'

/** Each screen opens at its top, not at the previous screen's scroll position. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <OutingProvider>
      <ScrollToTop />
      <div className="app">
        <Routes>
          <Route path="/" element={<WhoIsJoiningScreen />} />
          <Route path="/people/new" element={<ProfileScreen key="new" />} />
          <Route path="/people/:id" element={<ProfileScreen />} />
          <Route path="/outing/preferences" element={<OutingPreferencesScreen />} />
          <Route path="/outing/settings" element={<OutingSettingsScreen />} />
          <Route path="/favorites" element={<FavoritesScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </OutingProvider>
  )
}
