import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { wireAllAdapters } from './adapters'

// Wire all 6 port adapters BEFORE React mounts.
// Per Phase 3.3 W0: advances RF-001..RF-007 to 'infrastructure-ready'.
// Per Phase 3.4 R-08: single function prevents 'forgot to wire' bug.
// Idempotent — safe to call again (e.g., in HMR or tests).
wireAllAdapters();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
