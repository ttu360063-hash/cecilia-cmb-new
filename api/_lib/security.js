import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_ALGORITHM = 'HS256'
const TOKEN_EXPIRATION = '8h'

const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || '').trim()
  if (!secret) {
    throw new Error('Backend nao configurado: defina JWT_SECRET.')
  }
  return new TextEncoder().encode(secret)
}

export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, 12)
}

export const comparePassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash)
}

export const signAuthToken = async ({ userId }) => {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(getJwtSecret())
}

export const verifyAuthToken = async (token) => {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  })
  return payload
}
