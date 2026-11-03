import '../tracing'
import '../console-capture'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LiquidationApp from './LiquidationApp'
import { installShareSync } from '../lib/share'
import '../index.css'

installShareSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiquidationApp />
  </StrictMode>,
)
