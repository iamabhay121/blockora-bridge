import { useEffect, useState } from 'react'

const prefix = 'blockora_hedera_'

/**
 * Lightweight session for Hedera forms (no dedicated Working account panel).
 * Prefills after account create / token create; user can edit in each panel.
 */
export function useHederaSession() {
  const [accountId, setAccountId] = useState(() => localStorage.getItem(`${prefix}account_id`) || '')
  const [privateKey, setPrivateKey] = useState(() => localStorage.getItem(`${prefix}private_key`) || '')
  const [tokenId, setTokenId] = useState(() => localStorage.getItem(`${prefix}token_id`) || '')
  const [nftTokenId, setNftTokenId] = useState(() => localStorage.getItem(`${prefix}nft_token_id`) || '')

  useEffect(() => {
    if (accountId) localStorage.setItem(`${prefix}account_id`, accountId)
    else localStorage.removeItem(`${prefix}account_id`)
    if (privateKey) localStorage.setItem(`${prefix}private_key`, privateKey)
    else localStorage.removeItem(`${prefix}private_key`)
  }, [accountId, privateKey])

  useEffect(() => {
    if (tokenId) localStorage.setItem(`${prefix}token_id`, tokenId)
    else localStorage.removeItem(`${prefix}token_id`)
  }, [tokenId])

  useEffect(() => {
    if (nftTokenId) localStorage.setItem(`${prefix}nft_token_id`, nftTokenId)
    else localStorage.removeItem(`${prefix}nft_token_id`)
  }, [nftTokenId])

  return {
    accountId,
    setAccountId,
    privateKey,
    setPrivateKey,
    tokenId,
    setTokenId,
    nftTokenId,
    setNftTokenId,
  }
}
