import { authLogger } from "../../services/logger"
import { normalizeIdentity } from "./identity"
import type { L3AuthRequest } from "../l3auth.types"
import { SessionManager } from "../SessionManager"
import { L1Auth } from "./L1Auth"

export const login = async (
  {
    identity,
    message,
    signature,
    nonce,
    issuedAt,
  }: L3AuthRequest,
  domain: string
) => {
  const normalizedIdentity = normalizeIdentity(identity)
  const verification = await L1Auth.verify({
    identity: normalizedIdentity,
    message,
    signature,
    nonce,
    issuedAt,
    domain,
  })

  if (!verification.success) {
    const { reason, error } = verification

    if (reason !== "invalid_nonce_metadata") {
      authLogger.warn({
        type: "login_failure",
        account: normalizedIdentity.account,
        reason,
      })
    }

    throw error
  }

  return SessionManager.createSession(normalizedIdentity)
}
