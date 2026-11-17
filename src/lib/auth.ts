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