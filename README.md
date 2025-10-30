# L3 Auth Demo

This project demonstrates a CAIP-10 compliant L3 authentication workflow using [Elysia](https://elysiajs.com/) on Bun. Wallets sign a one-time challenge, the backend verifies the signature, and an HTTP-only `l3-session` cookie is issued while the full session is stored server-side (Redis or an in-memory fallback).

## Prerequisites

- [Bun](https://bun.sh/) v1.2+
- A `.env` file based on `.env.example`

```ini
PORT=3000
# Optional
REDIS_URL=redis://localhost:6379
```

## Install & Run

```bash
bun install
bun run src/index.ts           # start once
# or
bun run --watch src/index.ts   # reload on change
```

On start, the server listens on `http://localhost:${PORT}`.

## Auth Flow

1. Client requests a nonce from `GET /auth/nonce`, which returns a unique `nonce` and `issuedAt`.
2. Client builds the canonical message locally using the template:<br/>
   `prob.market wants you to sign in with your account: {identity.account}`<br/>
   `domain: prob.market`<br/>
   `Version: 1`<br/>
   `Chain ID: {identity.namespace}:{identity.chainId}`<br/>
   `Nonce: {nonce}`<br/>
   `Issued At: {issuedAt}`
3. Wallet signs the message off-chain.
4. Client submits `{ identity, message, signature, nonce, issuedAt }` to `POST /l3/auth/login`.
5. The backend validates the CAIP-10 identity, checks the nonce and issued timestamp, verifies the signature, then stores an `L3Session` and sets an `l3-session` HTTP-only cookie.
6. Subsequent protected requests attach the cookie automatically; `POST /l3/auth/logout` clears the cookie and removes the server-side session.

Sessions expire after 24 hours. Nonces expire after five minutes and are single-use.

## API Endpoints

| Method | Path                | Description                                       |
| ------ | ------------------- | ------------------------------------------------- |
| GET    | `/`                 | Health check                                      |
| GET    | `/auth/nonce`       | Issues a one-time nonce with the issued timestamp |
| POST   | `/l3/auth/login`    | Verifies signature, stores session, sets cookie   |
| POST   | `/l3/auth/logout`   | Clears the cookie and invalidates the session     |
| GET    | `/l3/auth/session`  | Returns the active `L3Session` (requires cookie)  |
| GET    | `/users/me`         | Returns session-derived identity and timestamps   |
| GET    | `/profiles`         | Mock profile payload                              |
| GET    | `/positions`        | Mock positions payload                            |
| GET    | `/activity`         | Mock recent activity                              |

All error responses follow `{ "error": string, "code"?: number }`.

## Logging

Important auth events (login, logout, revocation, failures) are emitted with ISO timestamps so they can be ingested by an external log pipeline.

## Testing

Tests simulate the signature flow with a mock account and run end-to-end against the in-memory server.

```bash
TMPDIR=$PWD/.tmp bun test
```

The `TMPDIR` override avoids sandbox temp-directory restrictions in the Codex CLI; it is not required on a local machine.
