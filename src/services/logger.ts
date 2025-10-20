type AuthEvent =
  | {
      type: "login_success" | "login_failure";
      address: string;
      sessionId?: string;
      reason?: string;
    }
  | {
      type: "logout";
      address: string;
      sessionId: string;
    }
  | {
      type: "token_revoked" | "token_expired";
      address: string;
      sessionId: string;
    };

const format = (event: AuthEvent) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${event.type} ${JSON.stringify(event)}`;
};

export const authLogger = {
  info: (event: AuthEvent) => {
    console.info(format(event));
  },
  warn: (event: AuthEvent) => {
    console.warn(format(event));
  },
};
