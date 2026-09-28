import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * P5.1 — Guest auth (D8): token HMAC-signed, không cần thư viện ngoài.
 * Format: `v1.<base64url(userId)>.<issuedAt>.<base64url(HMAC-SHA256(payload))>`
 * Secret CHỈ nằm ở server (env SERVER_SECRET) — không nhúng vào bundle client.
 */

export interface AuthConfig {
  secret: string;
  tokenTtlMs: number;
}

const TOKEN_VERSION = 'v1';

function sign(config: AuthConfig, payload: string): string {
  return createHmac('sha256', config.secret).update(payload).digest('base64url');
}

export function issueGuestToken(config: AuthConfig, userId: string, now: number): string {
  const payload = `${TOKEN_VERSION}.${Buffer.from(userId, 'utf8').toString('base64url')}.${now}`;
  return `${payload}.${sign(config, payload)}`;
}

export function verifyGuestToken(
  config: AuthConfig,
  token: string,
  now: number
): { userId: string; issuedAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return null;

  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const expected = sign(config, payload);
  const given = parts[3];
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'))) return null;

  const issuedAt = Number(parts[2]);
  if (!Number.isFinite(issuedAt)) return null;
  if (now - issuedAt > config.tokenTtlMs) return null;

  const userId = Buffer.from(parts[1], 'base64url').toString('utf8');
  if (!userId) return null;
  return { userId, issuedAt };
}
