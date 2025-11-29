import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface DecodedIdToken {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}

export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google OAuth not configured");
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: state,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token exchange failed:", error);
    throw new Error("Failed to exchange authorization code");
  }

  return response.json();
}

export function decodeIdToken(idToken: string): DecodedIdToken {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ID token format");
  }

  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload);
}

export function verifyIdToken(decoded: DecodedIdToken): void {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google OAuth not configured");
  }

  if (decoded.iss !== "https://accounts.google.com" && decoded.iss !== "accounts.google.com") {
    throw new Error("Invalid token issuer");
  }

  if (decoded.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Invalid token audience");
  }

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    throw new Error("Token has expired");
  }

  if (!decoded.email_verified) {
    throw new Error("Email not verified with Google");
  }
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info from Google");
  }

  return response.json();
}

export interface GoogleAuthResult {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

export async function handleGoogleCallback(
  code: string,
  redirectUri: string
): Promise<GoogleAuthResult> {
  const tokens = await exchangeCodeForTokens(code, redirectUri);
  
  const decoded = decodeIdToken(tokens.id_token);
  verifyIdToken(decoded);

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name || decoded.given_name || "User",
    picture: decoded.picture,
    emailVerified: decoded.email_verified,
  };
}
