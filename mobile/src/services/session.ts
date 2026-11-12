let currentToken: string | null = null;

export function setSessionToken(token: string | null) {
  currentToken = token;
}

export function getSessionToken(): string | null {
  return currentToken;
}
