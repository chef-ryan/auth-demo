import { JWTAuth } from "./jwtAuth";
import { getProfile } from "../domain/users/getProfile";
import type { SessionContext } from "./jwt.types";

type UserProfile = ReturnType<typeof getProfile>;

export type SessionWithProfile = {
  session: SessionContext;
  userProfile: UserProfile;
};

export const withSession = () =>
  async (context: unknown): Promise<SessionWithProfile> => {
    const { request } = context as {
      request: Request;
    };

    const session = await JWTAuth.getInstance().requireSession(request);
    return {
      session,
      userProfile: getProfile(session),
    };
  };
