import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { HttpError } from "./errors"
import { getLoginMessage } from "./domain/auth/getLoginMessage"
import { login } from "./domain/auth/login"
import { logout } from "./domain/auth/logout"
import { getCurrentUser } from "./domain/users/getCurrentUser"
import { getPositions } from "./domain/users/getPositions"
import { getActivity } from "./domain/activity/getActivity"
import { withSession } from "./jwt/withSession"
import { JWTAuth } from "./jwt/jwtAuth"

export const buildApp = () => {
  const app = new Elysia({ name: "l3auth-demo" })
    .use(cors())
    .use(JWTAuth.getInstance().jwtPlugin())
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status
        return {
          error: error.message,
          code: error.code ?? error.status,
        }
      }

      console.error(error)
      set.status = 500
      return { error: "Internal server error", code: 500 }
    })

  app.get("/", () => ({
    status: "ok",
    message: "L3 Authentication demo service",
  }))

  app.get("/auth/message", () => getLoginMessage())

  app.post("/auth/login", async ({ body }) => login(body), {
    body: t.Object({
      address: t.String({
        error: "wallet address is required",
        pattern: "^0x[a-fA-F0-9]{40}$",
      }),
      message: t.String({
        error: "login message is required",
      }),
      signature: t.String({
        error: "wallet signature is required",
      }),
    }),
  })

  app.use(
    new Elysia({ name: "protected-routes" })
      .derive(withSession())
      .post("/auth/logout", async ({ session }) => logout(session))
      .get("/users/me", ({ session }) => getCurrentUser(session))
      .get("/profiles", ({ userProfile }) => userProfile)
      .get("/positions", ({ userProfile }) => ({
        ...getPositions(),
        user: userProfile,
      }))
      .get("/activity", () => getActivity())
  )

  return app
}
