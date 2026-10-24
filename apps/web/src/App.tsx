import { Navigate, Route, Routes } from 'react-router'
import { OutingProvider } from './state/OutingContext'
import { WhoIsJoiningScreen } from './screens/WhoIsJoiningScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { OutingPreferencesScreen } from './screens/OutingPreferencesScreen'
import { FavoritesScreen } from './screens/FavoritesScreen'

export function App() {
  return (
    <OutingProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<WhoIsJoiningScreen />} />
          <Route path="/people/new" element={<ProfileScreen key="new" />} />
          <Route path="/people/:id" element={<ProfileScreen />} />
          <Route path="/outing/preferences" element={<OutingPreferencesScreen />} />
          <Route path="/favorites" element={<FavoritesScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </OutingProvider>
  )
}
