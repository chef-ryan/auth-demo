import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { HttpError, badRequest } from "./errors"
import { login } from "./l3-sdk/auth/login"
import { logout } from "./l3-sdk/auth/logout"
import { getCurrentUser } from "./domain/users/getCurrentUser"
import { getPositions } from "./domain/users/getPositions"
import { getActivity } from "./domain/activity/getActivity"
import { withSession } from "./l3-sdk/withSession"
import { SessionManager } from "./l3-sdk/SessionManager"
import { NonceManager } from "./l3-sdk/NonceManager"

const identitySchema = t.Object({
  account: t.String({ error: "identity.account is required" }),
  namespace: t.String({ error: "identity.namespace is required" }),
  chainId: t.String({ error: "identity.chainId is required" }),
  address: t.String({ error: "identity.address is required" }),
})

export const buildApp = () => {
  const allowedCorsOrigins = [
    /^https?:\/\/([a-z0-9-]+\.)*pancake\.run$/i,
    /^https?:\/\/localhost(?::\d+)?$/i,
  ]

  const app = new Elysia({ name: "l3auth-demo" })
    .use(cors({ origin: allowedCorsOrigins }))
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status
        return {
          error: error.message,
          code: error.code ?? error.status,
        }
      }

      console.error(error)
      set.status = 500
      return { error: "Internal server error", code: 500 }
    })

  app.get("/", () => ({
    status: "ok",
    message: "L3 Authentication demo service",
  }))

  app.get("/auth/nonce", async () => {
    const { nonce, issuedAt } = await NonceManager.create()
    return { nonce, issuedAt }
  })

  app.post(
    "/l3/auth/login",
    async ({ body, set, request }) => {
      const session = await login(body, resolveRequestDomain(request))

      set.headers["Set-Cookie"] = sessionCookieHeader(session.token)

      return session.session
    },
    {
      body: t.Object({
        identity: identitySchema,
        message: t.String({ error: "login message is required" }),
        signature: t.String({
          error: "wallet signature is required",
          pattern: "^0x[a-fA-F0-9]+$",
        }),
        nonce: t.String({ error: "nonce is required" }),
        issuedAt: t.String({ error: "issuedAt is required" }),
      }),
    }
  )

  app.use(
    new Elysia({ name: "l3-protected-routes" })
      .derive(withSession())
      .post("/l3/auth/logout", async ({ session, set }) => {
        await logout(session)
        set.headers["Set-Cookie"] = clearSessionCookieHeader()
        return { success: true }
      })
      .get("/l3/auth/session", ({ session }) => session.session)
      .get("/users/me", ({ session }) => getCurrentUser(session))
      .get("/profiles", ({ userProfile }) => userProfile)
      .get("/positions", ({ userProfile }) => ({
        ...getPositions(),
        user: userProfile,
      }))
      .get("/activity", () => getActivity())
  )

  return app
}
const isSecureCookie = () => process.env.NODE_ENV === "production"

const sessionCookieHeader = (token: string) => {
  const maxAge = SessionManager.SESSION_TTL_SECONDS
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString()
  const attributes = [
    `${SessionManager.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Expires=${expires}`,
  ]
  if (isSecureCookie()) {
    attributes.push("Secure")
  }
  return attributes.join("; ")
}

const clearSessionCookieHeader = () => {
  const attributes = [
    `${SessionManager.SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ]
  if (isSecureCookie()) {
    attributes.push("Secure")
  }
  return attributes.join("; ")
}

const resolveRequestDomain = (request: Request) => {
  const forwardedHost = request.headers.get("x-forwarded-host")
  if (forwardedHost) {
    const [firstHost] = forwardedHost.split(",")
    if (firstHost && firstHost.trim() !== "") {
      return firstHost.trim()
    }
  }

  const headerHost = request.headers.get("host")
  if (headerHost && headerHost.trim() !== "") {
    return headerHost.trim()
  }

  try {
    const url = new URL(request.url)
    if (url.host) {
      return url.host
    }
  } catch {
    // ignore invalid URLs
  }

  throw badRequest("Unable to resolve request domain", 40030)
}
