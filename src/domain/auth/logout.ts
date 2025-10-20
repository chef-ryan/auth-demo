import { authLogger } from "../../services/logger";
import { sessionStore } from "../../services/sessionStore";
import { nowSeconds } from "../time";
import type { SessionContext } from "./types";

export const logout = ({ claims }: SessionContext) => {
  const expiresAtMs = (claims.exp ?? nowSeconds()) * 1000;

  sessionStore.revoke(claims.sessionId, expiresAtMs);
  authLogger.info({
    type: "logout",
    address: claims.address,
    sessionId: claims.sessionId,
  });

  return { success: true };
};
