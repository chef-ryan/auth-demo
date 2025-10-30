import { badRequest } from "../../errors"
import type { AuthIdentity } from "../l3auth.types"

const EIP155_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
const NAMESPACE_REGEX = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const CHAIN_ID_REGEX = /^[a-zA-Z0-9\-_]+$/

export const normalizeIdentity = (identity: AuthIdentity): AuthIdentity => {
  const account = identity.account.trim()
  const namespace = identity.namespace.trim()
  const chainId = identity.chainId.trim()
  const address = identity.address.trim()

  if (!account || !namespace || !chainId || !address) {
    throw badRequest("identity fields must be non-empty", 40001)
  }

  if (!NAMESPACE_REGEX.test(namespace)) {
    throw badRequest("identity.namespace is not CAIP-2 compliant", 40002)
  }

  if (!CHAIN_ID_REGEX.test(chainId)) {
    throw badRequest("identity.chainId is not CAIP-2 compliant", 40003)
  }

  const parts = account.split(":")
  if (parts.length !== 3) {
    throw badRequest("identity.account must be a CAIP-10 identifier", 40004)
  }

  const [accountNamespace, accountChainId, accountAddress] = parts
    .map((part) => part.trim())
    .slice(0, 3) as [string, string, string]

  if (accountNamespace !== namespace) {
    throw badRequest("identity.account namespace mismatch", 40005)
  }

  if (accountChainId !== chainId) {
    throw badRequest("identity.account chainId mismatch", 40006)
  }

  const normalizedAddress = normalizeAddress(namespace, address)
  const normalizedAccountAddress = normalizeAddress(namespace, accountAddress)

  if (normalizedAddress !== normalizedAccountAddress) {
    throw badRequest("identity.account address mismatch", 40007)
  }

  return {
    account: `${namespace}:${chainId}:${normalizedAddress}`,
    namespace,
    chainId,
    address: normalizedAddress,
  }
}

const normalizeAddress = (namespace: string, address: string) => {
  switch (namespace) {
    case "eip155":
      if (!EIP155_ADDRESS_REGEX.test(address)) {
        throw badRequest("identity.address must be a valid Ethereum address", 40008)
      }
      return address.toLowerCase()
    default:
      if (!address) {
        throw badRequest("identity.address must be provided", 40009)
      }
      return address
  }
}
