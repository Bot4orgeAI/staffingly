import { OAuth2Client } from "google-auth-library";
import prisma from "../lib/prisma.js";
import type { User } from "@prisma/client";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface GoogleAuthResult {
  user: User;
  isNewUser: boolean;
}

function getOAuthClient(): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth credentials are not configured");
  }
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function getGoogleAuthUrl(state?: string): string {
  const client = getOAuthClient();

  const scopes = ["openid", "email", "profile"];

  return client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state,
    prompt: "select_account",
  });
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleUserInfo> {
  const client = getOAuthClient();

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Verify the ID token and get user info
  if (!tokens.id_token) {
    throw new Error("No ID token received from Google");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google token payload");
  }

  if (!payload.email_verified) {
    throw new Error("Google email is not verified");
  }

  return {
    sub: payload.sub,
    email: payload.email!,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
    given_name: payload.given_name,
    family_name: payload.family_name,
  };
}

export async function findOrCreateGoogleUser(
  googleUser: GoogleUserInfo
): Promise<GoogleAuthResult> {
  const { sub: googleId, email, name, picture } = googleUser;

  // First, check if user exists with this Google ID
  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (user) {
    // Update avatar if changed
    if (picture && user.avatarUrl !== picture) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: picture },
      });
    }
    return { user, isNewUser: false };
  }

  // Check if user exists with this email (link accounts)
  user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // Link Google account to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId,
        avatarUrl: picture || user.avatarUrl,
      },
    });
    return { user, isNewUser: false };
  }

  // Create new user
  user = await prisma.user.create({
    data: {
      email,
      googleId,
      name: name || email.split("@")[0],
      avatarUrl: picture,
      role: "CLIENT_USER",
    },
  });

  return { user, isNewUser: true };
}

export async function authenticateWithGoogleCode(code: string): Promise<GoogleAuthResult> {
  const googleUser = await exchangeCodeForTokens(code);
  return findOrCreateGoogleUser(googleUser);
}
