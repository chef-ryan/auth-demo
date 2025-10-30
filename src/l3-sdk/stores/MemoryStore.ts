type MemoryRecord<TValue> = {
  value: TValue
  expiresAt: number
}

export class MemoryStore<TValue> {
  private readonly records = new Map<string, MemoryRecord<TValue>>()

  async set(token: string, value: TValue, ttlSeconds: number) {
    this.records.set(token, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async get(token: string) {
    const record = this.records.get(token)
    if (!record) return null

    if (record.expiresAt <= Date.now()) {
      this.records.delete(token)
      return null
    }

    return record.value
  }

  async delete(token: string) {
    this.records.delete(token)
  }
}
