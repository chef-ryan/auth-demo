import type { SessionContext } from "../../jwt/jwt.types";

export const getCurrentUser = ({ claims }: SessionContext) => ({
  address: claims.address,
  loginAt: claims.loginAt,
  sessionId: claims.sessionId,
});
