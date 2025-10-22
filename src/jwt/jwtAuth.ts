import { jwt } from "@elysiajs/jwt"
import { t } from "elysia"
import { sessionStore } from "./sessionStore"
import { unauthorized } from "./errors"
import type { SessionClaims, SessionContext } from "./jwt.types"

export type LoginResult = {
  token: string
  address: string
  loginAt: string
  sessionId: string
  expiresAt: string
}

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24

const SESSION_COOKIE_NAME = "jwt_token"

const bearerToken = (authorization?: string | null) => {
  if (!authorization) return null
  const [scheme, value] = authorization.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !value) return null
  return value.trim()
}

const cookieToken = (cookieHeader?: string | null) => {
  if (!cookieHeader) return null

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rest] = cookie.split("=")
    if (!rawName || rest.length === 0) continue

    const name = rawName.trim().toLowerCase()
    if (name !== SESSION_COOKIE_NAME) continue

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

export class JWTAuth {
  private static instance: JWTAuth
  private readonly schema = t.Object({
    address: t.String(),
    sessionId: t.String(),
    loginAt: t.String(),
  })
  private readonly plugin: ReturnType<typeof jwt>

  private constructor() {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required")
    }
    this.plugin = jwt({
      name: "jwt",
      secret,
      schema: this.schema,
    })
  }

  static getInstance() {
    if (!JWTAuth.instance) {
      JWTAuth.instance = new JWTAuth()
    }
    return JWTAuth.instance
  }

  jwtPlugin() {
    return this.plugin
  }

  async login(address: string): Promise<LoginResult> {
    if (!address) {
      throw new Error("Verified address is required for login")
    }
    const tokenTtlSeconds = DEFAULT_TOKEN_TTL_SECONDS
    const loginAt = new Date().toISOString()
    const sessionId = crypto.randomUUID()
    const currentSeconds = Math.floor(Date.now() / 1000)
    const exp = currentSeconds + tokenTtlSeconds
    const expiresAt = new Date(exp * 1000).toISOString()

    const token = await this.plugin.decorator.jwt.sign({
      address,
      sessionId,
      loginAt,
      exp,
    })

    return {
      token,
      address,
      loginAt,
      sessionId,
      expiresAt,
    }
  }

  async requireSession(request: Request): Promise<SessionContext> {
    await sessionStore.purgeExpired()
    const token =
      bearerToken(request.headers.get("authorization")) ??
      cookieToken(request.headers.get("cookie"))

    if (!token) {
      throw unauthorized("Missing session token")
    }

    const claims = (await this.plugin.decorator.jwt.verify(token)) as
      | SessionClaims
      | false

    if (!claims || !claims.sessionId || !claims.address) {
      throw unauthorized("Invalid or expired token")
    }

    if (claims.exp && claims.exp <= Math.floor(Date.now() / 1000)) {
      throw unauthorized("Token has expired", 40102)
    }

    if (await sessionStore.isRevoked(claims.sessionId)) {
      throw unauthorized("Session has been revoked", 40103)
    }

    return { claims, token }
  }
}
