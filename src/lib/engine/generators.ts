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

/**
 * Replace the whole URL with a reserved-domain origin. The path is dropped, not
 * kept: paths routinely carry secrets (Slack/Discord webhook tokens, Airtable
 * ids), and there is no reliable way to tell a secret segment from a benign one.
 */
export function fakeUrl(original: string, n: number): string {
  try {
    const u = new URL(original)
    return `${u.protocol}//example${n}.com`
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
 * Format-preserving fake for a resource identifier (Airtable `app…`/`tbl…`,
 * a database/table name, etc.). Known prefixes are kept so the shape stays
 * recognisable; the rest is character-class-preserving fake data.
 */
export function fakeResourceId(original: string, n: number): string {
  const m = /^(app|tbl|viw|fld|rec|bas|sel|usr)([A-Za-z0-9]+)$/.exec(original)
  if (m) return m[1] + fakeToken(m[2], n)
  return fakeToken(original, n)
}

/**
 * Format-preserving fake phone number. The original's shape is kept verbatim
 * (leading `+`, separators, parentheses, and digit grouping); only the digits
 * are swapped. The last seven digits become a NANP fictional `555-01xx` number
 * (reserved for fiction, so the result can never dial a real line), and any
 * leading country/area digits are replaced with deterministic filler whose first
 * digit is 2-9 so the result still reads as a plausible number. Deterministic in
 * `n`, so the same original always maps to the same fake.
 */
export function fakePhone(original: string, n: number): string {
  const count = (original.match(/\d/g) ?? []).length
  const rng = makeRng(n)
  const subscriber = '555' + '01' + String(n % 100).padStart(2, '0') // 555-01xx (7 digits)
  const leadCount = Math.max(0, count - subscriber.length)
  let lead = ''
  for (let i = 0; i < leadCount; i++) lead += i === 0 ? String(2 + rng(8)) : String(rng(10))
  const target = (lead + subscriber).slice(-count)
  let i = 0
  return original.replace(/\d/g, () => target[i++] ?? '5')
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
