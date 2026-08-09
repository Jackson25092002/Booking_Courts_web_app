import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@/src/generated/prisma/client";

const PASSWORD_SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

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
