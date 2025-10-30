import { getProfile } from "../domain/users/getProfile"
import { SessionManager } from "./SessionManager"
import type { SessionContext, SessionWithProfile } from "./l3auth.types"

export type { SessionWithProfile } from "./l3auth.types"

export const withSession = () =>
  async (context: unknown): Promise<SessionWithProfile> => {
    const { request } = context as { request: Request }
    const session = await SessionManager.requireSessionFromRequest(request)
    return {
      session,
      userProfile: getProfile(session),
    }
  }
