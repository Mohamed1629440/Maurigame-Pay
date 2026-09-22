import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Compute HMAC-SHA256 signature in the Stripe-like format:
 *   `t=<unix_ts>,v1=<hex>`
 * where v1 = HMAC_SHA256(secret, "<unix_ts>.<body>")
 */
export function computeSignature(secret: string, body: string, ts?: number): string {
  const t = ts ?? Math.floor(Date.now() / 1000);
  const payload = `${t}.${body}`;
  const v1 = createHmac('sha256', secret).update(payload).digest('hex');
  return `t=${t},v1=${v1}`;
}

/**
 * Verify a signature. Returns true if valid AND timestamp is within tolerance.
 * `tolerance` defaults to 300s (5 min) — anti-replay window.
 */
export function verifySignature(
  secret: string,
  body: string,
  header: string,
  tolerance = 300
): boolean {
  const parts = header.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const t = parseInt(parts.t ?? '', 10);
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > tolerance) return false;

  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
