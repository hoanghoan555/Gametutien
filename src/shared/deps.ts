/**
 * P5.1 — Contracts dependency-injection cho đường authoritative (ràng buộc 1, gate 2).
 *
 * Ba contract bắt buộc:
 *  - `Rng`         : nguồn ngẫu nhiên. Client = Math.random (lazy); server = HMAC per-action.
 *  - `Clock`       : nguồn thời gian. Client = Date.now; server = đồng hồ server (hoặc fixture khi test).
 *  - `IdGenerator` : nguồn id. Client = createUniqueId (Date.now + Math.random); server = tất định theo (userId, seq).
 *
 * Quy ước: file này CHỈ chứa interface — không implementation, không React/DOM, không Math.random/Date.now.
 */

export interface Rng {
  /** Trả số thực trong [0, 1). */
  next(): number;
}

export interface Clock {
  /** Thời điểm hiện tại (ms, epoch). */
  now(): number;
}

export interface IdGenerator {
  nextId(prefix: string): string;
}

/** Bộ deps tất định cho MỘT action cụ thể. */
export interface ActionDeps {
  rng: Rng;
  ids: IdGenerator;
}

/**
 * Ràng buộc 2: seed theo `(userId, seq)` — mỗi action có một stream riêng, tiêu thụ tuần tự.
 * Nhờ đó batch `seq … seq+n-1` cho cùng kết quả như xử lý từng action riêng lẻ theo đúng thứ tự.
 */
export interface ActionDepsFactory {
  forAction(userId: string, seq: number): ActionDeps;
}

export interface AuthorityDeps {
  actionDeps: ActionDepsFactory;
  clock: Clock;
}
