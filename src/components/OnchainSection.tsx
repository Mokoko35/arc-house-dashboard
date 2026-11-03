import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useSwitchChain } from 'wagmi'
import { TokenUSDC } from '@web3icons/react'
import { Check, Copy, ExternalLink, Hash, RefreshCw, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { buildAddressExplorerUrl, requireChain } from '@/onchain-facts'
import { ARC_CHAIN_ID, useArcOnchain } from '@/hooks/useArcOnchain'
import { walletConnectEnabled } from '@/config'
import { useI18n } from '@/i18n/useI18n'

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

export function OnchainSection() {
  const { address, isConnected, isConnecting, onArc, usdcBalance, txCount, isLoading, isError, refetch } =
    useArcOnchain()
  const { t, locale } = useI18n()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [copied, setCopied] = useState(false)
  const chain = requireChain(ARC_CHAIN_ID)

  const copy = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('onchain.copyFail'))
    }
  }

  return (
    <section className="card p-5 sm:p-6 lg:p-8" aria-labelledby="onchain-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">{t('onchain.section')}</p>
          <h2 id="onchain-title" className="display mt-1 text-2xl font-semibold">
            {t('onchain.title')}
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected && onArc ? 'bg-[var(--success)]' : 'bg-[var(--subtle)]'}`} />
          {chain.name}
        </span>
      </div>

      {!isConnected ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <Wallet size={22} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="display text-lg font-semibold">{t('onchain.connectTitle')}</p>
            <p className="mt-1 max-w-xs text-pretty text-sm text-[var(--subtle)]">
              {t('onchain.connectDesc', { chain: chain.name })}
            </p>
          </div>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button type="button" onClick={show} disabled={isConnecting} className="btn-primary">
                {isConnecting ? t('onchain.connecting') : t('onchain.connect')}
              </button>
            )}
          </ConnectKitButton.Custom>
          {import.meta.env.DEV && !walletConnectEnabled && (
            <p className="max-w-xs text-pretty text-xs text-[var(--subtle)]">
              {t('onchain.devNote')}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {!onArc && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3">
              <p className="text-sm text-[var(--ink-2)]">{t('onchain.wrongNetwork', { chain: chain.name })}</p>
              <button
                type="button"
                className="btn-ghost"
                disabled={isSwitching}
                onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
              >
                {isSwitching ? t('onchain.switching') : t('onchain.switch', { chain: chain.name })}
              </button>
            </div>
          )}

          <div className="inner p-5">
            <div className="flex items-center justify-between">
              <p className="label">{t('onchain.usdcBalance')}</p>
              <button
                type="button"
                onClick={refetch}
                aria-label={t('onchain.refresh')}
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--ink)]"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <TokenUSDC variant="branded" size={34} />
              {isLoading && !usdcBalance ? (
                <Skeleton className="h-10 w-40" />
              ) : (
                <p className="display text-4xl font-semibold tabular-nums sm:text-5xl">
                  {usdcBalance ? usdcBalance.toFixed(2) : '--'}
                  <span className="ml-2 text-xl font-medium text-[var(--subtle)]">USDC</span>
                </p>
              )}
            </div>
            {usdcBalance?.isZero() && (
              <p className="mt-3 text-sm text-[var(--subtle)]">
                {t('onchain.noUsdc')}
              </p>
            )}
            {isError && <p className="mt-3 text-sm text-[var(--danger)]">{t('onchain.loadError')}</p>}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="inner p-4">
              <p className="label flex items-center gap-1.5">
                <Hash size={12} /> {t('onchain.txCount')}
              </p>
              {txCount === undefined ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="display mt-2 text-3xl font-semibold tabular-nums">{txCount.toLocaleString(locale)}</p>
              )}
            </div>

            <div className="inner p-4">
              <p className="label flex items-center gap-1.5">
                <Wallet size={12} /> {t('onchain.address')}
              </p>
              <p className="mono mt-3 break-all text-[13px] leading-relaxed text-[var(--ink-2)]">{address}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void copy()} className="btn-ghost !min-h-9 !px-3 text-xs">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
                {address && (
                  <a
                    href={buildAddressExplorerUrl(ARC_CHAIN_ID, address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !min-h-9 !px-3 text-xs"
                  >
                    <ExternalLink size={14} /> {t('onchain.explorer')}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
