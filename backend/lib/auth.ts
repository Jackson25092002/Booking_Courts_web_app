import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@/src/generated/prisma/client";

const PASSWORD_SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = 60 * 15;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET phải có ít nhất 16 ký tự");
  }

  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

function passwordFingerprint(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex");
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const userRoles: UserRole[] = ["CUSTOMER", "OWNER", "ADMIN"];

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      !userRoles.includes(payload.role as UserRole)
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
    } satisfies AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function getAuthSession(request: Request) {
  const token = getBearerToken(request);
  return token ? verifyAccessToken(token) : null;
}

export async function createAccessToken({
  userId,
  email,
  role,
}: AccessTokenPayload) {
  const token = await new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
    .sign(getJwtSecret());

  return {
    token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
}

export async function createPasswordResetToken({
  userId,
  email,
  passwordHash,
}: {
  userId: string;
  email: string;
  passwordHash: string;
}) {
  return new SignJWT({
    purpose: "password-reset",
    email,
    passwordFingerprint: passwordFingerprint(passwordHash),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setAudience("password-reset")
    .setIssuedAt()
    .setExpirationTime(`${PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: "password-reset",
    });

    if (
      payload.purpose !== "password-reset" ||
      !payload.sub ||
      typeof payload.email !== "string" ||
      typeof payload.passwordFingerprint !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      passwordFingerprint: payload.passwordFingerprint,
    };
  } catch {
    return null;
  }
}

export function isPasswordResetTokenCurrent(passwordHash: string, fingerprint: string) {
  return passwordFingerprint(passwordHash) === fingerprint;
}
