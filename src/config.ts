/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 *
 * Wallet options shown by ConnectKit:
 * - Browser extensions (injected) on desktop
 * - WalletConnect (QR on desktop, deep links to installed wallets on mobile) when
 *   VITE_WALLETCONNECT_PROJECT_ID is set
 * - Coinbase Wallet
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'
import { getDefaultConfig } from 'connectkit'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

const APP_NAME = 'Arc House Dashboard'
const projectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim()

/** True when a WalletConnect project ID is configured, so mobile wallets can connect. */
export const walletConnectEnabled = Boolean(projectId)

const chains = [arcTestnet, mainnet] as const // mainnet needed for ENS resolution
const transports = {
  [arcTestnet.id]: http(),
  [mainnet.id]: http(),
}

export const config = projectId
  ? createConfig(
      getDefaultConfig({
        chains,
        transports,
        walletConnectProjectId: projectId,
        appName: APP_NAME,
        appDescription: 'Your Arc Testnet wallet, Arc House profile, and GitHub stats in one place.',
        appUrl: window.location.origin,
      }),
    )
  : createConfig({
      chains,
      transports,
      connectors: [injected(), coinbaseWallet({ appName: APP_NAME })],
    })

if (!projectId) {
  console.warn(
    'VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect (mobile wallets) is disabled; only browser extensions and Coinbase Wallet are available.',
  )
}
