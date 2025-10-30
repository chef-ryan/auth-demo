export interface AuthIdentity {
  /**
   * CAIP-10 account identifier, e.g. "eip155:1:0x1234..."
   */
  account: string
  /**
   * Chain namespace per CAIP-2, e.g. "eip155" | "solana"
   */
  namespace: string
  /**
   * Chain or network identifier, e.g. "1", "56", "mainnet-beta"
   */
  chainId: string
  /**
   * Raw wallet address or public key, e.g. "0x1234..." | "9xQeWvG..."
   */
  address: string
}

export interface L3AuthRequest {
  identity: AuthIdentity
  message: string
  signature: string
  nonce: string
  issuedAt: string
}

export interface L3Session {
  identity: AuthIdentity
  issuedAt: string
  expiresAt: string
}

export type SessionContext = {
  token: string
  session: L3Session
}

export type LoginResponse = L3Session & {
  l3Session: string
}

type GetProfileFn = typeof import("../domain/users/getProfile")["getProfile"]

export type L3UserProfile = Awaited<ReturnType<GetProfileFn>>

export type SessionWithProfile = {
  session: SessionContext
  userProfile: L3UserProfile
}

export type NonceStatus = {
  exists: boolean
  used: 0 | 1
}

export type KVStoreDriver<TValue> = {
  set(token: string, value: TValue, ttlSeconds: number): Promise<void>
  get(token: string): Promise<TValue | null>
  delete(token: string): Promise<void>
}

export type KVStoreOptions = {
  redisUrl?: string
  prefix?: string
}

export type NonceRecord = {
  issuedAt: string
  used: 0 | 1
}

export type SignatureVerificationParams = {
  identity: AuthIdentity
  message: string
  signature: string
}
