import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET);
export const COOKIE_NAME = 'vault_session';

export async function createSessionToken() {
  return await new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === 'owner';
  } catch {
    return false;
  }
}

export async function requireVaultSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return await verifySessionToken(token);
}

export async function clearVaultSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}