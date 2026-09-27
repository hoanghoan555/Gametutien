# VẠN ĐẠO TIÊN ĐỈNH — GAME DESIGN & CODING AGENT SPEC

> **Tài liệu nguồn sự thật (Single Source of Truth) cho coding agent.**
>
> Phiên bản: 0.1 MVP
> Platform: HTML5 Browser
> Orientation: Portrait 9:16
> Persistence MVP: localStorage (`vandao_tien_dinh_save_v1`)
> Ngôn ngữ UI: Tiếng Việt

## 1. TẦM NHÌN GAME
- Game idle/incremental tu tiên trên trình duyệt.
- Người chơi sở hữu một nhân vật tu tiên và phát triển **Vạn Đạo Tiên Đỉnh**.
- Đỉnh KHÔNG phải boss, KHÔNG có HP, KHÔNG chết, KHÔNG bị phá.
- Đỉnh là cổ vật tu tiên có **Level + EXP**.
- **Level Đỉnh quyết định Level của trang bị được sinh ra** (`item.level = tower.level`).
- 6 phẩm chất (Rarity): Trắng (Phàm), Xanh lá (Linh), Xanh dương (Huyền), Tím (Địa), Cam (Thiên), Đỏ (Tiên).

## 2. CORE GAME LOOP
Người chơi khai Đỉnh → Nhận Tu Luyện EXP + Đóng góp Đỉnh EXP → Tăng tiến độ sinh loot → Đủ tiến độ sinh item → Item bay từ Đỉnh về nhân vật → Thêm vào Inventory / Auto Equip nếu Power cao hơn → Power tăng → Khai Đỉnh mạnh hơn → Đỉnh tăng level → Item level cao hơn.
