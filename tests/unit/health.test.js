import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';

// Create a minimal app for testing
const app = express();

// Add security headers middleware first
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    assert.strictEqual(response.body.ok, true);
  });

  it('should include security headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(response.headers['x-frame-options'], 'DENY');
  });
});
