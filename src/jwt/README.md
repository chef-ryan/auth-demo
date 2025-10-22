# JWT Utilities

Utility modules in `src/jwt` encapsulate the JWT-backed session flow used across the demo. They provide a consistent way to issue tokens, recover session context inside request handlers, and revoke sessions when users log out.

## Prerequisites

- `JWT_SECRET` must be set before the server starts. The secret is injected into the Elysia JWT plugin and is required for signing and verifying tokens.
- Optional: `REDIS_URL` enables the Redis-backed revocation store. When absent or the connection fails, an in-memory store is used instead.

## `JWTAuth`

`JWTAuth` centralises token issuance and verification. It is implemented as a singleton so the same JWT plugin instance is reused across the app.

```ts
import { JWTAuth } from "../jwt/jwtAuth"

const jwtAuth = JWTAuth.getInstance()
app.use(jwtAuth.jwtPlugin())
```

### Login

```ts
const { token, expiresAt, sessionId } = await JWTAuth.getInstance().login(address)
```

- Requires a verified wallet `address`.
- Produces a signed token containing `address`, `sessionId`, `loginAt`, and `exp`.
- Tokens currently expire after 24 hours (`DEFAULT_TOKEN_TTL_SECONDS`).

### Session enforcement

```ts
const { claims, token } = await JWTAuth.getInstance().requireSession(request)
```

- Looks for a `Bearer` token in the `Authorization` header, falling back to the `l3auth_token` cookie (override via `SESSION_COOKIE_NAME`).
- Verifies the token signature and handles common failure cases by throwing `unauthorized`.
- Confirms the session is not revoked via the shared `sessionStore`.

Returned `claims` are shaped as `SessionClaims` (`address`, `sessionId`, `loginAt`, optional JWT timestamps).

## `withSession`

`withSession` is a tiny helper used with Elysia's `.derive` to inject session data and the associated profile into downstream handlers.

```ts
import { withSession } from "../jwt/withSession"

app.use(new Elysia().derive(withSession()))
```

The helper calls `requireSession`, attaches the resulting `session`, and resolves a `userProfile` via `getProfile(session)`.

## `sessionStore`

`sessionStore` abstracts session revocation:

- `revoke(sessionId, expiresAtMs)` marks a session as revoked until its natural expiration.
- `isRevoked(sessionId)` tells `requireSession` whether a token should be rejected.
- `purgeExpired()` cleans up in-memory entries; Redis manages expiry automatically.

The exported instance chooses Redis if `REDIS_URL` is available and reachable, falling back to an in-memory store otherwise. You can call these methods directly (for example, from a logout flow) to invalidate tokens on demand.

## `errors`

`unauthorized(message, code?)` raises an `HttpError` with status `401`. Use it whenever you want to surface a consistent 401 response from JWT-related operations.
