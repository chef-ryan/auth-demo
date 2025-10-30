import type {
  KVStoreDriver,
  KVStoreOptions,
  L3Session,
  NonceRecord,
} from "../l3auth.types"
import { MemoryStore } from "./MemoryStore"
import { RedisStore } from "./RedisStore"
import { L3Config } from "../l3.config"

export class KVStore<TValue> implements KVStoreDriver<TValue> {
  private constructor(private readonly store: KVStoreDriver<TValue>) {}

  static sessionStore: KVStore<L3Session>
  static nonceStore: KVStore<NonceRecord>

  static async create<TValue>(
    options: KVStoreOptions = {}
  ): Promise<KVStore<TValue>> {
    const {
      redisUrl = L3Config.REDIS_URL,
      prefix = L3Config.KV_STORE_PREFIX,
    } = options
    if (redisUrl) {
      const redisStore = new RedisStore<TValue>(redisUrl, prefix)
      try {
        await redisStore.ready
        return new KVStore(redisStore)
      } catch (error) {
        console.warn(
          "Failed to connect to Redis. Falling back to in-memory session store.",
          error
        )
      }
    }

    return new KVStore(new MemoryStore<TValue>())
  }

  set(token: string, value: TValue, ttlSeconds: number) {
    return this.store.set(token, value, ttlSeconds)
  }

  get(token: string) {
    return this.store.get(token)
  }

  delete(token: string) {
    return this.store.delete(token)
  }
}

export const kvStore = await KVStore.create<L3Session>()
export const nonceStore = await KVStore.create<NonceRecord>({
  prefix: L3Config.NONCE_STORE_PREFIX,
})

KVStore.sessionStore = kvStore
KVStore.nonceStore = nonceStore

export { MemoryStore } from "./MemoryStore"
export { RedisStore } from "./RedisStore"
