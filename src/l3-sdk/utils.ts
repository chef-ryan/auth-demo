import type { SignatureVerificationParams } from "./l3auth.types"
import { L1Auth } from "./auth/L1Auth"

export type { SignatureVerificationParams } from "./l3auth.types"

export const verifySignature = (params: SignatureVerificationParams) =>
  L1Auth.verifySignature(params)
