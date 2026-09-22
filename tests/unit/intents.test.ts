import { describe, expect, it } from 'vitest';
import { generateRef, generateClientSecret, validateInput, VALID_METHODS } from '@/lib/api/intents';

describe('generateRef', () => {
  it('produces KP-XXXXXX format', () => {
    const ref = generateRef();
    expect(ref).toMatch(/^KP-[A-HJ-NP-Z2-9]{6}$/);
  });
  it('produces unique refs', () => {
    const refs = new Set(Array.from({ length: 1000 }, () => generateRef()));
    expect(refs.size).toBe(1000);
  });
});

describe('validateInput', () => {
  it('rejects missing amount', () => {
    const res = validateInput({ method: 'Bankily' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('missing_param');
  });
  it('rejects amount too low', () => {
    const res = validateInput({ amount: 50, method: 'Bankily' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('amount_too_low');
  });
  it('rejects unknown method', () => {
    const res = validateInput({ amount: 5000, method: 'Foo' as any });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('unknown_method');
  });
  it('accepts valid input', () => {
    const res = validateInput({ amount: 5000, method: 'Bankily', success_url: 'https://example.com/ok' });
    expect(res.ok).toBe(true);
  });
});
