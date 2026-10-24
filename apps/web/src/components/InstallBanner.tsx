import { useState } from 'react'
import { dismissInstallHint, isInstallHintDismissed, isIOS, isStandalone } from '../platform/install'
import { CloseIcon } from './icons'

const IOS_TEXT = 'להתקנה: לחצו על כפתור השיתוף ב־Safari ובחרו ׳הוספה למסך הבית׳.'
const CHROME_TEXT = 'להתקנה: פתחו את תפריט Chrome ובחרו ׳התקנת האפליקציה׳.'

/** Shown only when opened in a browser tab (not from the home-screen icon). */
export function InstallBanner() {
  const [visible, setVisible] = useState(() => !isStandalone() && !isInstallHintDismissed())
  if (!visible) return null

  return (
    <div className="install-banner" role="note">
      <p>{isIOS() ? IOS_TEXT : CHROME_TEXT}</p>
      <button
        type="button"
        className="icon-btn"
        aria-label="סגירת ההנחיה"
        onClick={() => {
          dismissInstallHint()
          setVisible(false)
        }}
      >
        <CloseIcon />
      </button>
    </div>
  )
}
