import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

// SECURITY: Throw immediately if JWT_SECRET is not set
// This prevents the app from running without a proper secret
if (!process.env.JWT_SECRET) {
  throw new Error(
    "❌ SECURITY ERROR: JWT_SECRET is not set in environment variables.\n" +
    "Add JWT_SECRET=<your-random-secret> to your .env file."
  )
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function createToken(payload: {
  id: string
  email: string
  role: string
  name: string
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h") // 8 hours — not 7 days
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as {
      id: string
      email: string
      role: string
      name: string
    }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) return null
  return await verifyToken(token)
}