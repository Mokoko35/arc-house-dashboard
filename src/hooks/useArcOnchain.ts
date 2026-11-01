import { useAccount, useReadContract, useTransactionCount } from 'wagmi'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

export const ARC_CHAIN_ID = arcTestnet.id

/** Live Arc Testnet reads for the connected wallet. USDC comes from the ERC-20 view (6 decimals). */
export function useArcOnchain() {
  const { address, isConnected, isConnecting, chainId } = useAccount()
  const usdc = getUsdc(ARC_CHAIN_ID)

  const balance = useReadContract({
    address: usdc?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && usdc), refetchInterval: 10_000 },
  })

  const nonce = useTransactionCount({
    address,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 10_000 },
  })

  const usdcBalance =
    balance.data !== undefined ? Amount.fromRaw(balance.data, usdcDecimalsFor(ARC_CHAIN_ID)) : undefined

  return {
    address,
    isConnected,
    isConnecting,
    onArc: chainId === ARC_CHAIN_ID,
    usdcBalance,
    txCount: nonce.data,
    isLoading: balance.isLoading || nonce.isLoading,
    isError: balance.isError || nonce.isError,
    refetch: () => {
      void balance.refetch()
      void nonce.refetch()
    },
  }
}
