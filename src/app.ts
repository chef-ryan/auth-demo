import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { HttpError } from "./errors";
import { getLoginMessage } from "./domain/auth/getLoginMessage";
import { login } from "./domain/auth/login";
import { requireSession } from "./domain/auth/requireSession";
import { logout } from "./domain/auth/logout";
import { getCurrentUser } from "./domain/users/getCurrentUser";
import { getProfile } from "./domain/users/getProfile";
import { getPositions } from "./domain/users/getPositions";
import { getActivity } from "./domain/activity/getActivity";
import { getEnv } from "./utils/env";

export const buildApp = () => {
  const jwtSecret = getEnv("JWT_SECRET");
  const sessionClaimsSchema = t.Object({
    address: t.String(),
    sessionId: t.String(),
    loginAt: t.String(),
  });

  const app = new Elysia({ name: "l3auth-demo" })
    .use(cors())
    .use(
      jwt({
        name: "jwt",
        secret: jwtSecret,
        schema: sessionClaimsSchema,
      })
    )
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return {
          error: error.message,
          code: error.code ?? error.status,
        };
      }

      console.error(error);
      set.status = 500;
      return { error: "Internal server error", code: 500 };
    });

  app.get("/", () => ({
    status: "ok",
    message: "L3 Authentication demo service",
  }));

  app.get("/auth/message", () => getLoginMessage());

  app.post(
    "/auth/login",
    async ({ body, jwt }) => login(body, jwt),
    {
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
    }
  );

  app.post("/auth/logout", async ({ request, jwt }) => {
    const session = await requireSession(request, jwt);
    return logout(session);
  });

  app.get("/users/me", async ({ request, jwt }) => {
    const session = await requireSession(request, jwt);
    return getCurrentUser(session);
  });

  app.get("/profiles", async ({ request, jwt }) => {
    const session = await requireSession(request, jwt);
    return getProfile(session);
  });

  app.get("/positions", async ({ request, jwt }) => {
    await requireSession(request, jwt);
    return getPositions();
  });

  app.get("/activity", async ({ request, jwt }) => {
    await requireSession(request, jwt);
    return getActivity();
  });

  return app;
};
