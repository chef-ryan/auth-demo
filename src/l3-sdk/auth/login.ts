import { unauthorized } from "../errors"
import { authLogger } from "../../services/logger"
import { normalizeIdentity } from "./identity"
import type { L3AuthRequest } from "../l3auth.types"
import { SessionManager } from "../SessionManager"
import { verifySignature } from "../utils"
import { NonceManager } from "../NonceManager"
import { buildLoginMessage } from "./buildLoginMessage"
import { badRequest } from "../../errors"

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
  const nonceRecord = await NonceManager.consume(nonce)

  const expectedIssuedAt = nonceRecord.issuedAt
  if (!expectedIssuedAt) {
    throw badRequest("Invalid nonce metadata", 40022)
  }

  if (issuedAt !== expectedIssuedAt) {
    authLogger.warn({
      type: "login_failure",
      account: normalizedIdentity.account,
      reason: "issued_at_mismatch",
    })
    throw badRequest("Login issuedAt mismatch", 40011)
  }

  const expectedMessage = buildLoginMessage({
    identity: normalizedIdentity,
    nonce,
    issuedAt: expectedIssuedAt,
    domain,
  })

  if (message !== expectedMessage) {
    authLogger.warn({
      type: "login_failure",
      account: normalizedIdentity.account,
      reason: "message_mismatch",
    })
    throw badRequest("Login message mismatch", 40012)
  }

  const verified = await verifySignature({
    identity: normalizedIdentity,
    message,
    signature,
  })

  if (!verified) {
    authLogger.warn({
      type: "login_failure",
      account: normalizedIdentity.account,
      reason: "signature_verification_failed",
    })
    throw unauthorized("Signature verification failed", 40101)
  }

  return SessionManager.createSession(normalizedIdentity)
}
