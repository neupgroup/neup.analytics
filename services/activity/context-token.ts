import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateProjectSecret(): string {
  return randomBytes(32).toString('hex');
}

function secretBytes(secret: string): Buffer {
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error('Invalid project secret');
  return Buffer.from(secret, 'hex');
}

export function deriveContextId(secret: string, traceId: string): string {
  return createHmac('sha256', secretBytes(secret)).update(traceId).digest('hex');
}

export function signContextToken(secret: string, contextId: string): string {
  if (!/^[a-f0-9]{64}$/.test(contextId)) throw new Error('Invalid context ID');
  const message = `neup-context:v1:${contextId}`;
  return `v1.${contextId}.${createHmac('sha256', secretBytes(secret)).update(message).digest('hex')}`;
}

export function verifyContextToken(secret: string | null, token: string): string | null {
  if (!secret || !/^v1\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return null;
  try {
    const contextId = token.split('.')[1];
    const expected = Buffer.from(signContextToken(secret, contextId).split('.')[2], 'hex');
    const supplied = Buffer.from(token.split('.')[2], 'hex');
    return timingSafeEqual(expected, supplied) ? contextId : null;
  } catch {
    return null;
  }
}

export function matchesTrace(secret: string, contextId: string, traceId: string): boolean {
  return timingSafeEqual(Buffer.from(deriveContextId(secret, traceId), 'hex'), Buffer.from(contextId, 'hex'));
}
