import { createHmac } from 'node:crypto';
import { ActionDepsFactory, IdGenerator } from '../../src/shared/deps';
import { createRngFromSfc32Words } from '../../src/shared/rng';
import { RNG_VERSION } from '../../src/shared/version';

/**
 * P5.1 — Server RNG authoritative (ràng buộc 2, gate 2).
 *
 * actionSeed = HMAC_SHA256(serverSecret, `${userId}|${seq}|${rngVersion}`) → 4 word 32-bit → sfc32.
 * - Tất định: cùng (secret, userId, seq, rngVersion) ⇒ cùng stream ⇒ replay/audit được.
 * - Cô lập: mỗi action một stream riêng ⇒ batch seq…seq+n-1 = n single actions theo đúng thứ tự.
 * - Không dùng Math.random() ở bất kỳ đâu trong đường này.
 */

export function deriveActionSeedWords(
  secret: string,
  userId: string,
  seq: number,
  rngVersion: string = RNG_VERSION
): [number, number, number, number] {
  const digest = createHmac('sha256', secret)
    .update(`${userId}|${seq}|${rngVersion}`)
    .digest();
  return [
    digest.readUInt32BE(0),
    digest.readUInt32BE(4),
    digest.readUInt32BE(8),
    digest.readUInt32BE(12),
  ];
}

/**
 * Id tất định theo (userId, seq): replay cùng action luôn ra cùng id — truy được về `action_log`.
 * (Khác với client `createUniqueId` dùng Date.now + Math.random.)
 */
export function createSeqIdGenerator(userId: string, seq: number): IdGenerator {
  let counter = 0;
  return {
    nextId: (prefix: string) => `${prefix}_${userId}_${seq}_${counter++}`,
  };
}

export interface HmacRngOptions {
  secret: string;
  rngVersion?: string;
}

export function createHmacActionDepsFactory(options: HmacRngOptions): ActionDepsFactory {
  const rngVersion = options.rngVersion ?? RNG_VERSION;
  return {
    forAction(userId: string, seq: number) {
      return {
        rng: createRngFromSfc32Words(
          deriveActionSeedWords(options.secret, userId, seq, rngVersion)
        ),
        ids: createSeqIdGenerator(userId, seq),
      };
    },
  };
}
