import type {
  AuthIdentity,
  L3Session,
  SessionContext,
} from "./l3auth.types"
import { kvStore } from "./stores/KVStore"
import { unauthorized } from "./errors"
import { L3Config } from "./l3.config"

export class SessionManager {
  static readonly SESSION_COOKIE_NAME = L3Config.SESSION_COOKIE_NAME

  static readonly SESSION_TTL_SECONDS = L3Config.SESSION_TTL_SECONDS

  static async createSession(identity: AuthIdentity): Promise<SessionContext> {
    const issuedAt = new Date().toISOString()
    const expiresAt = new Date(
      Date.now() + L3Config.SESSION_TTL_SECONDS * 1000
    ).toISOString()

    const session: L3Session = {
      identity,
      issuedAt,
      expiresAt,
    }

    const token = SessionManager.generateToken()
    await kvStore.set(token, session, L3Config.SESSION_TTL_SECONDS)

    return { token, session }
  }

  static getSession(token: string) {
    return kvStore.get(token)
  }

  static invalidateSession(token: string) {
    return kvStore.delete(token)
  }

  static async verifyL3Token(token: string | null | undefined) {
    if (!token) {
      throw unauthorized("Missing L3 session", 40110)
    }

    const session = await SessionManager.getSession(token)
    if (!session) {
      throw unauthorized("Invalid or expired L3 session", 40111)
    }

    return { token, session }
  }

  static async requireSessionFromRequest(request: Request) {
    const authToken = SessionManager.readAuthorizationHeader(
      request.headers.get("authorization")
    )
    const cookieToken = SessionManager.readSessionCookie(
      request.headers.get("cookie")
    )
    const token = authToken ?? cookieToken
    return SessionManager.verifyL3Token(token)
  }

  static readAuthorizationHeader(authHeader: string | null) {
    if (!authHeader) return null

    const trimmed = authHeader.trim()
    if (!trimmed) return null

    const [scheme, ...rest] = trimmed.split(/\s+/)
    if (!scheme || scheme.toLowerCase() !== "bearer") return null

    const token = rest.join(" ").trim()
    return token.length > 0 ? token : null
  }

  static readSessionCookie(cookieHeader: string | null) {
    if (!cookieHeader) return null

    for (const cookie of cookieHeader.split(";")) {
      const [rawName, ...rest] = cookie.split("=")
      if (!rawName || rest.length === 0) continue
      if (rawName.trim().toLowerCase() !== SessionManager.SESSION_COOKIE_NAME)
        continue

      const rawValue = rest.join("=").trim()
      if (!rawValue) continue

      const value = rawValue.replace(/^"|"$/g, "")
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }

    return null
  }

  private static generateToken() {
    return crypto.randomUUID().replace(/-/g, "")
  }
}
