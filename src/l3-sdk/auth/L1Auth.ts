import { getAddress, verifyMessage } from "viem"
import { NonceManager } from "../NonceManager"
import { L3Config } from "../l3.config"
import { badRequest } from "../../errors"
import { unauthorized } from "../errors"
import type {
  AuthIdentity,
  NonceRecord,
  SignatureVerificationParams,
} from "../l3auth.types"

export type BuildLoginMessageParams = {
  identity: AuthIdentity
  nonce: string
  issuedAt: string
  domain: string
}

export type L1VerifyParams = SignatureVerificationParams & {
  nonce: string
  issuedAt: string
  domain: string
}

export type L1VerifyFailureReason =
  | "invalid_nonce_metadata"
  | "issued_at_mismatch"
  | "message_mismatch"
  | "signature_verification_failed"

type L1VerifySuccess = {
  success: true
  nonceRecord: NonceRecord
}

type L1VerifyFailure = {
  success: false
  reason: L1VerifyFailureReason
  error: Error
}

export type L1VerifyResult = L1VerifySuccess | L1VerifyFailure

export class L1Auth {
  static async verify({
    identity,
    message,
    signature,
    nonce,
    issuedAt,
    domain,
  }: L1VerifyParams): Promise<L1VerifyResult> {
    const nonceRecord = await NonceManager.consume(nonce)

    const expectedIssuedAt = nonceRecord.issuedAt
    if (!expectedIssuedAt) {
      return {
        success: false,
        reason: "invalid_nonce_metadata",
        error: badRequest("Invalid nonce metadata", 40022),
      }
    }

    if (issuedAt !== expectedIssuedAt) {
      return {
        success: false,
        reason: "issued_at_mismatch",
        error: badRequest("Login issuedAt mismatch", 40011),
      }
    }

    const expectedMessage = L1Auth.buildLoginMessage({
      identity,
      nonce,
      issuedAt: expectedIssuedAt,
      domain,
    })

    if (message !== expectedMessage) {
      return {
        success: false,
        reason: "message_mismatch",
        error: badRequest("Login message mismatch", 40012),
      }
    }

    const signatureValid = await L1Auth.verifySignature({
      identity,
      message,
      signature,
    })

    if (!signatureValid) {
      return {
        success: false,
        reason: "signature_verification_failed",
        error: unauthorized("Signature verification failed", 40101),
      }
    }

    return { success: true, nonceRecord }
  }

  static buildLoginMessage({
    identity,
    nonce,
    issuedAt,
    domain,
  }: BuildLoginMessageParams) {
    const chainReference = `${identity.namespace}:${identity.chainId}`

    return [
      `${domain} wants you to sign in with your account: ${identity.account}`,
      `domain: ${domain}`,
      `Version: ${L3Config.AUTH_MESSAGE_VERSION}`,
      `Chain ID: ${chainReference}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join("\n")
  }

  static async verifySignature({
    identity,
    message,
    signature,
  }: SignatureVerificationParams) {
    if (identity.namespace !== "eip155") {
      return false
    }

    if (!isEip155Address(identity.address)) {
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
}

const isEip155Address = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)
