import { recoverMessageAddress } from "viem";
import { getEnv } from "../utils/env";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export type WalletChallenge = {
  address: string;
  message: string;
  signature: string;
};

export const isValidAddress = (address: string) =>
  ADDRESS_REGEX.test(address);

export const verifyMockSignature = async ({
  address,
  message,
  signature,
}: WalletChallenge) => {
  const expectedMessage = getEnv(
    "LOGIN_MESSAGE",
    "Sign this message to authenticate with the L3 Auth demo application."
  );

  if (!isValidAddress(address)) {
    return false;
  }

  if (message.trim() !== expectedMessage) {
    return false;
  }

  try {
    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
};
