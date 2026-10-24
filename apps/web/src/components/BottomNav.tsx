import { NavLink } from 'react-router'
import { HeartIcon, PlusIcon } from './icons'

// Two items only (DESIGN 1.1). In RTL the first item sits on the right.
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      <NavLink to="/" end className="nav-item">
        <PlusIcon />
        <span>יציאה חדשה</span>
      </NavLink>
      <NavLink to="/favorites" className="nav-item">
        <HeartIcon />
        <span>מועדפים</span>
      </NavLink>
    </nav>
  )
}
