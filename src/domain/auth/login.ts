import { unauthorized } from "../../jwt/errors";
import { authLogger } from "../../services/logger";
import { verifyMockSignature } from "../../services/mockWallet";
import { JWTAuth } from "../../jwt/jwtAuth";

type LoginRequest = {
  address: string;
  message: string;
  signature: string;
};

export const login = async ({ address, message, signature }: LoginRequest) => {
  const verified = await verifyMockSignature({ address, message, signature });

  if (!verified) {
    authLogger.warn({
      type: "login_failure",
      address,
      reason: "signature_verification_failed",
    });
    throw unauthorized("Signature verification failed", 40101);
  }

  return JWTAuth.getInstance().login(address);
};
