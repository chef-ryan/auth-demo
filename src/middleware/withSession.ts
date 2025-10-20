import { requireSession } from "../domain/auth/requireSession";
import { getProfile } from "../domain/users/getProfile";
import type { SessionClaims, SessionContext } from "../domain/auth/types";

type UserProfile = ReturnType<typeof getProfile>;

export type SessionWithProfile = {
  session: SessionContext;
  userProfile: UserProfile;
};

export const withSession = () =>
  async (context: unknown): Promise<SessionWithProfile> => {
    const { request, jwt } = context as {
      request: Request;
      jwt: {
        verify: (token: string) => Promise<SessionClaims | false>;
      };
    };

    const session = await requireSession(request, jwt);
    return {
      session,
      userProfile: getProfile(session),
    };
  };
