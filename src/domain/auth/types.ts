export type SessionClaims = {
  address: string;
  sessionId: string;
  loginAt: string;
  exp?: number;
  iat?: number;
};

export type SessionContext = {
  claims: SessionClaims;
  token: string;
};

