import { badRequest } from "../errors"
import { nonceStore } from "./stores/KVStore"
import { L3Config } from "./l3.config"
import type { NonceRecord, NonceStatus } from "./l3auth.types"

export class NonceManager {
  static readonly NONCE_TTL_SECONDS = L3Config.NONCE_TTL_FALLBACK_SECONDS
  static readonly MAX_NONCE_AGE_MS = L3Config.NONCE_MAX_AGE_MS

  static async create() {
    const nonce = NonceManager.generateNonce()
    const issuedAt = new Date().toISOString()
    const record: NonceRecord = {
      issuedAt,
      used: 0,
    }
    await nonceStore.set(nonce, record, NonceManager.NONCE_TTL_SECONDS)
    return { nonce, issuedAt }
  }

  static async consume(nonce: string) {
    const record = await nonceStore.get(nonce)
    if (!record) {
      throw badRequest("Invalid or expired nonce", 40020)
    }

    const issuedAt = record.issuedAt
    const issuedAtMs = issuedAt ? Date.parse(issuedAt) : Number.NaN
    if (!issuedAt) {
      await nonceStore.delete(nonce)
      throw badRequest("Invalid nonce metadata", 40022)
    }

    if (Number.isNaN(issuedAtMs)) {
      await nonceStore.delete(nonce)
      throw badRequest("Invalid nonce metadata", 40022)
    }

    if (Date.now() - issuedAtMs > NonceManager.MAX_NONCE_AGE_MS) {
      await nonceStore.delete(nonce)
      throw badRequest("Nonce expired", 40023)
    }

    if (record.used === 1) {
      throw badRequest("Nonce already used", 40021)
    }

    const updated: NonceRecord = { ...record, used: 1 }
    await nonceStore.set(nonce, updated, NonceManager.NONCE_TTL_SECONDS)
    return updated
  }

  static async verify(nonce: string): Promise<NonceStatus> {
    const record = await nonceStore.get(nonce)
    if (!record) {
      return { exists: false, used: 0 }
    }

    return { exists: true, used: record.used }
  }

  private static generateNonce() {
    return crypto.randomUUID().replace(/-/g, "")
  }
}
