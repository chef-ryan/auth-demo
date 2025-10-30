import type {
  AuthIdentity,
  L3Session,
  L3AuthRequest,
} from "../l3-sdk/l3auth.types"

type CredentialsMode = "omit" | "same-origin" | "include"

export type NonceResponse = {
  nonce: string
  issuedAt: string
}

export type LogoutResponse = { success: boolean }

export type ErrorResponse = {
  error?: string
  code?: number
  [key: string]: unknown
}

export type L3AuthClientOptions = {
  baseUrl?: string
  fetch?: typeof fetch
  credentials?: CredentialsMode
  defaultHeaders?: Record<string, string>
  authMessageDomain?: string
  authMessageVersion?: string
}

export type LoginParams = {
  identity: AuthIdentity
  signature: string
  nonce: string
  issuedAt: string
  message?: string
}

export class L3AuthClientError<TError = unknown> extends Error {
  readonly status: number
  readonly data?: TError

  constructor(message: string, status: number, data?: TError) {
    super(message)
    this.name = "L3AuthClientError"
    this.status = status
    this.data = data
  }
}

const DEFAULT_AUTH_DOMAIN = "prob.market"
const DEFAULT_AUTH_VERSION = "1"

const readGlobalEnv = (key: string) => {
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key]
    if (value !== undefined && value !== "") {
      return value
    }
  }
  return undefined
}

const readGlobalLocationHost = () => {
  const globalScope = globalThis as { location?: { host?: string } }
  const host = globalScope.location?.host
  return host && host !== "" ? host : undefined
}

export class L3AuthClient {
  readonly baseUrl: string
  readonly credentials: CredentialsMode
  readonly authMessageDomain: string
  readonly authMessageVersion: string

  private readonly fetchFn: typeof fetch
  private readonly defaultHeaders: Record<string, string>

  constructor(options: L3AuthClientOptions = {}) {
    const {
      baseUrl = "",
      fetch: fetchFn = globalThis.fetch,
      credentials = "include",
      defaultHeaders = {},
      authMessageDomain,
      authMessageVersion,
    } = options

    if (typeof fetchFn !== "function") {
      throw new Error(
        "fetch is not available in this environment. Provide a fetch implementation via options.fetch."
      )
    }

    this.fetchFn = fetchFn
    this.credentials = credentials
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.defaultHeaders = { ...defaultHeaders }
    this.authMessageDomain =
      authMessageDomain ??
      readGlobalEnv("AUTH_MESSAGE_DOMAIN") ??
      readGlobalLocationHost() ??
      DEFAULT_AUTH_DOMAIN
    this.authMessageVersion =
      authMessageVersion ??
      readGlobalEnv("AUTH_MESSAGE_VERSION") ??
      DEFAULT_AUTH_VERSION
  }

  async requestNonce(): Promise<NonceResponse> {
    return this.jsonRequest("GET", "/auth/nonce")
  }

  buildLoginMessage(identity: AuthIdentity, nonce: string, issuedAt: string): string {
    const chainReference = `${identity.namespace}:${identity.chainId}`

    return [
      `${this.authMessageDomain} wants you to sign in with your account: ${identity.account}`,
      `domain: ${this.authMessageDomain}`,
      `Version: ${this.authMessageVersion}`,
      `Chain ID: ${chainReference}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join("\n")
  }

  async login(params: LoginParams): Promise<L3Session> {
    const { message, ...rest } = params
    const payload: L3AuthRequest = {
      ...rest,
      message:
        message ??
        this.buildLoginMessage(params.identity, params.nonce, params.issuedAt),
    }

    return this.jsonRequest("POST", "/l3/auth/login", payload)
  }

  async getSession(): Promise<L3Session> {
    return this.jsonRequest("GET", "/l3/auth/session")
  }

  async logout(): Promise<LogoutResponse> {
    return this.jsonRequest("POST", "/l3/auth/logout")
  }

  private async jsonRequest<TResponse>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<TResponse> {
    const url = this.resolveUrl(path)
    const headers: Record<string, string> = { ...this.defaultHeaders }
    const init: RequestInit = {
      method,
      credentials: this.credentials,
      headers,
    }

    if (body !== undefined) {
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json"
      }
      init.body = JSON.stringify(body)
    }

    const response = await this.fetchFn(url, init)

    let data: unknown
    let raw: string | null = null

    try {
      raw = await response.text()
    } catch {
      raw = null
    }

    if (raw && raw.length > 0) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
    }

    if (!response.ok) {
      throw new L3AuthClientError(
        `Request failed with status ${response.status}`,
        response.status,
        data
      )
    }

    return data as TResponse
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`

    if (!this.baseUrl) {
      return normalizedPath
    }

    if (normalizedPath === "/" && this.baseUrl) {
      return this.baseUrl
    }

    return `${this.baseUrl}${normalizedPath}`
  }
}

const normalizeBaseUrl = (input: string) => {
  if (!input) {
    return ""
  }

  if (/^https?:\/\//i.test(input)) {
    return input.replace(/\/+$/, "")
  }

  if (input === "/") {
    return ""
  }

  if (input.endsWith("/")) {
    return input.slice(0, -1)
  }

  return input
}
