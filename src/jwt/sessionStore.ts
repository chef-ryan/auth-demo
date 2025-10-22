import { createClient, type RedisClientType } from "@redis/client"

type SessionRecord = {
  expiresAt: number
}

const REDIS_KEY_PREFIX = "revoked-session:"

export interface SessionStore {
  revoke(sessionId: string, expiresAt: number): Promise<void>
  isRevoked(sessionId: string): Promise<boolean>
  purgeExpired(): Promise<void>
}

class MemorySessionStore implements SessionStore {
  private readonly revokedSessions = new Map<string, SessionRecord>()

  async revoke(sessionId: string, expiresAt: number) {
    this.revokedSessions.set(sessionId, { expiresAt })
  }

  async isRevoked(sessionId: string) {
    const record = this.revokedSessions.get(sessionId)
    if (!record) return false

    if (record.expiresAt <= Date.now()) {
      this.revokedSessions.delete(sessionId)
      return false
    }

    return true
  }

  async purgeExpired() {
    const now = Date.now()
    for (const [sessionId, { expiresAt }] of this.revokedSessions) {
      if (expiresAt <= now) {
        this.revokedSessions.delete(sessionId)
      }
    }
  }
}

class RedisSessionStore implements SessionStore {
  private readonly client: RedisClientType
  readonly ready: Promise<void>

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl })
    this.ready = this.client.connect().then(() => {})
  }

  private redisKey(sessionId: string) {
    return `${REDIS_KEY_PREFIX}${sessionId}`
  }

  async revoke(sessionId: string, expiresAt: number) {
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))
    await this.client.set(this.redisKey(sessionId), "1", { EX: ttlSeconds })
  }

  async isRevoked(sessionId: string) {
    const exists = await this.client.exists(this.redisKey(sessionId))
    return exists === 1
  }

  async purgeExpired() {
    // Redis handles expiration via TTL; no action required.
  }
}

async function createSessionStore(): Promise<SessionStore> {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    const redisStore = new RedisSessionStore(redisUrl)
    try {
      await redisStore.ready
      return redisStore
    } catch (error) {
      console.warn(
        "Failed to connect to Redis. Falling back to in-memory session store.",
        error
      )
    }
  }

  return new MemorySessionStore()
}

export const sessionStore: SessionStore = await createSessionStore()
