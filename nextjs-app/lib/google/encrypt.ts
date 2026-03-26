// Required env vars:
// GOOGLE_TOKEN_ENCRYPTION_KEY: 64-char hex string (32 bytes).
//   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// NEXT_PUBLIC_APP_URL: http://localhost:3000 in .env.local, production URL in Vercel/Render

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALG = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return iv.toString('hex') + tag.toString('hex') + encrypted.toString('hex')
}

export function decrypt(stored: string): string {
  const key = getKey()
  const iv = Buffer.from(stored.slice(0, 24), 'hex')
  const tag = Buffer.from(stored.slice(24, 56), 'hex')
  const ciphertext = Buffer.from(stored.slice(56), 'hex')
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
