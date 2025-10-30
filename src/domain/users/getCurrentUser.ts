import type { SessionContext } from "../../l3-sdk/l3auth.types"

export const getCurrentUser = ({ session }: SessionContext) => ({
  identity: session.identity,
  issuedAt: session.issuedAt,
  expiresAt: session.expiresAt,
})
