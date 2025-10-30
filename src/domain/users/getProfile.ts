import type { SessionContext } from "../../l3-sdk/l3auth.types"

export const getProfile = ({ session }: SessionContext) => {
  const { address } = session.identity
  const suffix = address.startsWith("0x")
    ? address.slice(2, 8)
    : address.slice(0, 6)

  return {
    address,
    profile: {
      username: `user-${suffix}`,
      displayName: "L3 Demo User",
      bio: "This is a mock profile in the L3 auth demo.",
    },
  }
}
