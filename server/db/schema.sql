-- ============================================================================
-- Vạn Đạo Tiên Đỉnh — Postgres schema (P5.1, theo MULTIPLAYER_DESIGN §8.1 + D5)
--
-- TRẠNG THÁI: P5.1 khoá thiết kế — CHƯA chạy trên PG thật (môi trường dev chưa có DB).
-- Adapter Postgres + integration test thuộc P5.2 (khi provision DB). Không tự thêm cột
-- ngoài phạm vi tài liệu đã duyệt.
--
-- TRANSACTION RECIPE cho POST /actions/cultivate (bắt buộc đúng thứ tự):
--
--   BEGIN;
--     -- 1) Idempotency barrier: PK (user_id, seq). 0 row ⇒ đã xử lý ⇒ đọc ack_json cũ, COMMIT sớm.
--     INSERT INTO action_log (user_id, seq, n, tower_exp, player_exp, loot_count, balance_version, ack_json)
--     VALUES ($1, $2, $3, ...) ON CONFLICT (user_id, seq) DO NOTHING;
--     -- 2) Khóa duy nhất cho Global Tower — serialize mọi writer (beta 1 Đỉnh).
--     SELECT * FROM towers WHERE id = 'global' FOR UPDATE;
--     -- 3) Đọc players + settings, chạy shared authority (HMAC RNG), ghi players/towers/contributions/items.
--     -- 4) COMMIT — không merge phía client, không lost update.
--   COMMIT;
--
-- Offline claim (P5.4) dùng CÙNG transaction trên + cập nhật players.last_grant_at/fractional_actions.
-- ============================================================================

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  auth_provider TEXT NOT NULL DEFAULT 'guest',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE guest_devices (
  device_id  TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
  user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level                   INTEGER NOT NULL DEFAULT 1,
  cultivation_exp         BIGINT NOT NULL DEFAULT 0,
  cultivation_exp_to_next BIGINT NOT NULL,
  power_cache             BIGINT NOT NULL DEFAULT 0,       -- chỉ để đọc nhanh; LUÔN recalc khi ghi
  stats_json              JSONB NOT NULL,
  contribution_total      BIGINT NOT NULL DEFAULT 0,
  auto_cultivation        BOOLEAN NOT NULL DEFAULT true,   -- D4: điều kiện chạy offline
  last_grant_at           TIMESTAMPTZ,
  fractional_actions      DOUBLE PRECISION NOT NULL DEFAULT 0,
  cultivations            BIGINT NOT NULL DEFAULT 0,       -- I2: bộ đếm hành động cá nhân (burst index + seq seed)
  loot_progress           DOUBLE PRECISION NOT NULL DEFAULT 80,   -- D5: per-user (không thuộc towers)
  loot_threshold          DOUBLE PRECISION NOT NULL DEFAULT 100,  -- D5: per-user
  balance_version         TEXT NOT NULL,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id                  TEXT PRIMARY KEY,                    -- server tất định: item_<userId>_<seq>_<k>
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL,
  level               INTEGER NOT NULL,
  rarity              TEXT NOT NULL,
  power               BIGINT NOT NULL,
  base_stats_json     JSONB NOT NULL,
  affixes_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  special_effect_json JSONB,
  equipped_slot       TEXT,                                -- NULL = nằm trong túi
  source_seq          BIGINT,                              -- truy về action_log (audit/replay)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX items_user_idx ON items (user_id);
CREATE INDEX items_equipped_idx ON items (user_id, equipped_slot) WHERE equipped_slot IS NOT NULL;

CREATE TABLE materials (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  basic      BIGINT NOT NULL DEFAULT 0,
  linh_stone BIGINT NOT NULL DEFAULT 0,
  advanced   BIGINT NOT NULL DEFAULT 0,
  rare       BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE towers (
  id                 TEXT PRIMARY KEY,                     -- 'global' cho closed beta (D2)
  season_id          TEXT NOT NULL DEFAULT 'beta',
  level              INTEGER NOT NULL DEFAULT 1,
  current_exp        BIGINT NOT NULL DEFAULT 0,
  exp_to_next        BIGINT NOT NULL,
  total_cultivations BIGINT NOT NULL DEFAULT 0,
  version            BIGINT NOT NULL DEFAULT 0,            -- tăng mỗi transaction ghi — đối soát cache/broadcast
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contributions (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tower_id   TEXT NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
  total_exp  BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tower_id)
);

-- Append-only, phục vụ BXH tuần (D10); có thể sample khi CCU cao.
CREATE TABLE contribution_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tower_id   TEXT NOT NULL,
  exp        BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX contribution_events_tower_time_idx ON contribution_events (tower_id, created_at);
CREATE INDEX contribution_events_user_time_idx ON contribution_events (user_id, created_at);

-- Idempotency anchor (gate 5): UNIQUE (user_id, seq). Retention 30 ngày (D12) —
-- aggregate trước khi purge; purge chỉ chạy với created_at < now() - interval '30 days'.
CREATE TABLE action_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seq             BIGINT NOT NULL,
  n               INTEGER NOT NULL,
  tower_exp       BIGINT NOT NULL,
  player_exp      BIGINT NOT NULL,
  loot_count      INTEGER NOT NULL,
  balance_version TEXT NOT NULL,
  ack_json        JSONB NOT NULL,                          -- ack đã trả — replay trả lại đúng bản này
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, seq)
);

CREATE INDEX action_log_created_idx ON action_log (created_at);

CREATE TABLE settings (
  user_id                   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_equip                BOOLEAN NOT NULL DEFAULT true,
  auto_dismantle            BOOLEAN NOT NULL DEFAULT true,
  auto_dismantle_max_rarity TEXT NOT NULL DEFAULT 'green'
  -- soundEnabled giữ ở client
);

-- D6: migration save v1 chỉ mở ở P5.4 với policy riêng (1 lần/user + cờ beta).
-- Bảng đã khai báo chỗ trống — CHƯA dùng ở P5.1; chưa đặt trần Power (chờ chốt policy).
CREATE TABLE migrations (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  save_version INTEGER NOT NULL,
  content_hash TEXT NOT NULL
);

INSERT INTO towers (id, exp_to_next) VALUES ('global', 1000);
