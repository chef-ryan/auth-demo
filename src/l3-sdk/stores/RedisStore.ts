import { createClient, type RedisClientType } from "@redis/client"

export class RedisStore<TValue> {
  private readonly client: RedisClientType
  private readonly prefix: string
  readonly ready: Promise<void>

  constructor(redisUrl: string, prefix: string) {
    this.prefix = prefix.endsWith(":") ? prefix.slice(0, -1) : prefix
    this.client = createClient({ url: redisUrl })
    this.ready = this.client.connect().then(() => {})
  }

  private key(token: string) {
    return `${this.prefix}:${token}`
  }

  async set(token: string, value: TValue, ttlSeconds: number) {
    await this.client.set(this.key(token), JSON.stringify(value), {
      EX: Math.max(1, Math.floor(ttlSeconds)),
    })
  }

  async get(token: string) {
    const raw = await this.client.get(this.key(token))
    if (!raw) return null
    try {
      return JSON.parse(raw) as TValue
    } catch {
      return null
    }
  }

  async delete(token: string) {
    await this.client.del(this.key(token))
  }
}
