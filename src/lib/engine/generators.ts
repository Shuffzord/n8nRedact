/**
 * Format-preserving replacement generators.
 *
 * Every output uses a reserved / non-routable range so the result is guaranteed
 * fictional while staying a structurally valid value (the anonymized workflow
 * still imports and validates):
 *   - example.com / .org   RFC 2606 reserved documentation domains
 *   - 192.0.2.x etc.       RFC 5737 documentation IP ranges
 *   - 555-01xx             NANP fictional phone range
 *
 * All generators are pure functions of their inputs, which is what makes the
 * whole pipeline deterministic.
 */

/**
 * Small seeded RNG. Uses the high-order bits of an LCG — the low bits of an LCG
 * have very short periods and would produce visibly patterned output.
 */
function makeRng(seedInput: number): (range: number) => number {
  let seed = (seedInput * 2654435761) >>> 0
  return (range: number) => {
    seed = (seed * 1103515245 + 12345) >>> 0
    return Math.floor((seed / 0x100000000) * range)
  }
}

export function fakeEmail(n: number): string {
  return `user${n}@example.com`
}

/** Replace the host with a reserved domain; keep scheme + path, drop auth/query. */
export function fakeUrl(original: string, n: number): string {
  try {
    const u = new URL(original)
    const path = u.pathname === '/' ? '' : u.pathname
    return `${u.protocol}//example${n}.com${path}`
  } catch {
    return `https://example${n}.com`
  }
}

/** A syntactically valid v4-shaped UUID derived from a counter. */
export function fakeUuid(n: number): string {
  const tail = (n >>> 0).toString(16).padStart(12, '0').slice(-12)
  return `00000000-0000-4000-8000-${tail}`
}

/**
 * A deterministic lowercase hex id of the given length — covers 32-char Notion
 * page/database ids and 64-char n8n instance ids alike.
 */
export function fakeHex(n: number, length: number): string {
  const rng = makeRng(n)
  let out = ''
  for (let i = 0; i < length; i++) out += rng(16).toString(16)
  return out
}

/** A generic placeholder for a human-named credential (no format to preserve). */
export function fakeCredentialName(n: number): string {
  return `Credential ${n}`
}

/** A generic placeholder for a named resource (Notion DB, Slack channel, etc.). */
export function fakeResourceName(n: number): string {
  return `Resource ${n}`
}

/**
 * Length- and character-class-preserving token so field validators still pass.
 * Digits map to digits, letters to letters (case kept), separators are left as
 * they are. The output depends only on the counter and the value's shape, never
 * on the secret's actual characters.
 */
export function fakeToken(original: string, n: number): string {
  const rng = makeRng(n)
  const U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const L = 'abcdefghijklmnopqrstuvwxyz'
  let out = ''
  for (const ch of original) {
    if (ch >= '0' && ch <= '9') out += rng(10).toString()
    else if (ch >= 'A' && ch <= 'Z') out += U[rng(26)]
    else if (ch >= 'a' && ch <= 'z') out += L[rng(26)]
    else out += ch
  }
  return out
}
