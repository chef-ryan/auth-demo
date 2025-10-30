import { describe, expect, it } from "bun:test"
import { privateKeyToAccount } from "viem/accounts"
import type { L3Session, NonceRecord } from "../src/l3-sdk/l3auth.types"
import { buildLoginMessage } from "../src/l3-sdk/auth/buildLoginMessage"
import { NonceManager } from "../src/l3-sdk/NonceManager"
import { nonceStore } from "../src/l3-sdk/stores/KVStore"

process.env.SESSION_TTL_SECONDS = "120"

const { buildApp } = await import("../src/app")

const app = buildApp()
const testAccount = privateKeyToAccount(
  "0x1111111111111111111111111111111111111111111111111111111111111111"
)
const TEST_DOMAIN = "localhost"

type NonceResponse = {
  nonce: string
  issuedAt: string
}

type LogoutResponse = { success: boolean }

type ErrorResponse = {
  error: string
  code?: number
}

type CurrentUserResponse = {
  identity: L3Session["identity"]
  issuedAt: string
  expiresAt: string
}

type PositionsResponse = {
  positions: Array<{
    market: string
    side: string
    size: number
    valueUSD: number
  }>
  user: {
    address: string
    profile: {
      username: string
      displayName: string
      bio: string
    }
  }
}

const call = async <TResponse = unknown>(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string
): Promise<{ response: Response; data: TResponse }> => {
  const headers = new Headers()
  if (body !== undefined) {
    headers.set("Content-Type", "application/json")
  }
  if (cookie) {
    headers.set("Cookie", cookie)
  }

  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const response = await app.handle(request)
  const data = (await response.json()) as TResponse
  return { response, data }
}

const requestNonce = async () => {
  const { response, data } = await call<NonceResponse>("GET", "/auth/nonce")
  expect(response.status).toBe(200)
  return data
}

const buildIdentity = () => ({
  account: `eip155:1:${testAccount.address.toLowerCase()}`,
  namespace: "eip155",
  chainId: "1",
  address: testAccount.address.toLowerCase(),
})

const extractSessionCookie = (setCookie: string | null) => {
  expect(setCookie).toBeTruthy()
  const header = setCookie ?? ""
  return header.split(";")[0]!
}

const login = async () => {
  const noncePayload = await requestNonce()
  const identity = buildIdentity()
  const message = buildLoginMessage({
    identity,
    nonce: noncePayload.nonce,
    issuedAt: noncePayload.issuedAt,
    domain: TEST_DOMAIN,
  })

  const signature = await testAccount.signMessage({
    message,
  })

  const { response, data } = await call<L3Session>(
    "POST",
    "/l3/auth/login",
    {
      identity,
      message,
      signature,
      nonce: noncePayload.nonce,
      issuedAt: noncePayload.issuedAt,
    }
  )

  expect(response.status).toBe(200)
  const cookie = extractSessionCookie(response.headers.get("set-cookie"))
  return { session: data, cookie }
}

describe("authentication flow", () => {
  it("issues a nonce for clients", async () => {
    const first = await call<NonceResponse>("GET", "/auth/nonce")
    expect(first.response.status).toBe(200)
    expect(typeof first.data.nonce).toBe("string")
    expect(first.data.nonce.length).toBeGreaterThan(0)
    expect(typeof first.data.issuedAt).toBe("string")

    const second = await call<NonceResponse>("GET", "/auth/nonce")
    expect(second.response.status).toBe(200)
    expect(second.data.nonce).not.toBe(first.data.nonce)
  })

  it("issues an L3 session after successful login", async () => {
    const { session, cookie } = await login()
    expect(session.identity.account).toBe(buildIdentity().account)
    expect(session.issuedAt).toBeTruthy()
    expect(cookie.startsWith("l3-session=")).toBe(true)
  })

  it("rejects stale nonces", async () => {
    const noncePayload = await requestNonce()
    const staleIssuedAt = new Date(
      Date.now() - (NonceManager.MAX_NONCE_AGE_MS + 60 * 1000)
    ).toISOString()

    const staleRecord: NonceRecord = {
      issuedAt: staleIssuedAt,
      used: 0,
    }

    await nonceStore.set(
      noncePayload.nonce,
      staleRecord,
      NonceManager.NONCE_TTL_SECONDS
    )

    const identity = buildIdentity()
    const message = buildLoginMessage({
      identity,
      nonce: noncePayload.nonce,
      issuedAt: staleIssuedAt,
      domain: TEST_DOMAIN,
    })

    const signature = await testAccount.signMessage({
      message,
    })

    const { response, data } = await call<ErrorResponse>(
      "POST",
      "/l3/auth/login",
      {
        identity,
        message,
        signature,
        nonce: noncePayload.nonce,
        issuedAt: staleIssuedAt,
      }
    )

    expect(response.status).toBe(400)
    expect(data.error).toContain("Nonce expired")
  })

  it("rejects invalid signatures", async () => {
    const noncePayload = await requestNonce()
    const identity = buildIdentity()
    const message = buildLoginMessage({
      identity,
      nonce: noncePayload.nonce,
      issuedAt: noncePayload.issuedAt,
      domain: TEST_DOMAIN,
    })

    const { response, data } = await call<ErrorResponse>(
      "POST",
      "/l3/auth/login",
      {
        identity,
        message,
        signature: "0xdeadbeef",
        nonce: noncePayload.nonce,
        issuedAt: noncePayload.issuedAt,
      }
    )

    expect(response.status).toBe(401)
    expect(data.error).toContain("Signature verification failed")
  })

  it("guards protected routes", async () => {
    const { cookie } = await login()
    const me = await call<CurrentUserResponse>("GET", "/users/me", undefined, cookie)
    expect(me.response.status).toBe(200)
    expect(me.data.identity.account).toBe(buildIdentity().account)

    const unauthorized = await call<ErrorResponse>("GET", "/users/me")
    expect(unauthorized.response.status).toBe(401)
  })

  it("revokes a session on logout", async () => {
    const { cookie } = await login()
    const logoutResponse = await call<LogoutResponse>(
      "POST",
      "/l3/auth/logout",
      undefined,
      cookie
    )
    expect(logoutResponse.response.status).toBe(200)
    expect(logoutResponse.data.success).toBe(true)

    const { response } = await call<ErrorResponse>(
      "GET",
      "/users/me",
      undefined,
      cookie
    )
    expect(response.status).toBe(401)
  })

  it("returns the user profile alongside positions when authenticated", async () => {
    const { cookie } = await login()

    const { response, data } = await call<PositionsResponse>(
      "GET",
      "/positions",
      undefined,
      cookie
    )

    expect(response.status).toBe(200)
    expect(Array.isArray(data.positions)).toBe(true)
    expect(data.user.address).toBe(buildIdentity().address)
    expect(data.user.profile.username).toContain("user-")

    const unauthorized = await call<ErrorResponse>("GET", "/positions")
    expect(unauthorized.response.status).toBe(401)
  })

  it("supports using an existing session cookie manually", async () => {
    const { cookie } = await login()

    const headers = new Headers({
      Cookie: cookie,
    })

    const request = new Request("http://localhost/users/me", {
      method: "GET",
      headers,
    })

    const response = await app.handle(request)
    const data = (await response.json()) as CurrentUserResponse

    expect(response.status).toBe(200)
    expect(data.identity.address).toBe(buildIdentity().address)
  })
})
