import '../tracing'
import '../console-capture'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import IptvApp from './IptvApp'
import { installShareSync } from '../lib/share'
import '../index.css'

installShareSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IptvApp />
  </StrictMode>,
)
