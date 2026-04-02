// Simple AES-GCM encryption for storing LLM API keys
// Uses Web Crypto API (available in Node 18+ and Edge Runtime)

const ALGO = 'AES-GCM'
const KEY_LENGTH_BYTES = 32

function isHexKey(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value)
}

async function deriveRawKey(): Promise<Buffer> {
  const source = process.env.ENCRYPTION_KEY?.trim()
  if (!source) {
    throw new Error('Missing ENCRYPTION_KEY')
  }

  // Backward-compatible path: 32-byte key encoded as 64 hex chars.
  if (isHexKey(source)) {
    return Buffer.from(source, 'hex')
  }

  // Fallback: deterministically derive a 32-byte key from any passphrase.
  const bytes = new TextEncoder().encode(source)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const digestBuf = Buffer.from(digest)
  return digestBuf.subarray(0, KEY_LENGTH_BYTES)
}

async function getKey(): Promise<CryptoKey> {
  const raw = await deriveRawKey()
  // crypto.subtle typing wants ArrayBuffer/BufferSource; convert explicitly.
  const keyBytes = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
  return crypto.subtle.importKey('raw', keyBytes, ALGO, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded)
  // Combine iv + ciphertext, encode as base64
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return Buffer.from(combined).toString('base64')
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await getKey()
  const combined = Buffer.from(encoded, 'base64')
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
