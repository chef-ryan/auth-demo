import { unauthorized } from "../../errors";
import { authLogger } from "../../services/logger";
import { sessionStore } from "../../services/sessionStore";
import { nowSeconds } from "../time";
import type { SessionClaims, SessionContext } from "./types";

const bearerToken = (authorization?: string | null) => {
  if (!authorization) return null;
  const [scheme, value] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.trim();
};

export const requireSession = async (
  request: Request,
  jwt: {
    verify: (token: string) => Promise<SessionClaims | false>;
  }
): Promise<SessionContext> => {
  sessionStore.purgeExpired();
  const token = bearerToken(request.headers.get("authorization"));

  if (!token) {
    throw unauthorized("Missing Authorization header");
  }

  const claims = await jwt.verify(token);

  if (!claims || !claims.sessionId || !claims.address) {
    throw unauthorized("Invalid or expired token");
  }

  if (claims.exp && claims.exp <= nowSeconds()) {
    authLogger.warn({
      type: "token_expired",
      address: claims.address,
      sessionId: claims.sessionId,
    });
    throw unauthorized("Token has expired", 40102);
  }

  if (sessionStore.isRevoked(claims.sessionId)) {
    authLogger.warn({
      type: "token_revoked",
      address: claims.address,
      sessionId: claims.sessionId,
    });
    throw unauthorized("Session has been revoked", 40103);
  }

  return { claims, token };
};

