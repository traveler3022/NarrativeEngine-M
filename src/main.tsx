import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import { wireNotifications } from './adapters/uiToastAdapter'

// Wire the UI toast store as the implementation behind the
// NotificationPort. Services and store slices depend on the port
// (notify.*), not on the toast component — this call is what makes
// those notifications actually appear on screen. Must run before
// any service/store code that calls notify.* at module load.
wireNotifications();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
