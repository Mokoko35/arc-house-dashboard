import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitButton, ConnectKitProvider } from 'connectkit'
import { WagmiProvider, useAccount, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { TokenUSDC } from '@web3icons/react'
import { ExternalLink, Loader2, X } from 'lucide-react'
import { config } from '@/config'
import { ARC_CHAIN_ID } from '@/hooks/useArcOnchain'
import { buildTxExplorerUrl, getUsdc, requireChain } from '@/onchain-facts'
import { Amount, parseAmount, usdcDecimalsFor } from '@/onchain-money'

const queryClient = new QueryClient()
const QUICK = ['1', '5', '10']

function parseTipAmount(text: string): Amount | null {
  try {
    const a = parseAmount(ARC_CHAIN_ID, text.trim())
    return a.isPositive() ? a : null
  } catch {
    return null
  }
}

function errorText(error: Error | null): string | null {
  if (!error) return null
  const m = error.message.toLowerCase()
  if (m.includes('user rejected') || m.includes('denied')) return 'İşlem cüzdanda iptal edildi.'
  if (m.includes('insufficient')) return 'Bakiye yetersiz.'
  return 'İşlem gönderilemedi. Tekrar dene.'
}

function TipInner({ provider, listName, onClose }: { provider: `0x${string}`; listName: string; onClose: () => void }) {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [amountText, setAmountText] = useState('1')
  const chain = requireChain(ARC_CHAIN_ID)
  const usdc = getUsdc(ARC_CHAIN_ID)
  const amount = parseTipAmount(amountText)

  const balance = useReadContract({
    address: usdc?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && usdc) },
  })
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })

  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID
  const balanceAmount = balance.data !== undefined ? Amount.fromRaw(balance.data, usdcDecimalsFor(ARC_CHAIN_ID)) : undefined
  const insufficient = Boolean(amount && balanceAmount && amount.gt(balanceAmount))
  const confirming = Boolean(hash) && receipt.isLoading

  const send = () => {
    if (!amount || !usdc) return
    writeContract({ address: usdc.address as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [provider, amount.raw], chainId: ARC_CHAIN_ID })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="USDC bahşiş" className="w-full max-w-md rounded-t-3xl border border-white/15 bg-[#0f2036] p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <TokenUSDC variant="branded" size={32} />
            <div>
              <h2 className="display text-xl font-semibold leading-tight">USDC ile destek</h2>
              <p className="text-xs text-[var(--subtle)]">{listName} · {chain.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>

        <p className="mono mt-4 break-all rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[var(--ink-2)]">
          <span className="label mb-1 block">Alıcı adres</span>
          {provider}
        </p>

        <div className="mt-4">
          <label htmlFor="tip-amount" className="label mb-1.5 block">Tutar (USDC)</label>
          <input id="tip-amount" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} className="field tabular-nums" aria-invalid={!amount} />
          <div className="mt-2 flex gap-2">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setAmountText(q)} className="btn-ghost !min-h-9 !px-3 text-xs">{q} USDC</button>
            ))}
          </div>
          {!amount && <p className="mt-1.5 text-xs text-[var(--danger)]">Geçerli bir tutar gir.</p>}
          {balanceAmount && <p className="mt-1.5 text-xs tabular-nums text-[var(--subtle)]">Bakiyen: {balanceAmount.toFixed(2)} USDC</p>}
          {insufficient && <p className="mt-1 text-xs text-[var(--danger)]">Bakiye yetersiz. Kenar çubuğundaki "Get test USDC" ile test USDC alabilirsin.</p>}
        </div>

        <div className="mt-5">
          {!isConnected ? (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button type="button" onClick={show} className="btn-primary w-full">Cüzdanı bağla</button>
              )}
            </ConnectKitButton.Custom>
          ) : wrongChain ? (
            <button type="button" disabled={switching} onClick={() => switchChain({ chainId: ARC_CHAIN_ID })} className="btn-primary w-full">
              {switching ? 'Geçiliyor...' : `${chain.name} ağına geç`}
            </button>
          ) : (
            <button type="button" onClick={send} disabled={!amount || insufficient || isPending || confirming || receipt.isSuccess} className="btn-primary w-full">
              {(isPending || confirming) && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {isPending ? 'Cüzdanda onayla...' : confirming ? 'Onay bekleniyor...' : receipt.isSuccess ? 'Gönderildi' : 'Bahşiş gönder'}
            </button>
          )}
        </div>

        {errorText(error) && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{errorText(error)}</p>}
        {receipt.isSuccess && hash && (
          <p className="mt-3 text-sm text-[var(--success)]">
            Teşekkürler, bahşiş gönderildi.{' '}
            <a href={buildTxExplorerUrl(ARC_CHAIN_ID, hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              Gezginde gör <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
        )}
        <p className="mt-4 text-center text-xs text-[var(--subtle)]">Gönderim Arc Testnet üzerindedir ve geri alınamaz.</p>
      </div>
    </div>
  )
}

/** Loaded on demand, so the wallet code is not part of the player's first download. */
export default function TipModule(props: { provider: `0x${string}`; listName: string; onClose: () => void }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight" options={{ language: 'tr-TR', initialChainId: ARC_CHAIN_ID }}>
          <TipInner {...props} />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
