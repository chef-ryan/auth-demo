import type { SessionContext } from "../../jwt/jwt.types";

export const getProfile = ({ claims }: SessionContext) => ({
  address: claims.address,
  profile: {
    username: `user-${claims.address.slice(2, 8)}`,
    displayName: "L3 Demo User",
    bio: "This is a mock profile in the L3 auth demo.",
  },
});
