import { unauthorized } from "../../errors";
import { authLogger } from "../../services/logger";
import { verifyMockSignature } from "../../services/mockWallet";
import { nowSeconds } from "../time";
import { getNumberEnv } from "../../utils/env";

type LoginRequest = {
  address: string;
  message: string;
  signature: string;
};

type JwtSigner = {
  sign: (claims: {
    address: string;
    sessionId: string;
    loginAt: string;
    exp: number;
  }) => Promise<string>;
};

export const login = async (
  { address, message, signature }: LoginRequest,
  jwt: JwtSigner
) => {
  const tokenTtlSeconds = getNumberEnv("TOKEN_TTL_SECONDS", 60 * 60 * 24);

  const verified = await verifyMockSignature({ address, message, signature });

  if (!verified) {
    authLogger.warn({
      type: "login_failure",
      address,
      reason: "signature_verification_failed",
    });
    throw unauthorized("Signature verification failed", 40101);
  }

  const loginAt = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const exp = nowSeconds() + tokenTtlSeconds;
  const expiresAt = new Date(exp * 1000).toISOString();

  const token = await jwt.sign({
    address,
    sessionId,
    loginAt,
    exp,
  });

  authLogger.info({
    type: "login_success",
    address,
    sessionId,
  });

  return {
    token,
    address,
    loginAt,
    sessionId,
    expiresAt,
  };
};
