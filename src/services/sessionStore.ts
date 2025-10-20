type SessionRecord = {
  expiresAt: number;
};

export class SessionStore {
  private revokedSessions = new Map<string, SessionRecord>();

  revoke(sessionId: string, expiresAt: number) {
    this.revokedSessions.set(sessionId, { expiresAt });
  }

  isRevoked(sessionId: string) {
    const record = this.revokedSessions.get(sessionId);
    if (!record) return false;

    if (record.expiresAt <= Date.now()) {
      this.revokedSessions.delete(sessionId);
      return false;
    }

    return true;
  }

  purgeExpired() {
    const now = Date.now();
    for (const [sessionId, { expiresAt }] of this.revokedSessions) {
      if (expiresAt <= now) {
        this.revokedSessions.delete(sessionId);
      }
    }
  }
}

export const sessionStore = new SessionStore();
