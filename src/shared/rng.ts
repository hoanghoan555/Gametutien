import { Rng } from './deps';

/**
 * P5.1 — PRNG tất định (ràng buộc 1): dùng cho test/dev; server dùng seed HMAC-SHA256 rồi
 * chạy qua đúng `createRngFromSfc32Words` này (một thuật toán duy nhất, replay được).
 *
 * - `xmur3` : hash chuỗi → chuỗi seed 32-bit.
 * - `sfc32` : PRNG 128-bit nhỏ, nhanh, chạy giống nhau trên mọi runtime (Node/browser).
 */

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
  let x = a >>> 0;
  let y = b >>> 0;
  let z = c >>> 0;
  let w = d >>> 0;
  return () => {
    const t = (((x + y) | 0) + w) | 0;
    w = (w + 1) | 0;
    x = y ^ (y >>> 9);
    y = (z + (z << 3)) | 0;
    z = (z << 21) | (z >>> 11);
    z = (z + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Số vòng warm-up chuẩn của sfc32 trước khi dùng (tránh seed kém phân tán ở các draw đầu). */
export const SFC32_WARMUP_ROUNDS = 12;

export function createRngFromSfc32Words(words: readonly [number, number, number, number]): Rng {
  const next = sfc32(words[0], words[1], words[2], words[3]);
  for (let i = 0; i < SFC32_WARMUP_ROUNDS; i += 1) next();
  return { next };
}

/** RNG tất định từ chuỗi seed (test/dev — server authoritative dùng seed HMAC). */
export function createSeededRngFromString(seed: string): Rng {
  const hash = xmur3(seed);
  return createRngFromSfc32Words([hash(), hash(), hash(), hash()]);
}
