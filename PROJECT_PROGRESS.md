# VẠN ĐẠO TIÊN ĐỈNH — NHẬT KÝ TIẾN ĐỘ DỰ ÁN & HƯỚNG DẪN BÀN GIAO (PROJECT PROGRESS & HANDOFF)

> **Mục đích tài liệu:** Lưu trữ chi tiết tất cả các công việc đã hoàn thành, hiện trạng kiến trúc, danh sách kiểm thử và các bước tiếp theo để tránh nhầm lẫn và giúp bất kỳ AI coding hoặc kỹ sư nào kế nhiệm cũng nắm bắt được ngay lập tức.
> **Quy tắc bắt buộc:** Sau khi hoàn thành bất kỳ hạng mục nào trong kế hoạch, AI coding phải cập nhật tài liệu này trước khi kết thúc phiên làm việc.

---

## 1. THÔNG TIN CHUNG DỰ ÁN
- **Tên dự án:** Vạn Đạo Tiên Đỉnh (Idle / Incremental Tu Tiên).
- **Công nghệ chính:** React 19, TypeScript, Vite, Tailwind CSS, Node.js (Backend Multiplayer).
- **Trạng thái kiểm thử:** 
  - `npm run lint`: **PASS 100%** (`tsc --noEmit` không lỗi).
  - `npm run mp:test`: **PASS 57/57 tests**.
  - `npm run sim`: **PASS 11/11 bất biến** (6h/24h auto-cultivate ổn định).
  - `npm run build`: **PASS**.
- **Chế độ chơi hiện tại:** Dual-mode (Solo Offline-First mượt mà + Server Authoritative Realtime, Hardening & Cloud Migration P5.6 Closed Beta).

---

## 2. BẢNG TIẾN ĐỘ TỔNG THỂ (ROADMAP STATUS)

| Giai đoạn | Hạng mục | Trạng thái | Ghi chú & Bằng chứng |
|-----------|----------|------------|----------------------|
| **Giai đoạn 1** | Core Loop Khai Đỉnh & Hệ thống Đỉnh | ✅ HOÀN THÀNH | Đỉnh tăng cấp, sinh trang bị theo Level Đỉnh, 6 phẩm chất |
| **Giai đoạn 2** | Cân bằng v1.1 & Headless Simulation | ✅ HOÀN THÀNH | Chặn bùng nổ chỉ số, soft cap tốc độ tu luyện, harness `npm run sim` |
| **Giai đoạn 3 & 4** | Tối ưu UI/Code v1.2, Đồng bộ Save | ✅ HOÀN THÀNH | Rule 14b (không mất Tiên Phẩm), commit đồng bộ stateRef, dọn mã chết |
| **Tính năng mới** | Luyện Trận Bổn Mệnh (Enhancement) | ✅ HOÀN THÀNH | Cường hóa 6 ô trang bị lên +50, 4 bậc hào quang, nâng Cân Bằng / Cực Đại |
| **Tính năng mới** | Linh Thú Tiên Uyển (Spirit Sanctuary) | ✅ HOÀN THÀNH | Lục Đại Thần Thú, Ấp Trứng, Bồi Dưỡng Lv.1–50, Xuất Chiến Hộ Thể bay lượn |
| **P5.0** | Multiplayer Design Audit | ✅ HOÀN THÀNH | Đã chốt 12 quyết định kiến trúc D1–D12 trong `MULTIPLAYER_DESIGN.md` |
| **P5.1** | Gói `shared` & Server Skeleton | ✅ HOÀN THÀNH | 12/12 gate nghiệm thu: Auth guest, `/sync` read-only, RNG HMAC tất định |
| **P5.2** | Gameplay Online Authoritative | ✅ HOÀN THÀNH | Mở `POST /actions/cultivate`, 1 Đỉnh toàn cầu, Budget Engine chống cheat |
| **P5.3** | WebSocket Realtime & Bảng Phong Thần | ✅ HOÀN THÀNH | Kênh `/rt`, `GET /leaderboard`, Modal Phong Thần (Top Cống Hiến & Chiến Lực) |
| **P5.4** | Migration Save v1 & Offline Server | ✅ HOÀN THÀNH | `POST /migration/import`, `POST /offline/claim` (trần 8h chuẩn server) |
| **P5.5** | Hardening & Observability | ✅ HOÀN THÀNH | Rate limiter sliding window, Anomaly detection, Telemetry `/metrics`, SHA256 Backup & Restore |
| **P5.6** | Closed Beta & Dual-Mode Release | ✅ HOÀN THÀNH | Chế độ Solo & Online Multiplayer hoạt động song song hoàn hảo, 57/57 tests PASS |

---

## 3. CHI TIẾT CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH

### A. Hệ Thống Cốt Lõi (Core Gameplay)
- **Vạn Đạo Tiên Đỉnh (`src/systems/tower.ts`, `src/systems/cultivation.ts`)**:
  - Khai Đỉnh nhận EXP Đỉnh, EXP Tu Vi và tiến độ Rơi Đồ (Loot Progress).
  - Tự động hóa tu luyện (Auto-cultivation) chạy theo tick trung tâm 1 giây.
- **Trang Bị & Phân Giải (`src/systems/equipment.ts`, `src/systems/loot.ts`)**:
  - 6 ô trang bị: Vũ Khí, Y Phục, Hộ Oản, Giày, Hộ Phù, Giới Chỉ.
  - Phẩm chất: Phàm (Trắng), Hoàng (Lục), Huyền (Lam), Địa (Tím), Thiên (Cam), Tiên (Đỏ).
  - **Rule 14b**: Khi túi đồ đầy (100/100), trang bị Tiên Phẩm (Đỏ) rơi ra sẽ tự động đẩy món trang bị yếu nhất không phải Đỏ ra ngoài, tuyệt đối không bao giờ làm mất Tiên Phẩm của người chơi.
  - Đầy đủ tính năng: Tự động mặc đồ theo Chiến Lực thật (`getPowerDeltaIfEquipped`), Tự động phân giải theo phẩm chất, Phân giải hàng loạt.
- **Cảnh Giới & Đột Phá (`src/data/realms.ts`, `src/systems/progression.ts`)**:
  - 6 đại cảnh giới: Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Luyện Hư (mở rộng vô hạn).
  - Bình cảnh đột phá cảnh giới và tính toán thuộc tính/chiến lực chuẩn xác.

### B. Hệ Thống Luyện Trận Bổn Mệnh (Enhancement System)
- **File mã nguồn:** `src/systems/enhancement.ts`, `src/components/character/EnhanceModal.tsx`, `tests/enhancement.test.ts`.
- Cường hóa theo vị trí ô trang bị (thay vì theo từng món đồ) giúp giữ nguyên cấp cường hóa khi thay đổi trang bị mới.
- Cấp tối đa: **+50**.
- **4 Bậc Hào Quang (Glow Tiers):**
  - Lv 1–10: Thanh Quang (Lục)
  - Lv 11–25: Lam Diễm (Lam)
  - Lv 26–40: Tử Hà (Tím)
  - Lv 41–50: Kim Quang Cực Phẩm (Vàng Kim)
- **Thao tác một chạm:** "Cường Hóa +1", "Cường Hóa Cực Đại (Max)", và "Cân Bằng 6 Ô".

### C. Hệ Thống Linh Thú Tiên Uyển (Spirit Beast Sanctuary - Tab 3)
- **File mã nguồn:** `src/types/beast.ts`, `src/data/beasts.ts`, `src/systems/beast.ts`, `src/views/SpiritBeastView.tsx`, `src/components/beast/BeastIcon.tsx`, `tests/beast.test.ts`.
- **Lục Đại Thần Thú Thượng Cổ:**
  1. *Thanh Long (Đỏ - Thần Mộc)*: Tăng mạnh Công Kích & Sát Thương Bạo Kích.
  2. *Bạch Hổ (Cam - Bạch Kim)*: Tăng Tỷ Lệ Bạo Kích & Tốc Độ Xuất Chiêu.
  3. *Chu Tước (Cam - Nam Hỏa)*: Tăng Tốc Độ Tu Luyện & +15% EXP Tiên Đỉnh.
  4. *Huyền Vũ (Tím - Huyền Thủy)*: Tăng mạnh Sinh Lực (HP) & Phòng Thủ (DEF).
  5. *Hỏa Kỳ Lân (Tím - Kỳ Lân Thổ)*: Tăng Cơ Duyên Luyện Khí (+15% Loot Rate) & Sinh Lực.
  6. *Cửu Vĩ Thiên Hồ (Lam - Huyễn Thần)*: Cân bằng tăng Công, Thủ, Bạo Kích.
- **Cơ chế:**
  - **Ấp Trứng (Thiên Địa Linh Noãn):** Tiêu hao 800 Linh Thiết + 300 Linh Thạch. Mở khóa thần thú mới hoặc tăng cấp bồi dưỡng nếu đã sở hữu.
  - **Bồi Dưỡng:** Tăng cấp từ Lv.1 đến Lv.50, mở rộng thuộc tính hộ chủ.
  - **Xuất Chiến:** Đồng hành cùng chủ nhân, tăng Chiến Lực và **bay lượn hộ thể bên cạnh nhân vật đả tọa** tại Màn hình chính (`TowerScene`).
  - Lưu và sanitize an toàn trong cấu trúc lưu trữ `PlayerState.beastState`.

### D. Multiplayer Architecture (P5.0 & P5.1)
- **File mã nguồn:** `src/shared/*`, `server/src/*`, `server/db/schema.sql`, `tests/*`.
- Gói `src/shared/`: Hoàn toàn là hàm thuần TypeScript, không phụ thuộc DOM/React, dùng chung cho cả Client và Server.
- Dependency Injection: Tách `Rng`, `Clock`, `IdGenerator` để đường tính toán của Server hoàn toàn độc lập với `Math.random()` và `Date.now()`.
- Thuật toán RNG HMAC tất định (`tests/server-rng.test.ts`): Cùng seed/seq cho ra cùng kết quả 100%.
- Server Skeleton Fastify với đầy đủ route `/healthz`, `/auth/guest`, `/sync` (read-only), và khóa bảo vệ 501 cho `/actions/cultivate`.
- Thiết kế Transaction-safe khóa hàng Global Tower (`SELECT ... FOR UPDATE` recipe).

### E. Gameplay Online Authoritative (P5.2) — Hoàn thành 2026-10-03
- **File mã nguồn:** `server/src/app.ts`, `server/src/main.ts`, `server/src/vitePlugin.ts`, `src/services/multiplayerApi.ts`, `tests/server-cultivate.test.ts`.
- **Khai mở endpoint `POST /actions/cultivate`**:
  - Nhận yêu cầu Khai Đỉnh từ client với `{ seq, n, mode }`.
  - Xác thực Bearer Token guest qua HMAC SHA-256.
- **Budget Engine chống gian lận**:
  - Server tự động tính toán số hành động hợp lệ sinh ra theo thời gian thực: `earned = fractionalActions + (serverNow - lastGrantAt) * cultivationRate`.
  - Cắt bỏ mọi nỗ lực spam vượt trần từ client; đảm bảo tính công bằng tuyệt đối.
- **Global Shared Tower (1 Đỉnh chung toàn cầu)**:
  - 2 hoặc nhiều người chơi cùng Khai Đỉnh đóng góp EXP vào chung 1 Vạn Đạo Tiên Đỉnh.
  - Serialization qua mutex/writeLock chống lost update (`store-concurrency.test.ts` & `tests/server-cultivate.test.ts`).
- **Loot cá nhân độc lập (D5)**:
  - Tiến độ rơi đồ `lootProgress` thuộc về từng người chơi; người chơi này nhận loot không làm suy giảm tiến độ của người chơi khác.
- **Tích hợp Vite Dev Server**:
  - Tạo `server/src/vitePlugin.ts` gắn middleware `/api/*` chuyển tiếp mượt mà vào Fastify in-memory app.
- **Bộ test mở rộng**:
  - Bổ sung 5 bài test chuyên sâu trong `tests/server-cultivate.test.ts`.
  - Nâng tổng số test lên **47/47 tests PASS 100%**.

### F. WebSocket Realtime & Bảng Phong Thần (P5.3) — Hoàn thành 2026-10-03
- **File mã nguồn:** `server/src/ws.ts`, `server/src/store/memory.ts`, `src/components/leaderboard/LeaderboardModal.tsx`, `src/components/layout/TopStatusBar.tsx`, `tests/server-realtime-leaderboard.test.ts`.
- **Kênh WebSocket `/rt` & `/api/rt`**:
  - Tự động kết nối, xác thực token guest và theo dõi số lượng người chơi trực tuyến (`onlineCount`).
  - Broadcast định kỳ tiến trình Tiên Đỉnh toàn cầu (`tower.update`) throttled 1.5s.
  - Broadcast sự kiện Đột Phá Tiên Đỉnh (`milestone`) ngay lập tức khi Đỉnh lên cấp.
- **Bảng Phong Thần Tiên Giới (`GET /leaderboard`)**:
  - Xếp hạng Top 20 Cao Thủ Tiên Giới: *Top Cống Hiến Đỉnh* & *Top Chiến Lực*.
  - Hiển thị danh hiệu Tiên Tôn cho Quán Quân, Cảnh Giới & Tầng của từng đạo hữu.
  - Tự động hiển thị thứ hạng cá nhân (`myRank`) của người chơi hiện tại.
- **Giao Diện UI Bảng Phong Thần**:
  - Nút bấm "Phong Thần" kèm đèn tín hiệu Live trực tuyến ngay trên thanh tiêu đề chính `TopStatusBar`.
  - Hộp thoại Phong Thần sang trọng, hiển thị live ticker các hành động cống hiến từ server.
- **Bộ test mở rộng**:
  - Bổ sung 3 bài test chuyên sâu trong `tests/server-realtime-leaderboard.test.ts`.
  - Nâng tổng số test lên **50/50 tests PASS 100%**.

### G. Migration Save v1 & Bế Quan Ngoại Tuyến Server (P5.4) — Hoàn thành 2026-10-03
- **File mã nguồn:** `server/src/app.ts`, `server/src/store/memory.ts`, `src/services/multiplayerApi.ts`, `tests/server-migration-offline.test.ts`.
- **Khai mở endpoint `POST /migration/import`**:
  - Nhập file save local v1 lên tài khoản guest trên server.
  - Sử dụng `sanitizeSaveData` làm sạch dữ liệu, lọc bỏ giá trị bất thường/hỏng, chống hack chỉ số.
  - Cơ chế chống trùng lặp `migratedAt` ngăn chặn import đè nhiều lần.
- **Khai mở endpoint `POST /offline/claim`**:
  - Tính toán phần thưởng bế quan ngoại tuyến hoàn toàn bằng đồng hồ Server (`now - lastGrantAt`).
  - Áp dụng thuật toán bế quan authoritative chuẩn (trần tối đa 8 giờ = 28,800 giây).
  - Tự động đóng góp EXP vào Vạn Đạo Tiên Đỉnh và phát thông báo realtime cho toàn máy chủ.
- **Bộ test mở rộng**:
  - Bổ sung 3 bài test chuyên sâu trong `tests/server-migration-offline.test.ts`.
  - Nâng tổng số test lên **53/53 tests PASS 100%**.

### H. Hardening & Observability (P5.5) — Hoàn thành 2026-10-03
- **File mã nguồn:** `server/src/rateLimit.ts`, `server/src/app.ts`, `server/src/store/memory.ts`, `tests/server-hardening-observability.test.ts`.
- **Cơ chế Rate Limiting (Sliding Window)**:
  - Giới hạn tần suất tạo tài khoản `/auth/guest` (tối đa 20 tài khoản/phút trên mỗi thiết bị).
  - Giới hạn tần suất gửi hành động Khai Đỉnh `/actions/cultivate` (tối đa 20 requests/giây trên mỗi user), trả mã HTTP 429 (`rate_limited`) kèm thời gian `retryAfterMs`.
- **Anomaly Detection (Phát hiện gian lận & dị thường)**:
  - Tự động ghi nhận log dị thường (`rate_exceeded`, `seq_jump`, `invalid_payload`).
  - Cảnh báo khi người chơi gửi sequence nhảy cóc vượt quá trần cho phép (> 50 bước).
- **Disaster Recovery & Backup/Restore**:
  - Endpoint quản trị `/admin/backup` đóng gói toàn bộ trạng thái Global Tower và người chơi kèm mã băm SHA256 Checksum bảo vệ tính toàn vẹn.
  - Endpoint `/admin/restore` kiểm tra tính hợp lệ của checksum trước khi phục hồi hệ thống.
- **Telemetry & Metrics (`GET /metrics`)**:
  - Cung cấp số liệu giám sát: `serverTime`, `uptimeSeconds`, `activeUsers`, `totalCultivations`, `towerLevel`, danh sách các dị thường gần nhất.
- **Bộ test mở rộng**:
  - Bổ sung 3 bài test chuyên sâu trong `tests/server-hardening-observability.test.ts`.
  - Nâng tổng số test lên **56/56 tests PASS 100%**.

### I. Closed Beta & Dual-Mode Release (P5.6) — Hoàn thành 2026-10-03
- **File mã nguồn:** `src/components/layout/TopStatusBar.tsx`, `src/components/common/DebugPanel.tsx`, `tests/dual-mode-feature-flag.test.ts`.
- **Cơ chế Dual-Mode (Song Song Hai Chế Độ)**:
  - 🧘 **Chế độ Độc Hành Tu Tiên (Solo Mode)**: Hoạt động offline-first 100% trên trình duyệt người chơi, lưu trữ localStorage độc lập, bảo toàn nguyên vẹn 100% lối chơi v1.2.
  - 🌐 **Chế độ Tiên Giới (Online Multiplayer)**: Kết nối vào Vạn Đạo Tiên Đỉnh toàn cầu, nhận thưởng Bế Quan Server-authoritative (trần 8h), Bảng Phong Thần thời gian thực qua WebSocket, bảo vệ bởi Rate Limiter và Anomaly Detector.
  - Hỗ trợ Cloud Sync 1-click đưa dữ liệu từ chế độ Solo lên tài khoản Cloud bất kỳ lúc nào.
- **Bộ test mở rộng**:
  - Bổ sung bài test `tests/dual-mode-feature-flag.test.ts`.
  - Nâng tổng số test lên **57/57 tests PASS 100%**.

---

## 4. HƯỚNG DẪN CHO AI CODING TIẾP THEO (INSTRUCTIONS FOR NEXT AI)

Dự án đã hoàn thành **100% toàn bộ lộ trình phát triển (Giai đoạn 1 đến P5.6)**! Khi tiếp nhận dự án để bảo trì hoặc mở rộng thêm tính năng trong tương lai, bạn hãy tuân thủ các quy tắc sau:
1. **Kiểm tra trạng thái codebase:**
   - Chạy `npm run lint` để kiểm tra TypeScript (đảm bảo 0 error).
   - Chạy `npm run mp:test` để xác nhận toàn bộ 57 tests đang PASS 100%.
   - Chạy `npm run sim -- --quick` để xác nhận 11 bất biến toán học/cân bằng game không bị phá vỡ.
2. **Nguyên tắc bảo trì cốt lõi:**
   - Luôn giữ tính cô lập giữa 2 chế độ Solo và Online.
   - Không tự ý sửa đổi công thức cốt lõi (`calculateStatsAndPower`, `addPlayerCultivationExp`, `calculateTowerExpToNextLevel`).
   - Mọi API backend mới phải đi kèm unit test tương ứng trong thư mục `tests/`.
   - Cập nhật nhật ký dự án vào file này (`PROJECT_PROGRESS.md`) sau mỗi phiên làm việc.
