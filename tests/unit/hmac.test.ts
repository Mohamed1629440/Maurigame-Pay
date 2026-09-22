import { describe, expect, it } from 'vitest';
import { computeSignature, verifySignature } from '@/lib/hmac';

describe('HMAC SHA-256', () => {
  const SECRET = 'whsec_test_abc123';
  const BODY = JSON.stringify({ id: 'evt_1', type: 'payment.succeeded' });

  it('compute then verify roundtrip', () => {
    const sig = computeSignature(SECRET, BODY);
    expect(verifySignature(SECRET, BODY, sig)).toBe(true);
  });

  it('reject tampered body', () => {
    const sig = computeSignature(SECRET, BODY);
    const tampered = BODY.replace('payment.succeeded', 'payment.failed');
    expect(verifySignature(SECRET, tampered, sig)).toBe(false);
  });

  it('reject wrong secret', () => {
    const sig = computeSignature(SECRET, BODY);
    expect(verifySignature('wrong_secret', BODY, sig)).toBe(false);
  });

  it('reject expired timestamp (> 300s)', () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400;
    const sig = computeSignature(SECRET, BODY, oldTs);
    expect(verifySignature(SECRET, BODY, sig)).toBe(false);
  });

  it('reject malformed header', () => {
    expect(verifySignature(SECRET, BODY, 'invalid')).toBe(false);
    expect(verifySignature(SECRET, BODY, 't=abc,v1=xyz')).toBe(false);
  });
});
