import type { SessionContext } from "../auth/types";

export const getCurrentUser = ({ claims }: SessionContext) => ({
  address: claims.address,
  loginAt: claims.loginAt,
  sessionId: claims.sessionId,
});
