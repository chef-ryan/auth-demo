import { getAddress, verifyMessage } from "viem"
import type { AuthIdentity, SignatureVerificationParams } from "./l3auth.types"

export type { SignatureVerificationParams } from "./l3auth.types"

export const verifySignature = async ({
  identity,
  message,
  signature,
}: SignatureVerificationParams) => {
  if (identity.namespace !== "eip155") {
    return false
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(identity.address)) {
    return false
  }

  try {
    const address = getAddress(identity.address)
    return await verifyMessage({
      address,
      message,
      signature: signature as `0x${string}`,
    })
  } catch {
    return false
  }
}
