import * as jose from 'jose'
import { cookies } from 'next/headers'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment variables')
  }

  return new TextEncoder().encode(process.env.JWT_SECRET)
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret()
    await jose.jwtVerify(token, secret)
    return true
  } catch (error) {
    return false
  }
}

export async function generateToken(username: string): Promise<string> {
  const secret = getJwtSecret()
  const token = await new jose.SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  return token
}

// 楠岃瘉鏄惁涓虹鐞嗗憳
export async function verifyAdmin(): Promise<boolean> {
  try {
    const token = cookies().get('admin_token')?.value;

    if (!token) {
      return false;
    }

    return await verifyToken(token);
  } catch (error) {
    return false;
  }
}
