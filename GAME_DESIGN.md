# VẠN ĐẠO TIÊN ĐỈNH — GAME DESIGN & CODING AGENT SPEC

> 🔒 **TÀI LIỆU ĐÃ KHÓA (LOCKED)** — Nguồn sự thật duy nhất (Single Source of Truth) cho coding agent.
>
> Phiên bản: **1.1** · Khóa ngày: 2026-09-27 · Chi tiết thay đổi: xem §31.
> Platform: HTML5 Browser (Vite + React 19 + TypeScript) · Orientation: Portrait 9:16.
> Persistence MVP: localStorage (`vandao_tien_dinh_save_v1`) · Ngôn ngữ UI: Tiếng Việt.
>
> Quy ước: số mục (§N) khớp với tham chiếu `Section N` trong mã nguồn.
> §1–§15: luật chơi · §16–§21: công thức · §22–§30: hạ tầng · §31–§32: quy trình & tương lai.

## 1. TẦM NHÌN GAME
- Game idle/incremental tu tiên trên trình duyệt, chạy hoàn toàn client-side trong bản MVP.
- Người chơi sở hữu một nhân vật tu tiên và phát triển **Vạn Đạo Tiên Đỉnh**.
- Đỉnh KHÔNG phải boss, KHÔNG có HP, KHÔNG chết, KHÔNG bị phá.
- Đỉnh là cổ vật tu tiên có **Level + EXP**; Level Đỉnh quyết định Level trang bị sinh ra.
- Không PvP, không cơ chế thua trong MVP. Rời game vẫn tu luyện (bế quan, §21).

## 2. CORE GAME LOOP
Khai Đỉnh (thủ công hoặc tự động)
→ Nhận **Đỉnh EXP** + **Tu Luyện EXP** + **Điểm tiến độ Loot**
→ Đỉnh tăng cấp (Level cao hơn = trang bị sinh ra Level cao hơn)
→ Khi tiến độ đạt ngưỡng 100 → sinh trang bị có `item.level = tower.level`
→ Trang bị được tự động mặc / tự động phân giải / vào túi
→ **Power** tăng → Khai Đỉnh mạnh hơn (Đỉnh EXP mỗi hành động tăng theo Power)
→ lặp lại.

Vòng phản hồi bắt buộc phải được kiểm soát bằng soft cap (§16) — xem §31 vì sao.

## 3. HỆ THỐNG
### 3.1 Vạn Đạo Tiên Đỉnh
- Có Level, EXP, Tiến độ Loot, tổng số lần Khai Đỉnh (§5).
- Sinh trang bị 6 phẩm chất (§7) đúng theo Level hiện tại của Đỉnh.
### 3.2 Linh Thú Tiên Uyển (phong ấn trong MVP)
- Tab hiển thị thông báo "đang phong ấn" + bảng Codex phẩm chất (§7.2).
- Chưa có cơ chế ấp trứng/huyết mạch. Không được mở khóa trong MVP nếu chưa khóa lại tài liệu.

## 4. NHÂN VẬT & CẢNH GIỚI
- Nhân vật có Level, Tu Vi (cultivationExp), Cảnh Giới + Tầng, Power, Cống Hiến, túi đồ, nguyên liệu.
- 6 cảnh giới, mỗi cảnh giới 10 tầng (Luyện Hư mở rộng vô hạn):

| idx | Cảnh giới | Level | ATK nền | HP nền | DEF nền |
|-----|-----------|-------|---------|--------|---------|
| 0 | Luyện Khí | 1–10 | 15 | 120 | 8 |
| 1 | Trúc Cơ | 11–20 | 45 | 380 | 24 |
| 2 | Kim Đan | 21–30 | 120 | 1.100 | 65 |
| 3 | Nguyên Anh | 31–40 | 320 | 3.200 | 180 |
| 4 | Hóa Thần | 41–50 | 850 | 9.000 | 480 |
| 5 | Luyện Hư | 51+ | 2.200 | 25.000 | 1.250 |

- `layer = level − realmIndex × 10`; `fullName = "<Cảnh giới> • Tầng <layer>"`.
- EXP lên cấp: `expToNext(L) = floor(100 × L^1.32)` (§20).

## 5. ĐỈNH: CẤP, EXP, TIẾN ĐỘ
- EXP lên cấp Đỉnh: `expToNext(L) = floor(1000 × L^1.35)`.
- `lootThreshold = 100` (cố định), `lootProgress` khởi đầu = **80** (tân thủ nhận trang bị đầu tiên nhanh).
- `totalCultivations`: tổng số lần Khai Đỉnh — dùng cho bộ đếm burst của hiệu ứng Tiên Phẩm (§10).
- Lên cấp Đỉnh không đổi lootThreshold; loot dư được giữ nguyên (while-loop xử lý nhiều ngưỡng/lần).

## 6. MÔ HÌNH HÀNH ĐỘNG KHAI ĐỈNH
- 1 hành động = 1 lần Khai Đỉnh; mỗi hành động thực hiện tuần tự: §18 (Đỉnh EXP) → §20 (Tu Luyện EXP) → §19 (tiến độ loot) → kiểm tra sinh loot (§7.1).
- **Thủ công**: bấm nút "KHAI ĐỈNH" = đúng 1 hành động (có rung/pulse + âm thanh).
- **Tự động**: tick trung tâm mỗi 1 giây gọi `floor(rate)` hành động (§30); mặc định BẬT khi tạo save mới.
- Tốc độ tu luyện `rate` (hành động/giây): nền 5.0 + cộng thêm từ trang bị/phụ dòng, có soft cap (§16) → **tối đa ~40/s**.

## 7. LOOT & PHẨM CHẤT
### 7.1 Quy tắc sinh trang bị (BẤT BIẾN)
- **`item.level = tower.level` tại đúng thời điểm sinh vật phẩm** (sau khi cộng Đỉnh EXP của hành động đó).
- Mỗi lần sinh: roll phẩm chất (§7.3) → roll loại (6 loại, đều nhau) → roll chỉ số gốc (§8) → roll dòng phụ (§9) → roll hiệu ứng đặc biệt (§10) → tính `item.power` (§17 ghi chú).
- Tên: `<Tiền tố theo phẩm chất> <Tên gốc theo loại>` (ví dụ "Hàn Băng Phi Kiếm").

### 7.2 Codex phẩm chất

| Phẩm chất | Tên | Hệ số chỉ số | Số dòng phụ | Trọng số rơi |
|-----------|-----|--------------|-------------|--------------|
| Trắng | Phàm | ×1.00 | 0 | 60 |
| Xanh lá | Linh | ×1.25 | 1 | 25 |
| Xanh dương | Huyền | ×1.55 | 2 | 10 |
| Tím | Địa | ×2.00 | 3 | 4 |
| Cam | Thiên | ×2.70 | 4 | 0.9 |
| Đỏ | Tiên | ×3.80 | 5 | 0.1 |

### 7.3 Bảng tỷ lệ rơi
- Tổng trọng số = **100.0** → trọng số chính là % xác suất: 60% / 25% / 10% / 4% / 0.9% / 0.1%.
- Roll: `roll = U(0, tổng trọng số)` rồi trừ dần theo thứ tự Trắng → Đỏ.
- Kỳ vọng: ~1 trang bị mỗi 100 điểm tiến độ; Đỏ trung bình ~1/1000 trang bị.

## 8. TRANG BỊ: 6 Ô & CHỈ SỐ GỐC
- 6 ô: `weapon` (Thần Binh), `helmet` (Tiên Quan), `armor` (Đạo Bào), `boots` (Vân Hài), `ring` (Linh Giới), `artifact` (Pháp Bảo).
- Chỉ số gốc = `max(1, floor(basePower × weight × hệ_số_phẩm_chất × U(0.95, 1.05)))` với `basePower = floor(10 × L^1.35)`.

| Ô | Trọng số ATK | HP | DEF | Đặc biệt |
|---|--------------|----|-----|----------|
| Vũ khí | 1.4 | — | — | — |
| Mũ | — | 8.5 | 0.45 | — |
| Áo | — | 11.0 | 0.65 | — |
| Hài | — | — | 0.55 | Tốc độ xuất chiêu: `max(1, round((1.5 + 0.1L) × hệ số × U(0.95,1.05), 1))` |
| Nhẫn | 0.55 | — | — | Bạo kích: `max(1, round((2 + 0.15L) × hệ số × U(0.95,1.05), 1))` |
| Pháp Bảo | 0.65 | 5.5 | 0.35 | Tốc độ tu luyện: `max(0.2, round((0.4 + 0.05L) × hệ số × U(0.95,1.05), 1))` |

## 9. DÒNG PHỤ (AFFIXES)
- Số dòng phụ = theo phẩm chất (§7.2); chọn **không trùng loại** từ 9 loại dưới đây.
- Giá trị: `max(1, round((U(min,max) + min(L × scaling, max × 2.5) × 0.35) × (0.85 + hệ_số × 0.15), 1))` — làm tròn 1 chữ số thập phân.

| Loại | Nhãn | min–max | scaling theo L |
|------|------|---------|----------------|
| ATK_PERCENT | Công Kích % | 4–9 | 0.15 |
| HP_PERCENT | Sinh Lực % | 4–10 | 0.15 |
| DEF_PERCENT | Phòng Thủ % | 4–9 | 0.15 |
| CRIT_RATE | Bạo Kích % | 2–5 | 0.08 |
| CRIT_DAMAGE | Sát Thương Bạo % | 8–18 | 0.25 |
| ATTACK_SPEED | Tốc Độ Xuất Chiêu % | 3–7 | 0.10 |
| CULTIVATION_RATE | Tốc Độ Tu Luyện % | 4–10 | 0.12 |
| TOWER_EXP | Cống Hiến Đỉnh EXP % | 5–12 | 0.18 |
| LOOT_RATE | Cơ Duyên Bảo Vật % | 4–10 | 0.12 |

## 10. HIỆU ỨNG ĐẶC BIỆT
- Cam: 65% cơ hội có 1 hiệu ứng; Đỏ: 100% có 1 hiệu ứng.

| id | Tên | Hiệu ứng thực tế |
|----|-----|------------------|
| thien_kiem | Thiên Kiếm Cộng Minh | +10% Đỉnh EXP (towerExpBonus) |
| thien_dao_linh | Thiên Đạo Tụ Linh | +12% Tu Luyện EXP mỗi hành động |
| tien_dao_burst | Tiên Đạo Quán Đỉnh | Mỗi hành động thứ 10 (theo totalCultivations) → Đỉnh EXP ×2.5 |
| van_dao_tao_hoa | Vạn Đạo Tạo Hóa | +20% Đỉnh EXP; +25 lootRate; +1 điểm tiến độ loot mỗi hành động |

## 11. LUỒNG NHẬN TRANG BỊ (ACQUISITION PIPELINE)
Khi sinh 1 trang bị mới:
1. Nếu `autoEquip` BẬT và trang bị mới làm **tổng Power tăng** (§12) → mặc vào; trang bị cũ bị đẩy ra → xử lý theo nhánh 2.
2. Trang bị bị đẩy ra: nếu auto-dismantle hợp lệ (§14) → phân giải; nếu túi còn chỗ → vào túi; nếu túi đầy → phân giải (trừ Tiên Phẩm — xử theo nhánh 6).
3. Nếu không auto-equip: nếu auto-dismantle hợp lệ → phân giải.
4. Nếu túi còn chỗ → thêm vào túi (đầu danh sách).
5. Nếu túi đầy (100) và `autoDismantle` BẬT → phân giải trang bị mới (trừ Tiên Phẩm). Nếu không → trang bị mới rơi mất (trừ Tiên Phẩm — xử theo nhánh 6).
6. **Rule 14b (v1.2) — Tiên Phẩm bất diệt**: trang bị Đỏ (mới rơi hoặc bị đẩy ra) **không bao giờ rơi mất**. Nếu túi đầy: đẩy món yếu nhất KHÔNG phải Đỏ ra (ưu tiên phẩm chất thấp, cùng phẩm chất thì `item.power` thấp hơn), phân giải nó (§15) để lấy chỗ rồi thêm Đỏ vào. Nhánh không thể chạm tới: túi đầy 100 Tiên Phẩm.

## 12. AUTO EQUIP (v1.1 — dùng Power thật)
- Điều kiện: `settings.autoEquip` BẬT **và** (`ô đang trống` **hoặc** `Power(tổng) sau khi thay > Power(tổng) hiện tại`).
- KHÔNG dùng `item.power` để so sánh (hai thang đo khác nhau — xem Phụ lục B).
- Hệ quả bất biến: **auto-equip không bao giờ làm tổng Power giảm** (được kiểm tra bởi `npm run sim`).

## 13. TÚI ĐỒ & PHÂN GIẢI THỦ CÔNG
- Sức chứa tối đa: **100** trang bị.
- Mặc từ túi: trang bị đang mặc trong ô đó (nếu có) hoán đổi về túi.
- Tháo trang bị: chỉ khi túi còn chỗ (nếu đầy → chặn kèm toast).
- Phân giải 1 món: nhận nguyên liệu (§15), xóa khỏi túi.
- Nút "Phân Giải ≤ Huyền": phân giải mọi trang bị trong túi có phẩm chất ≤ Huyền (trừ Tiên Phẩm).

## 14. AUTO DISMANTLE & TIÊN PHẨM BẤT DIỆT
- Điều kiện hợp lệ: `settings.autoDismantle` BẬT **và** phẩm chất ≤ `settings.autoDismantleMaxRarity` (mặc định: Linh) **và** không phải Đỏ.
- **Tiên Phẩm (Đỏ) KHÔNG BAO GIỜ bị phân giải tự động / rơi mất** (kể cả khi túi đầy — §11.6) — luật bất biến.

## 15. NGUYÊN LIỆU PHÂN GIẢI
- `levelFactor = max(1, floor(1 + item.level × 0.15))`; thưởng = `base[phẩm chất] × levelFactor`.

| Phẩm chất | Linh Thiết | Linh Thạch | Huyền Tinh | Tiên Ngọc |
|-----------|------------|------------|------------|-----------|
| Trắng | 2 | 0 | 0 | 0 |
| Linh | 3 | 2 | 0 | 0 |
| Huyền | 0 | 5 | 2 | 0 |
| Địa | 0 | 12 | 4 | 1 |
| Thiên | 0 | 30 | 8 | 4 |
| Tiên | 0 | 80 | 20 | 12 |

- Nguyên liệu hiện là tài nguyên tích lũy cho tương lai (chưa có chế tạo/nâng cấp trong MVP).

## 16. TỔNG HỢP CHỈ SỐ NHÂN VẬT (STATS)
Nền theo cấp/cảnh giới:
- `atk = realm.atk + L×8 + layer×4` · `hp = realm.hp + L×65 + layer×25` · `def = realm.def + L×5 + layer×2`
- `critRate = 5` · `critDamage = 150` · `attackSpeed = 1.0` (hệ số nhân tốc đánh hiển thị)

Cộng từ trang bị (mỗi ô):
- ATK/HP/DEF gốc cộng thẳng; bạo kích gốc cộng thẳng.
- `attackSpeed += item.attackSpeed × 0.05`; `cultivationRate += item.cultivationRate`.
- Dòng phụ: % ATK/HP/DEF cộng dồn vào % tương ứng; CRIT_RATE/CRIT_DAMAGE cộng thẳng; ATTACK_SPEED `× 0.02`; CULTIVATION_RATE cộng vào % tu luyện; TOWER_EXP cộng vào towerExpBonus; LOOT_RATE cộng vào lootRate.

Chốt giá trị:
- `atk = floor(base × (1 + %ATK/100))`, tương tự cho HP/DEF.
- **Soft cap** (hàm `softcap(x, c) = c·x/(x+c)`, tiệm cận trần c):
  - `cultivationRate = round((5 + softcap(Σ item.cultRate, 15)) × (1 + softcap(Σ %tu luyện, 100)/100), 1)` → tối đa ~40 hành động/giây.
  - `towerExpBonus = round(softcap(Σ %cống hiến + hiệu ứng, 150), 1)` → tối đa ~+150%.
  - `lootRate = round(softcap(Σ %cơ duyên + hiệu ứng, 100), 1)` → tối đa ~+100%.

## 17. CÔNG THỨC CHIẾN LỰC (POWER)
```
Power = floor(atk + hp/10 + def×2 + critRate×100 + attackSpeed×50 + Σ item.power)
```
Ghi chú `item.power` (chỉ số hiển thị của trang bị):
```
baseTotal = atk×1.2 + hp/8 + def×2 + critRate×35 + attackSpeed×40 + cultivationRate×45
affixMult = 1 + Σ(value/100 × 0.85)
item.power = max(10, floor((baseTotal × affixMult + hệ_số × L × 2) × specialBonus))
specialBonus: Đỏ 1.18 · Cam 1.08 · còn lại 1.0
```
⚠ `item.power` dùng trọng số khác Power nhân vật — chỉ là điểm hiển thị của trang bị; mọi quyết định gameplay dùng Power thật (§12). Từ v1.2, UI (ItemCard/ItemDetail) hiển thị delta "+Chiến Lực" bằng **Power thật** qua `getPowerDeltaIfEquipped` — khớp đúng mức tăng khi trang bị.

## 18. CỐNG HIẾN ĐỈNH (ĐỈNH EXP MỖI HÀNH ĐỘNG)
```
baseContribution = 10 + floor(power^0.6 / 45)          // v1.1: tăng dưới tuyến tính theo Power
towerExpGain = max(10, floor(baseContribution × (1 + 0.12 × log10(1 + power)) × (1 + towerExpBonus/100)))
Nếu burst (tien_dao_burst, mỗi hành động thứ 10): towerExpGain = floor(towerExpGain × 2.5)
```
- Sau đó: `tower.currentExp += towerExpGain` (lên cấp theo §5) và `player.contribution += towerExpGain`.
- Hằng số điều chỉnh: `TOWER_CONTRIBUTION_BASE=10`, `..._POWER_EXPONENT=0.6`, `..._POWER_DIVISOR=45` (trong `src/systems/cultivation.ts`).

## 19. TIẾN ĐỘ LOOT MỖI HÀNH ĐỘNG
```
lootProgressGain = 1 + lootRate/100        // + 1 nếu có hiệu ứng van_dao_tao_hoa
lootProgress = round2(lootProgress + lootProgressGain)
while (lootProgress >= 100): lootProgress -= 100; sinh 1 trang bị (§7.1)
```

## 20. EXP NHÂN VẬT & LÊN CẤP
```
playerExpGain = 6 + floor(level^0.75 × 1.8) + floor(power^0.6 / 30)     // v1.1
Nếu có hiệu ứng thien_dao_linh: playerExpGain = floor(playerExpGain × 1.12)
cultivationExp += playerExpGain; lên cấp khi đủ expToNext(L) = floor(100 × L^1.32)
```
- Lên cấp → tính lại toàn bộ stats/Power (§16–§17).

## 21. TIẾN TRÌNH OFFLINE (BẾ QUAN) — v1.1
- Điều kiện kích hoạt: `player.autoCultivation` BẬT và rời game ≥ **15 giây**.
- Thời gian tính thưởng: `min(8 giờ, thời gian rời thực tế)`.
- Mô phỏng **từng tick 1 giây** giống vòng lặp online (§30): mỗi tick dùng `cultivationRate` hiện hành (có thể đổi giữa chừng do auto-equip) — nhờ vậy offline khớp tuyệt đối với chạy online.
  - **Mô phỏng CHÍNH XÁC toàn bộ hành động** (tối đa 1.200.000 — phủ trọn 8 giờ ở tốc độ tối đa ~40/s): đủ loot, auto-equip, auto-dismantle, nguyên liệu.
  - Nếu vượt trần (không thể xảy ra với cấu hình hiện tại): ngoại suy EXP + tiến độ loot theo tốc độ cuối (không sinh thêm vật phẩm).
- Kết quả trả về: `itemsGenerated` = 40 món tiêu biểu (UI hiển thị 8) + `itemsGeneratedTotal` = tổng số thực nhận.
- Bất biến: offline cho kết quả **giống hệt** chạy online cùng số hành động (được kiểm tra bằng seed RNG cố định trong `npm run sim`).

## 22. LƯU TRỮ
- Key: `vandao_tien_dinh_save_v1`; cấu trúc `SaveDataV1 { version: 1, player, tower, settings, lastSavedAt }`.
- Tự lưu debounce 500ms mỗi khi state đổi; lưu ngay khi ẩn tab/đóng trang.
- Khi nạp: tính lại `stats`/`power` bằng công thức hiện hành (chống lệch do đổi cân bằng).
- Chưa có migration; save sai version/thiếu trường → bỏ qua và tạo mới.

## 23. CÀI ĐẶT (SETTINGS)
| Khóa | Mặc định | Ý nghĩa |
|------|----------|---------|
| autoEquip | true | Tự mặc trang bị làm tăng Power thật (§12) |
| autoDismantle | true | Tự phân giải trang bị yếu (§14) |
| autoDismantleMaxRarity | 'green' | Ngưỡng phẩm chất tối đa được tự phân giải |
| soundEnabled | true | Âm thanh (§25) |

## 24. DEBUG TOOLS (CHỈ DEV)
- Panel chỉ hiển thị khi `import.meta.env.DEV`.
- Chức năng: +1000 Đỉnh EXP · +10000 Tu Luyện EXP · Set Level Đỉnh · Sinh trang bị theo từng phẩm chất · Bật/tắt tự động · Giả lập offline 1 giờ · Xóa túi · Reset save.

## 25. ÂM THANH
- WebAudio oscillator thuần (không dùng file): chime khi Khai Đỉnh thủ công, hợp âm khi rơi loot (biến thể khi phẩm chất ≥ Địa), fanfare khi lên cấp.
- Tôn trọng `settings.soundEnabled`; lỗi autoplay bị bỏ qua an toàn.

## 26. GIAO DIỆN & PHẢN HỒI
- 4 tab: Đỉnh (Home) · Nhân vật · Túi đồ · Linh Thú (placeholder).
- Màn Đỉnh: Tiêu đề + thanh Đỉnh EXP, sân khấu Đỉnh (tap để Khai Đỉnh), dải 6 ô trang bị, thanh tiến độ loot + nút KHAI ĐỈNH + nút Tự Động.
- Số nổi (floating) khi Khai Đỉnh; hoạt ảnh trang bị bay từ Đỉnh về nhân vật; toast cho loot/trang bị/phân giải.
- Modal chi tiết trang bị (mặc/phân giải), modal Bế Quan (offline), bảng Debug (DEV).
- Định dạng số: <10.000 hiển thị đầy đủ, sau đó K/M/B.

## 27. KIẾN TRÚC MÃ NGUỒN
```
src/
  data/       # hằng số & bảng cấu hình: rarities, realms, equipment, affixes, lootTables
  types/      # kiểu dữ liệu: item, player, tower, game (save/settings/summary)
  systems/    # logic thuần (không React, không DOM):
              #   cultivation (vòng lặp hành động) · loot (sinh trang bị)
              #   progression (stats/power/level) · tower (cấp Đỉnh)
              #   equipment (túi/phân giải) · offline (bế quan)
  stores/     # gameStore.tsx: state + tick + actions; các store facade nhỏ (player/tower/inventory/settings)
  components/ # UI theo nhóm layout/player/tower/inventory/equipment/common
  views/      # 4 màn hình theo tab
  utils/      # number (format), random, storage, sound
scripts/
  simulate.ts # harness mô phỏng headless (npm run sim) — §29
```
- Nguyên tắc: mọi công thức nằm trong `systems/` (hàm thuần, dễ test/mô phỏng); UI không chứa công thức.
- Store (v1.2): mọi thay đổi state đi qua `commit*` đồng bộ trên `stateRef` — updater thuần, side effect (toast/âm thanh) đặt ngoài; loại bỏ race giữa snapshot và `setState`.

## 28. HIỆU NĂNG & GIỚI HẠN CÓ CHỦ ĐÍCH
- Tốc độ tu luyện bị soft cap ~40 hành động/giây → tick 1s xử lý tối đa ~40 hành động + ~0.6 trang bị/giây: an toàn cho trình duyệt.
- Offline mô phỏng tối đa ~1.15M hành động khi mở game (đo ~0.5 giây trên Node) — chỉ cân nhắc Web Worker nếu thực tế thấy giật trên máy yếu.
- Danh sách trang bị trả về UI bị cắt còn 40 để tránh DOM/memory phình.

## 29. KIỂM THỬ & BẤT BIẾN (`npm run sim`)
- Lệnh: `npm run sim` (đầy đủ) hoặc `npm run sim -- --quick`; tùy chọn `--hours`, `--actions`, `--rolls`, `--samples`.
- Kiểm tra tự động:
  1. Bất biến vòng lặp: `item.level = tower.level` · lootProgress ∈ [0,100) · **Power không bao giờ giảm sau auto-equip** · túi ≤ 100 · **Tiên Phẩm không rơi mất** · stats/power khớp recalc.
  2. Phân bố phẩm chất 200.000 roll khớp trọng số (dung sai 3σ).
  3. Auto-equip đúng quy tắc Power thật (so khớp từng quyết định).
  4. UI delta Chiến Lực (`getPowerDeltaIfEquipped`) khớp engine + Rule 14b (loot Đỏ / trang bị Đỏ bị đẩy ra khi túi đầy).
  5. Offline khớp tuyệt đối với mô phỏng trực tiếp (seed RNG cố định): 60s · 1h · 8h ở tốc độ tối đa.
  6. Save v1: sanitize dữ liệu hỏng (NaN/thiếu trường/sai kiểu) — không reset oan save hợp lệ.
  7. In bảng công thức + tiến trình 24h (mốc thời gian Lv, loot/giờ) để soi cân bằng.
- Trạng thái hiện tại: **PASS toàn bộ**.

## 30. VÒNG LẶP TICK TRUNG TÂM
- Một `setInterval(1000ms)` duy nhất trong `gameStore`:
  - Dọn hiệu ứng: số nổi < 950ms, loot bay < 1050ms, toast quá 2600ms (tối đa 3 toast).
  - Nếu `autoCultivation`: `batch = floor(fractional + rate)`; chạy batch như hành động tự động (không âm thanh/pulse).
- Không có vòng lặp nào khác được phép tự chạy nền (tránh trùng lặp tiến trình).

## 31. KHÓA TÀI LIỆU, QUY TRÌNH THAY ĐỔI & LỘ TRÌNH
- **Quy trình thay đổi**: mọi thay đổi luật/công thức/hằng số phải (1) sửa tài liệu này + changelog, (2) chạy `npm run sim`, (3) chạy `npm run lint` + `npm run build` trước khi kết thúc việc.
- Các hằng số cân bằng tập trung ở đầu file hệ thống tương ứng (ví dụ `TOWER_CONTRIBUTION_*` trong `cultivation.ts`) để tinh chỉnh nhanh.
- Lộ trình 5 giai đoạn của chủ dự án:
  1. ✅ **Khóa GAME_DESIGN.md** (bản này).
  2. ✅ **Test vòng lặp chính** — đã dựng `npm run sim`; phát hiện & sửa 2 lỗi: auto-equip so sai thang Power; offline thiếu loot trầm trọng.
  3. ◐ **Cân bằng Lv/rarity** — đợt 1 (v1.1) đã chặn bùng nổ: §16 soft caps, §18/§20 tăng dưới tuyến tính, §21 offline chính xác. Knob tinh chỉnh: `TOWER_CONTRIBUTION_POWER_EXPONENT` (0.6 → 0.5 để chậm hơn), `..._DIVISOR`, các soft cap. Số liệu tham chiếu: Phụ lục A.
  4. ◐ **Tối ưu code/UI** — v1.2 (TASK 002B) đã dọn xong Phụ lục B: store thuần/commit đồng bộ, UI delta Power thật, Tầng Luyện Hư, Rule 14b, mã chết/dependency. Còn lại: chỉ cân nhắc Web Worker offline (§28) nếu thấy giật.
  5. ⏳ **Multiplayer** — xem §32.
- **Changelog**:
  - `v1.0` — Hợp nhất toàn bộ luật/công thức đang chạy vào một tài liệu khóa; chuẩn hóa số mục khớp comment `Section N`.
  - `v1.1` — Cân bằng đợt 1 + sửa lỗi vòng lặp: (a) auto-equip dùng Power thật; (b) Đỉnh EXP tăng `power^0.6`; (c) Tu Luyện EXP tăng `power^0.6` + yếu tố cấp `L^0.75`; (d) soft cap tốc độ tu luyện/%cống hiến/%loot; (e) offline mô phỏng chính xác thay vì lấy mẫu 600 bước.
  - `v1.2` — Giai đoạn 4 (Tối ưu code/UI) + TASK 002B: (a) store commit đồng bộ trên `stateRef`, updater thuần, hết side effect trong updater (equip/unequip/dismantle) và race đếm phân giải hàng loạt; (b) **Rule 14b** — Tiên Phẩm không rơi mất khi túi đầy (§11.6); (c) UI delta "+Chiến Lực" = Power thật; (d) sửa hiển thị Tầng ở Luyện Hư (bỏ "/ 10"); (e) dọn mã chết/dependency AI Studio, hết cảnh báo Vite `__dirname`; (f) toast sống đúng 2600ms theo §30 (bỏ bộ lọc tick dọn quá sớm); (g) đồng bộ tài liệu §21/§29, thêm test sim 3b/3c.

## 32. MULTIPLAYER (DEFERRED — NGOÀI PHẠM VI MVP)
- Chỉ triển khai sau khi xong Giai đoạn 4; không được đụng vào cấu trúc save v1 nếu chưa có migration.
- Định hướng khi mở lại: so sánh Power/bảng xếp hạng bất đồng bộ trước (rủi ro thấp), đấu trường thời gian thực sau.
- Mọi cơ chế multiplayer phải không phá vỡ các bất biến §7.1, §12, §14.

---

## Phụ lục A — BASELINE SỐ LIỆU (đo lại bằng `npm run sim`, v1.2 — 2026-09-28)
Bối cảnh: save mới, auto-cultivate liên tục, auto-equip + auto-dismantle (≤ Linh).

**Mốc tiến trình (1 trong các lần chạy, dao động theo RNG):**

| Mốc | Thời gian |
|------|-----------|
| Đỉnh Lv.10 | ~13 phút 17 giây |
| Đỉnh Lv.20 | ~41 phút |
| Đỉnh Lv.30 | ~1 giờ 12 phút |
| Đỉnh Lv.50 | ~2 giờ 10 phút |
| Đỉnh Lv.75 | ~3 giờ 42 phút |
| Đỉnh Lv.100 | ~5 giờ 21 phút |

**Sau 24 giờ auto:** Đỉnh Lv.450 · Nhân vật Lv.1.329 · Power ~5,28 triệu · 32.525 trang bị · tốc độ 25,5 hành động/giây · loot rate +67,7% · Đỉnh bonus +92,1% · túi 100/100 · Tiên Phẩm 32/32 giữ nguyên (Rule 14b).
(Nhịp độ sau giờ thứ 5: ổn định ~20–25 cấp Đỉnh/giờ; không còn bùng nổ.)

**Phân bố phẩm chất 200.000 roll:** khớp cấu hình trong dung sai 3σ (xem output `npm run sim`).

**So sánh trước/sau khi cân bằng v1.1** (cùng 1M hành động đầu):
- Trước: Đỉnh Lv.7.937 · Nhân vật Lv.9.596 · tốc độ 2.330 hành động/giây (mất kiểm soát).
- Sau: Đỉnh Lv.~340–380 · Nhân vật Lv.~1.000 · tốc độ ~20–24 hành động/giây (ổn định).

## Phụ lục B — TỒN ĐỌNG KỸ THUẬT (đã dọn ở Giai đoạn 4 — v1.2, 2026-09-28)
1. ✅ `item.power` vs Power thật: ItemCard/ItemDetail hiển thị delta bằng Power thật (`getPowerDeltaIfEquipped`); `item.power` giữ vai trò điểm hiển thị (§17). Test sim 3b.
2. ✅ Tầng cảnh giới > 10: Luyện Hư hiển thị "Tầng X" (bỏ "/ 10" — `layerCap = null`).
3. ✅ Túi đầy + Tiên Phẩm: Rule 14b (§11.6) — Đỏ không bao giờ rơi mất. Test sim 3c.
4. ✅ Updater thuần (TASK 002B): toast/side effect ra khỏi updater; mọi mutation qua `commit*` đồng bộ; `dismantleBulkByRarity` trả về đúng số đã áp dụng.
5. ✅ Mã chết: `AFFIX_CONFIGS.powerWeight`, `randomInt()`, tham số `isFloatStat` — đã xóa.
6. ✅ Dependency AI Studio: gỡ `@google/genai`, `express`, `dotenv`, `@types/express`, `.env.example`; package đổi tên `vandao-tien-dinh`.
7. ✅ `vite.config.ts`: dùng `import.meta.dirname` (hết cảnh báo Vite 8); script `clean` chạy được trên Windows.
8. ✅ `metadata.json`: bỏ khai báo Gemini API.

**Còn lại (không chặn)**: Web Worker cho mô phỏng offline — chỉ làm nếu thực tế thấy giật khi mở game (§28).
