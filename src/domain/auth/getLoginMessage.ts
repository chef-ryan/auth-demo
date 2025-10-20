import { getEnv } from "../../utils/env";

export const getLoginMessage = () => ({
  message: getEnv(
    "LOGIN_MESSAGE",
    "Sign this message to authenticate with the L3 Auth demo application."
  ),
});
