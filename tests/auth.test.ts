import { describe, expect, it } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";

process.env.JWT_SECRET ??= "test-secret";
process.env.TOKEN_TTL_SECONDS = "120";
process.env.LOGIN_MESSAGE ??=
  "Sign this message to authenticate with the L3 Auth demo application.";

const { buildApp } = await import("../src/app");
const loginMessage = process.env.LOGIN_MESSAGE!;

const app = buildApp();
const testAccount = privateKeyToAccount(
  "0x1111111111111111111111111111111111111111111111111111111111111111"
);

type LoginResponse = {
  token: string;
  sessionId: string;
  loginAt: string;
  expiresAt: string;
  address: string;
};

type LogoutResponse = { success: boolean };

type ErrorResponse = {
  error: string;
  code?: number;
};

type CurrentUserResponse = {
  address: string;
  loginAt: string;
  sessionId: string;
};

type PositionsResponse = {
  positions: Array<{
    market: string;
    side: string;
    size: number;
    valueUSD: number;
  }>;
  user: {
    address: string;
    profile: {
      username: string;
      displayName: string;
      bio: string;
    };
  };
};

const call = async <TResponse = unknown>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<{ response: Response; data: TResponse }> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const response = await app.handle(request);
  const data = (await response.json()) as TResponse;
  return { response, data };
};

const login = async () => {
  const signature = await testAccount.signMessage({
    message: loginMessage,
  });

  const { response, data } = await call<LoginResponse>(
    "POST",
    "/auth/login",
    {
      address: testAccount.address,
      message: loginMessage,
      signature,
    },
    undefined
  );

  expect(response.status).toBe(200);
  return data;
};

describe("authentication flow", () => {
  it("issues a JWT after successful login", async () => {
    const session = await login();
    expect(session.token).toBeTruthy();
    expect(session.sessionId).toBeTruthy();
  });

  it("rejects invalid signatures", async () => {
    const { response, data } = await call<ErrorResponse>(
      "POST",
      "/auth/login",
      {
        address: testAccount.address,
        message: loginMessage,
        signature: "0x1234",
      }
    );

    expect(response.status).toBe(401);
    expect(data.error).toContain("Signature verification failed");
  });

  it("guards protected routes", async () => {
    const session = await login();
    const me = await call<CurrentUserResponse>(
      "GET",
      "/users/me",
      undefined,
      session.token
    );
    expect(me.response.status).toBe(200);
    expect(me.data.address).toBe(testAccount.address);

    const unauthorized = await call<ErrorResponse>("GET", "/users/me");
    expect(unauthorized.response.status).toBe(401);
  });

  it("revokes a session on logout", async () => {
    const session = await login();
    const logout = await call<LogoutResponse>(
      "POST",
      "/auth/logout",
      undefined,
      session.token
    );
    expect(logout.response.status).toBe(200);
    expect(logout.data.success).toBe(true);

    const { response } = await call(
      "GET",
      "/users/me",
      undefined,
      session.token
    );
    expect(response.status).toBe(401);
  });

  it("returns the user profile alongside positions when authenticated", async () => {
    const session = await login();

    const { response, data } = await call<PositionsResponse>(
      "GET",
      "/positions",
      undefined,
      session.token
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(data.positions)).toBe(true);
    expect(data.user.address).toBe(testAccount.address);
    expect(data.user.profile.username).toContain("user-");

    const unauthorized = await call<ErrorResponse>("GET", "/positions");
    expect(unauthorized.response.status).toBe(401);
  });
});
