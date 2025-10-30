type AuthEvent =
  | {
      type: "login_success" | "login_failure"
      account: string
      reason?: string
    }
  | {
    type: "logout" | "session_revoked" | "session_expired"
    account: string
  }

const format = (event: AuthEvent) => {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] ${event.type} ${JSON.stringify(event)}`
}

export const authLogger = {
  info: (event: AuthEvent) => {
    console.info(format(event))
  },
  warn: (event: AuthEvent) => {
    console.warn(format(event))
  },
}
