import { authLogger } from "../../services/logger";
import { sessionStore } from "../../jwt/sessionStore";
import { nowSeconds } from "../time";
import type { SessionContext } from "../../jwt/jwt.types";

export const logout = async ({ claims }: SessionContext) => {
  const expiresAtMs = (claims.exp ?? nowSeconds()) * 1000;

  await sessionStore.revoke(claims.sessionId, expiresAtMs);
  authLogger.info({
    type: "logout",
    address: claims.address,
    sessionId: claims.sessionId,
  });

  return { success: true };
};
