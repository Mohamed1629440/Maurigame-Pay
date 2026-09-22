import { test, expect } from '@playwright/test';

test('curl POST /v1/intents creates a test intent and simulate marks it paid', async ({ request }) => {
  const KP_TEST = process.env.KP_TEST_KEY;
  test.skip(!KP_TEST, 'KP_TEST_KEY env var not set — skipping E2E');

  const res = await request.post('/api/v1/intents', {
    headers: { Authorization: `Bearer ${KP_TEST}` },
    data: { amount: 5000, method: 'Bankily', description: 'E2E test' },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.ref).toMatch(/^KP-/);
  expect(body.mode).toBe('test');
  expect(body.hosted_url).toContain('/pay/');

  // Simulate via sandbox
  const sim = await request.post('/api/v1/test/sandbox-simulate', {
    data: { ref: body.ref, client_secret: body.client_secret },
  });
  expect(sim.status()).toBe(200);

  // Verify status=paid
  const get = await request.get(`/api/v1/intents/${body.ref}`, {
    headers: { Authorization: `Bearer ${KP_TEST}` },
  });
  const after = await get.json();
  expect(after.status).toBe('paid');
});
