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

interface GoogleTokenInfo {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: string;
  exp: string;
  alg: string;
  kid: string;
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

async function verifyIdTokenWithGoogle(idToken: string): Promise<GoogleTokenInfo> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token verification failed:", error);
    throw new Error("Invalid or expired ID token");
  }

  const tokenInfo: GoogleTokenInfo = await response.json();

  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    console.error("[Google OAuth] Token audience mismatch:", tokenInfo.aud, "vs", GOOGLE_CLIENT_ID);
    throw new Error("Token was not issued for this application");
  }

  if (tokenInfo.email_verified !== "true") {
    throw new Error("Email not verified with Google");
  }

  return tokenInfo;
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
  
  const tokenInfo = await verifyIdTokenWithGoogle(tokens.id_token);

  return {
    sub: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name || tokenInfo.given_name || "User",
    picture: tokenInfo.picture,
    emailVerified: tokenInfo.email_verified === "true",
  };
}
