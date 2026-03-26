import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from '../lib/google/encrypt'

// Set a test encryption key (64-char hex = 32 bytes)
beforeAll(() => {
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY =
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
})

describe('AES-256-GCM encrypt/decrypt', () => {
  it('round-trips plaintext correctly', () => {
    const plaintext = 'ya29.a0AfH6SMA_test_access_token_value'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('encrypted output is not plaintext', () => {
    const plaintext = 'my_secret_refresh_token'
    const encrypted = encrypt(plaintext)
    expect(encrypted).not.toContain(plaintext)
    // Should be hex string: iv(24) + tag(32) + ciphertext(variable)
    expect(encrypted.length).toBeGreaterThan(56) // 24 + 32 minimum
    expect(/^[0-9a-f]+$/.test(encrypted)).toBe(true)
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same_token_value'
    const enc1 = encrypt(plaintext)
    const enc2 = encrypt(plaintext)
    expect(enc1).not.toBe(enc2) // Different IVs
    // But both decrypt to same value
    expect(decrypt(enc1)).toBe(plaintext)
    expect(decrypt(enc2)).toBe(plaintext)
  })

  it('handles empty string', () => {
    const encrypted = encrypt('')
    expect(decrypt(encrypted)).toBe('')
  })

  it('handles unicode characters', () => {
    const plaintext = 'token_avec_accents_éàü_and_emoji_🔑'
    const encrypted = encrypt(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it('throws on invalid key length', () => {
    const origKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'tooshort'
    expect(() => encrypt('test')).toThrow('64-character hex string')
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = origKey
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test_value')
    // Tamper with the auth tag (chars 24-56)
    const tampered = encrypted.slice(0, 30) + 'ff' + encrypted.slice(32)
    expect(() => decrypt(tampered)).toThrow()
  })
})
