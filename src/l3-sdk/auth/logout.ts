import { authLogger } from "../../services/logger"
import { SessionManager } from "../SessionManager"
import type { SessionContext } from "../l3auth.types"

export const logout = async ({ token, session }: SessionContext) => {
  await SessionManager.invalidateSession(token)
  authLogger.info({
    type: "logout",
    account: session.identity.account,
  })

  return { success: true }
}
