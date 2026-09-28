# VẠN ĐẠO TIÊN ĐỈNH — MULTIPLAYER DESIGN AUDIT

> **Trạng thái:** DRAFT v0.1 — tài liệu audit thiết kế, **chưa có dòng code backend nào**.
> **Baseline so sánh:** commit `20e5b5e` (v1.2). Mọi thay đổi MP về sau phải đối chiếu baseline này (Phụ lục A + `npm run sim`).
> **Bối cảnh:** Chủ dự án yêu cầu audit thiết kế theo 8 hướng trước khi code multiplayer. Ánh xạ 8 điểm → mục tài liệu ở §11.

## 0. TL;DR — Decision Log (cần chốt trước khi code)

| # | Câu hỏi | Khuyến nghị | Ảnh hưởng |
|---|---------|-------------|-----------|
| D1 | Backend stack | Node 22 + TypeScript (Fastify) + Postgres + Redis; WS cho realtime | §1.2 |
| D2 | Mô hình Đỉnh chung | 1 Đỉnh toàn cầu cho closed beta; shard/season sau | §4 |
| D3 | Trần offline khi có server | Giữ 8h như §21 | §6 |
| D4 | Offline chỉ tính khi autoCultivation bật (lưu server) | Có | §6 |
| D5 | Tách `lootProgress` khỏi Đỉnh chung → về từng người | Có — bắt buộc để loot cá nhân đúng nghĩa | §5 |
| D6 | Chính sách migration save v1 | Nhận 1 lần cho closed beta + gắn cờ + trần Power; siết trước public | §7 |
| D7 | Thưởng mốc cấp Đỉnh chung | Không phát Power thô; huy hiệu/danh hiệu/buff tạm | §4 |
| D8 | Auth | Guest theo thiết bị trước, liên kết tài khoản sau | §8 |
| D9 | Nhịp request | Client gom batch 2–5s/lần (server vẫn tự tính n) | §2 |
| D10 | BXH | Đóng góp tuần + tổng (từ `contribution_events`) | §4/§8 |
| D11 | Solo mode v1.2 | Giữ song song sau feature flag; không xoá | §7 |
| D12 | Retention `action_log` | 30 ngày (aggregate trước khi xoá) | §3 |

## 1. Kiến trúc: Server Authoritative (điểm audit 1)

### 1.1 Ma trận quyền sở hữu state

| State | v1.2 (client-only) | Multiplayer (đề xuất) | Ghi chú |
|-------|--------------------|------------------------|---------|
| Đỉnh: `level`, `currentExp`, `expToNextLevel`, `totalCultivations` | Client | **SERVER** | Nguồn sự thật duy nhất; client chỉ hiển thị delta |
| Đỉnh: `lootProgress`, `lootThreshold` | Client (nằm trong TowerState) | **SERVER, per-user** (chuyển khỏi Đỉnh chung) | D5 — nếu để chung, người vượt ngưỡng "ăn" loot của người khác |
| Player: `level`, `cultivationExp`, `power`, `stats` | Client | **SERVER** | Tính bằng chính công thức §16–§17 (shared package) |
| Player: `equipment`, `inventory`, `materials` | Client | **SERVER** | Mọi thao tác equip/dismantle phải qua server (P5.2+) |
| `contribution` (của người chơi) | Client | **SERVER + sổ cái riêng** | `contributions` tách khỏi `towers` |
| `settings.autoCultivation` | Client | **SERVER** | Điều khiển hành động tự động + điều kiện offline (D4) |
| `soundEnabled`, bộ lọc túi, tab đang mở | Client | Client | Không ảnh hưởng kinh tế |
| Hiệu ứng: số nổi, loot bay, toast, âm thanh | Client | Client (dẫn xuất từ `lootEvents`) | Server không quan tâm |

Nguyên tắc: **server giữ đúng những gì ảnh hưởng tiến trình/kinh tế; client chỉ giữ những gì thuần hiển thị.**

### 1.2 Stack đề xuất

| Phương án | Ưu | Nhược | Kết luận |
|-----------|----|-------|----------|
| **Node 22 + Fastify + Postgres + Redis** | TS end-to-end; tái dùng 100% hàm thuần `src/systems/*`; kiểm soát toàn bộ | Tự vận hành (deploy/monitoring) | **Khuyến nghị (D1)** |
| Supabase | Nhanh, Realtime sẵn, RLS | Logic authoritative nằm ở RPC/Edge; khó giữ "một người ghi" cho Đỉnh | Phương án B |
| Cloudflare Workers + Durable Objects | Một DO = một "người ghi" cho Đỉnh chung, hợp mô hình; vận hành nhẹ | Vendor lock-in; dữ liệu quan hệ phụ thuộc D1/Postgres ngoài | Phương án C — đáng cân nhắc |

Điểm mấu chốt: hệ thống hiện tại đã là **hàm thuần, không React/DOM** (§27) → server import lại đúng đoạn code đó ⇒ **parity online/offline/MP là tự nhiên, không phải viết lại công thức**.

### 1.3 Gói `shared`

Chuyển `src/systems/*`, `src/data/*`, `src/types/*`, `src/utils/saveValidation.ts` thành gói dùng chung (`packages/shared` hoặc `src/shared` xuất bản nội bộ):

- Client (solo mode) và server (MP mode) import cùng một nguồn công thức.
- `npm run sim` (§29) chạy được trên cả hai phía → tái dùng làm acceptance test cho server (gate P5.1).
- Hằng số cân bằng gom vào `shared/balance.ts` + `BALANCE_VERSION` — ghi version vào log mỗi action để truy vết.

## 2. Protocol: Client chỉ gửi Ý ĐỊNH "Khai Đỉnh" (điểm audit 2)

### 2.1 Luồng chuẩn (auto + thủ công dùng chung 1 endpoint)

```
CLIENT (tick 1s, §30)                    SERVER
  │ autoCultivation ON                     │
  │ gom tick → POST /actions/cultivate     │
  │  { seq, n?, mode: auto|manual }        │
  │ ──────────────────────────────────────►│ 1. xác thực token
  │                                        │ 2. kiểm tra seq (đơn điệu, idempotent)
  │                                        │ 3. ngân sách hành động: earned = (now - lastGrantAt) × rate_server (± burst)
  │                                        │    → n_thực = min(n_yêu_cầu, earned); dư KHÔNG cộng dồn vô hạn
  │                                        │ 4. chạy cultivateTowerSystem(state_server, n_thực) — RNG server
  │                                        │ 5. transaction: cộng Đỉnh chung + commit player + loot
  │ ◄──────────────────────────────────────│
  │ { ackSeq, serverTime,                  │
  │   towerDelta, playerDelta, lootEvents} │
  │ 6. áp delta vào view (không phải nguồn sự thật)
  │ 7. phát hiệu ứng từ lootEvents          │
```

### 2.2 Quy tắc sắt

- Client **KHÔNG BAO GIỜ** gửi hoặc được tin ở các trường: `towerExp`, `playerExp`, `cultivationRate`, `power`, kết quả loot, danh sách item.
- Client chỉ gửi: `seq` (đơn điệu), `n` (số hành động muốn claim, tùy chọn), `mode` (auto/manual — chỉ để client phát âm thanh; server xử lý như nhau), `clientTime` (telemetry, **không dùng cho toán**).
- Mọi con số hiển thị đến từ delta của server.

### 2.3 Idempotency & đồng bộ

- `actionId = userId:seq`; server lưu `lastSeq`; gửi trùng → trả lại ack đã cache (không xử lý lại).
- `seq` lệch (mất gói/đổi thiết bị) → `409` → client gọi `GET /sync` để tái đồng bộ rồi tiếp tục.
- Batching (D9): gom 2–5s/request giảm write amplification; server vẫn tự quyết `n_thực`.

## 3. Chống spam / cheat (điểm audit 3)

### 3.1 Ngân sách hành động do server cấp (chống spam cốt lõi)

- `earned = floor(fractional + (serverNow - lastGrantAt) × rate_server)`, trong đó `rate_server` tính từ state **server** (equipment, stats, soft caps §28).
- Cấp `min(n_request, earned)`; phần dư bị bỏ (trần burst ~2 giây-worth để chịu RTT jitter — chốt số khi implement).
- Hệ quả: client sửa tốc độ/exp thế nào cũng vô nghĩa — trần do server quyết.

### 3.2 Tầng vận chuyển

- Rate limit: N request/phút/user + /IP; trần message/phút trên WS; vượt → `429 + retryAfter`.
- Chống replay: `seq` đơn điệu + token hết hạn/quay vòng; không nhúng secret nào vào bundle client.
- Mọi input validate schema (shared zod/JSON schema) trước khi vào logic.

### 3.3 Server là trọng tài số học

- **RNG loot thuộc server**: `seed = HMAC(server_secret, userId | seq)` → tất định, audit/đối soát được (replay lại ra đúng item), client không đoán được.
- Toàn bộ bất biến thực thi trên server: §7.1 (quy tắc sinh trang bị), §12 (auto-equip theo Power thật), **Rule 14b** (Tiên Phẩm không rơi mất khi túi đầy), túi ≤ 100, nguyên liệu phân giải §15.

### 3.4 Phát hiện & xử lý bất thường

- Histogram hành động/ngày per-user; lệch > kσ → cờ điều tra.
- `action_log` ghi mọi batch (seq range, n, tower_exp, loot count) — retention 30 ngày (D12), aggregate trước khi xoá.
- Xử lý theo bậc: shadow-limit (tạm giảm ngân sách) → freeze → ban; có kill-switch per-tài khoản.

## 4. Shared Đỉnh — nhiều người cùng đóng góp (điểm audit 4)

- **Mô hình (D2)**: 1 Đỉnh toàn cầu `towers.id = 'global'` cho closed beta; thiết kế sẵn cột `season_id` để shard/season sau này.
- **Ghi nguyên tử**: mỗi batch cộng dồn trong 1 transaction (`SELECT … FOR UPDATE` hoặc advisory lock; nếu chọn phương án C thì Durable Object đơn luồng). Không có merge phía client, không có lost-update.
- **Sổ đóng góp**: `contributions(user_id, tower_id, total_exp, updated_at)` — dùng cho "Top cống hiến" + đối soát; `contribution_events` append-only (có thể sample) cho BXH tuần (D10).
- **Phát sóng realtime**: gộp + throttle ~1 lần/2s (`tower.update`), event riêng khi qua mốc cấp (`milestone`); tránh broadcast mỗi action.
- **Thưởng mốc (D7)**: khuyến nghị **không phát Power thô**; trước mắt là huy hiệu/danh hiệu + thông báo toàn server; buff tạm cân nhắc sau khi đo.
- **Công bằng**: một người không thể chi phối Đỉnh — tốc độ đóng góp bị chặn bởi chính ngân sách hành động của người đó (§3.1), không có cửa "bơm" ngoài luật.

## 5. Loot cá nhân tách khỏi shared state (điểm audit 5)

- **Roll loot trên server, mỗi hành động** (seed §3.3) → item thuộc `items.user_id`; không ai nhìn thấy hay tranh loot của ai.
- **Tách `lootProgress`/`lootThreshold` khỏi Đỉnh chung (D5)** — chuyển thành state per-user trên server. Nếu giữ ở Đỉnh chung: ai vượt ngưỡng trước sẽ "ăn" lượt rơi, người khác không bao giờ rơi → sai bản chất "loot cá nhân".
  - Hệ quả tài liệu: §5/§19 hiện mô tả loot progress thuộc Đỉnh — khi tài liệu này được duyệt sẽ cập nhật GAME_DESIGN (§5/§19/§22) + changelog v1.3.
- Auto-equip / auto-dismantle / Rule 14b chạy **trên server** theo `settings` server-side; client chỉ nhận `lootEvents` để diễn hoạt ảnh.
- Client vẫn nhận kèm `powerDelta` cho từng item (để hiện "+Chiến Lực") — đúng bằng số server tính.

## 6. Offline progression khi có server (điểm audit 6)

- **Định nghĩa mới**: offline = khoảng `(last_grant_at → now]` do **server** đếm; chỉ tính khi `autoCultivation` bật (lưu server — D4); claim khi đăng nhập (`POST /offline/claim`, gộp được vào `GET /sync`).
- **Thuật toán giữ nguyên §21 v1.2**: tick 1 giây, `actions = floor(fractional + rate_hiện_hành)` — rate đổi giữa chừng khi auto-equip loot mới. Vì chạy bằng chính hàm shared trên state server + RNG server ⇒ **offline khớp tuyệt đối với online**, đúng bất biến §21/test 5 §29.
- **Trần**: giữ `MAX_OFFLINE_SECONDS = 8h` (D3 có thể nâng 12h); `MAX_EXACT_ACTIONS = 1.2M` giữ nguyên, vượt trần ngoại suy như hiện tại.
- **Hiệu năng**: 8h ở tốc độ tối đa ≈ 1.15M hành động ≈ ~0.5s Node (§28) — chấp nhận trong request claim cho beta; nếu đông → chạy background + cache, claim idempotent theo `offline_window_id` (1 lần/mốc).
- **Chống lạm dụng**: đồng hồ server tuyệt đối; không dùng `clientTime`; không cộng dồn nhiều cửa sổ chồng lấn.

## 7. localStorage chỉ còn cache / client state (điểm audit 7)

| Dữ liệu | Nguồn sự thật mới | Client giữ gì |
|---------|-------------------|---------------|
| player / tower / equipment / inventory / materials | **Server** | Snapshot cache để vẽ ngay khi mở game (thay bằng delta server khi connect) |
| `settings.autoCultivation` | **Server** (mirror local để UI phản hồi tức thì) | Mirror + cờ "pending sync" |
| `soundEnabled`, bộ lọc túi, tab | Client | Giữ nguyên |
| Auth token | Server | **Khuyến nghị httpOnly cookie** (hoặc secure storage); không nhét vào bundle |
| Save v1 `vandao_tien_dinh_save_v1` | Chỉ dùng **1 lần để migration** | Sau import thành công → đổi thành key backup `…_migrated_<ts>` |

- **Migration (D6)**: `POST /migration/import` — dùng chính `sanitizeSaveData` (đưa vào shared) để chặn save hỏng; server validate + gắn cờ `imported_beta`; chính sách trần Power chốt trước khi mở public.
- **Dual mode (D11)**: solo offline-first v1.2 **không bị xoá** — MP mode chạy sau feature flag; chỉ khai tử solo khi MP đã chứng minh ổn định và có quyết định riêng.

## 8. API & Data model (điểm audit 8 — thiết kế trước, code sau)

### 8.1 Data model (Postgres; `jsonb` cho cấu trúc item)

| Bảng | Cột chính | Ghi chú |
|------|-----------|---------|
| `users` | id, auth_provider, status, created_at | Guest device trước (D8) |
| `players` | user_id PK, level, cultivation_exp, power_cache, stats_json, contribution_total, auto_cultivation, last_grant_at, last_seq, fractional_actions, loot_progress, loot_threshold, balance_version | 1-1 với users; `power_cache` chỉ để đọc nhanh, luôn recalc khi ghi |
| `items` | id, user_id, name, type, level, rarity, power, base_stats_json, affixes_json, special_effect_json, equipped_slot (nullable), source_seq, created_at | Truy được về `action_log` |
| `materials` | user_id PK, basic, linh_stone, advanced, rare | 4 nguyên liệu §15 |
| `towers` | id PK ('global'), season_id, level, current_exp, exp_to_next, total_cultivations, version, updated_at | 1 dòng cho beta |
| `contributions` | user_id, tower_id, total_exp, updated_at | PK (user_id, tower_id) |
| `contribution_events` | id, user_id, tower_id, exp, created_at | Append-only, phục vụ BXH tuần (D10); có thể sample |
| `action_log` | id, user_id, seq_from, seq_to, n, tower_exp, player_exp, loot_count, balance_version, created_at | Retention 30 ngày (D12) |
| `settings` | user_id PK, auto_equip, auto_dismantle, auto_dismantle_max_rarity | `sound` giữ client |
| `migrations` | user_id PK, imported_at, save_version, content_hash | 1 lần/user |

### 8.2 REST (payload mẫu)

```
POST /auth/guest        → { token, userId }
GET  /sync              → { serverTime, lastSeq, player, towerSnapshot, settings, pendingOffline? }
POST /actions/cultivate { seq, n?, mode }
                        → { ackSeq, serverTime, towerDelta{exp,level,levelsGained},
                            playerDelta{exp,level,contribution}, lootEvents[] }
POST /offline/claim     { } → { summary: OfflineRewardSummary }
POST /migration/import  { save: SaveDataV1 } → { ok, player }
```

- Lỗi chuẩn: `{ code, message, retryAfter? }`; `429` = spam; `409` = lệch seq → client `/sync`.
- P5.2 bổ sung: `/equip`, `/unequip`, `/dismantle`, `/dismantle-bulk` (cùng khuôn validate server).
- `lootEvents[]` tái sử dụng đúng struct hiện tại (`GeneratedItem` + `autoEquipped`/`dismantled`/`powerDelta`) → UI không phải đổi.

### 8.3 WebSocket

- Kênh `/rt`: `tower.update` (throttle ~2s), `milestone`, `player.update` (đồng bộ đa thiết bị), heartbeat 15s; kết nối lại kèm `lastSeq` để resume.

### 8.4 Versioning cân bằng

- `BALANCE_VERSION` ghi vào mỗi `action_log` + `players.balance_version`; mọi thay đổi công thức bắt buộc chạy lại `npm run sim` và so Phụ lục A (đúng quy trình §31).

## 9. Roadmap triển khai P5 (gate từng bước)

| Bước | Nội dung | Gate (điều kiện qua) |
|------|----------|----------------------|
| **P5.0** | Audit thiết kế (tài liệu này) | Chủ dự án chốt D1–D12 |
| P5.1 | Gói `shared` + server skeleton (auth guest, `/sync` read-only) | `npm run sim` chạy trên shared cho cùng kết quả baseline; lint/build client không đổi |
| P5.2 | `/actions/cultivate` online + chống spam + loot server-side | 2 browser cùng thấy 1 Đỉnh; load test 100 CCU × 1 action/s; server chặn được client sửa rate |
| P5.3 | Realtime + BXH cống hiến + milestone | Broadcast throttle đúng; BXH khớp `contributions` |
| P5.4 | Migration v1 + offline claim trên server | Test save hỏng (sanitize), offline 60s/1h/8h khớp tuyệt đối test 5 §29 |
| P5.5 | Hardening: anomaly detect, audit, backup/restore, observability | Kịch bản lỗi/khôi phục diễn tập xong |
| P5.6 | Closed beta (feature flag), solo mode giữ nguyên | Quyết định D11 về solo được thực thi |

Ngoài phạm vi P5: PvP/đấu trường, chat, guild, giao dịch — giữ nguyên tinh thần §32 (ưu tiên bất đồng bộ trước).

## 10. Rủi ro & đối sách

| Rủi ro | Mức | Đối sách |
|--------|-----|----------|
| Client bị sửa (cheat) | Cao | Server authoritative toàn bộ (§3.3) — client sửa vô nghĩa |
| Save v1 chỉnh tay trước migration | Trung bình | Sanitize shared + cờ beta + trần Power (D6), siết trước public |
| Offline 8h tốn CPU server | Trung bình | Đo §28 (~0.5s); nếu đông → background + cache theo `offline_window_id` |
| Write amplification (action/s × CCU) | Trung bình | Batch 2–5s (D9) + ghi delta 1 transaction/Đỉnh |
| Broadcast bão hoà khi CCU tăng | Thấp–TB | Throttle 2s + coalesce; scale đọc bằng cache |
| Lệch công thức client/server | Cao nếu chép tay | Bắt buộc dùng chung package (§1.3) — không chép |
| Migration làm mất save người chơi | Cao | Backup key trước import; import idempotent; rollback được |

## 11. Ánh xạ 8 điểm audit → mục tài liệu

| # | Yêu cầu | Mục |
|---|---------|-----|
| 1 | Server authoritative — server giữ Tower EXP/Level + trạng thái dùng chung | §1 |
| 2 | Client chỉ gửi action `Khai Đỉnh`, không tự quyết Tower EXP | §2 |
| 3 | Chống spam/cheat | §3 |
| 4 | Shared Đỉnh đúng khi nhiều người cùng đóng góp | §4 |
| 5 | Loot cá nhân tách khỏi shared Tower state | §5 |
| 6 | Định nghĩa lại offline progression khi có server | §6 |
| 7 | localStorage chỉ còn cache/client state | §7 |
| 8 | Thiết kế API/data model trước khi viết backend | §8 |

## 12. Việc KHÔNG làm trong tài liệu này

- Không sửa code, không đụng baseline `20e5b5e`.
- Không sửa `GAME_DESIGN.md` vội: chờ chốt D1–D12 → cập nhật §5/§19/§22/§32 + changelog v1.3 (đúng quy trình §31).
- Chưa chọn nhà cung cấp/deploy; chưa tạo repo backend.
