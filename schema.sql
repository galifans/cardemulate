-- =====================================================================
--  CardEmulate · Cloudflare D1 表结构  (schema_version = 3)
-- =====================================================================
--
--  设计目标：将来会有多个站点（app）、多个品类（category）、多个发行商
--  （maker）、多个系列（product）、多个盒型（box），所以要提前把「维度」
--  与「事实」分开：
--
--    维度（参考数据，由前端 TS 目录同步过来）
--      apps -> categories -> makers -> products -> boxes -> subsets -> variants
--
--    事实（用户产生）
--      users -> sessions
--            -> breaks      一次拆盒一条，带维度冗余列，便于任意切片
--            -> pull_stats  同一用户同一盒型同一卡种的累计张数
--
--  为什么事实表要冗余 category_key / maker_key / product_key？
--    D1 单次查询最好别再 JOIN 一堆表，冗余列 + 索引可以让
--      「篮球出了多少张编号卡」「Panini 的盒出了多少张签名」
--    这类统计一条 SQL 搞定，且换站点/换品类都不用改表结构。
--
--  约定：
--    * box_key / variant_key 是「软引用」（不建外键），这样即使目录还没同步
--      也能先落库，不会因为缺一行参考数据而写不进去。
--    * app_key 默认 'cardemulate'。同一套 users 可登录所有站点，
--      但拆盒数据按 app_key 隔离。
--    * 全部语句幂等，可反复执行。
--
--  注意：本文件是全新的 v2 结构。若此前已用 v1 建过库且库内无数据，
--        直接 DROP TABLE 后重跑本文件即可（D1 对 ALTER 的支持有限）。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 元信息（记录 schema 版本，方便将来做增量迁移）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- 维度 1：站点
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS apps (
    key         TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    host        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    updated_at  TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- 维度 2：品类 <-> 站点
-- 同一品类可挂在多个站点下，所以主键是 (app_key, key)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    app_key    TEXT NOT NULL DEFAULT 'cardemulate',
    key        TEXT NOT NULL,
    name       TEXT NOT NULL,
    name_en    TEXT NOT NULL DEFAULT '',
    icon       TEXT NOT NULL DEFAULT '',
    tagline    TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    live       INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (app_key, key),
    FOREIGN KEY (app_key) REFERENCES apps(key) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 维度 3：发行商（Topps / Panini / ...）
-- makers 的 key 是全局的（topps），但在不同品类下可有不同状态
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS makers (
    app_key      TEXT NOT NULL DEFAULT 'cardemulate',
    category_key TEXT NOT NULL,
    key          TEXT NOT NULL,
    name         TEXT NOT NULL,
    name_en      TEXT NOT NULL DEFAULT '',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    live         INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (app_key, category_key, key),
    FOREIGN KEY (app_key, category_key) REFERENCES categories(app_key, key) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 维度 4：系列 / 产品
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    app_key      TEXT NOT NULL DEFAULT 'cardemulate',
    key          TEXT NOT NULL,
    category_key TEXT NOT NULL,
    maker_key    TEXT NOT NULL,
    name         TEXT NOT NULL,
    release_date TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    live         INTEGER NOT NULL DEFAULT 0,
    note         TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (app_key, key),
    FOREIGN KEY (app_key, category_key, maker_key)
        REFERENCES makers(app_key, category_key, key) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 维度 5：盒型
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boxes (
    app_key         TEXT NOT NULL DEFAULT 'cardemulate',
    key             TEXT NOT NULL,
    product_key     TEXT NOT NULL,
    category_key    TEXT NOT NULL,
    maker_key       TEXT NOT NULL,
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL,
    cards_per_pack  INTEGER NOT NULL DEFAULT 0,
    packs_per_box   INTEGER NOT NULL DEFAULT 0,
    boxes_per_case  INTEGER NOT NULL DEFAULT 0,
    auto_guaranteed INTEGER NOT NULL DEFAULT 0,
    live            INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    updated_at      TEXT NOT NULL,
    PRIMARY KEY (app_key, key),
    FOREIGN KEY (app_key, product_key) REFERENCES products(app_key, key) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 维度 6：子集
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subsets (
    app_key       TEXT NOT NULL DEFAULT 'cardemulate',
    box_key       TEXT NOT NULL,
    key           TEXT NOT NULL,
    name          TEXT NOT NULL,
    code          TEXT,
    kind          TEXT NOT NULL DEFAULT 'base',
    detailed      INTEGER NOT NULL DEFAULT 0,
    in_box        INTEGER NOT NULL DEFAULT 1,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    subject_count INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (app_key, box_key, key),
    FOREIGN KEY (app_key, box_key) REFERENCES boxes(app_key, key) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 维度 7：卡种 / 平行（含官方配率）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variants (
    app_key    TEXT NOT NULL DEFAULT 'cardemulate',
    box_key    TEXT NOT NULL,
    key        TEXT NOT NULL,
    subset_key TEXT NOT NULL,
    name       TEXT NOT NULL,
    full_name  TEXT NOT NULL,
    group_kind TEXT NOT NULL DEFAULT 'base',
    tier       TEXT NOT NULL DEFAULT 'common',
    odds       REAL NOT NULL DEFAULT 0,
    numbered   INTEGER,
    weight     REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (app_key, box_key, key),
    FOREIGN KEY (app_key, box_key, subset_key)
        REFERENCES subsets(app_key, box_key, key) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 用户（全局，一套账号可登录所有站点）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    iterations    INTEGER NOT NULL DEFAULT 100000,
    created_at    TEXT NOT NULL,
    last_seen_at  TEXT
);

-- ---------------------------------------------------------------------
-- 会话
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    user_agent TEXT
);

-- ---------------------------------------------------------------------
-- 事实 1：一次拆盒
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS breaks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    app_key      TEXT NOT NULL DEFAULT 'cardemulate',
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    box_key      TEXT NOT NULL,
    category_key TEXT NOT NULL DEFAULT '',
    maker_key    TEXT NOT NULL DEFAULT '',
    product_key  TEXT NOT NULL DEFAULT '',
    seed         TEXT NOT NULL DEFAULT '',
    card_count   INTEGER NOT NULL DEFAULT 0,
    by_tier      TEXT NOT NULL DEFAULT '{}',
    by_subset    TEXT NOT NULL DEFAULT '{}',
    best_variant TEXT,
    best_player  TEXT,
    best_tier    TEXT,
    best_odds    REAL,
    created_at   TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- 事实 2：个人累计卡牌统计（按 用户 x 盒型 x 卡种）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pull_stats (
    app_key      TEXT NOT NULL DEFAULT 'cardemulate',
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    box_key      TEXT NOT NULL,
    category_key TEXT NOT NULL DEFAULT '',
    maker_key    TEXT NOT NULL DEFAULT '',
    product_key  TEXT NOT NULL DEFAULT '',
    variant_key  TEXT NOT NULL,
    subset_key   TEXT,
    tier         TEXT,
    count        INTEGER NOT NULL DEFAULT 0,
    first_at     TEXT NOT NULL,
    last_at      TEXT NOT NULL,
    PRIMARY KEY (app_key, user_id, box_key, variant_key)
);

-- =====================================================================
--  索引
-- =====================================================================

-- 会话
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 维度：按层级下钻
CREATE INDEX IF NOT EXISTS idx_categories_app    ON categories(app_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_makers_category   ON makers(app_key, category_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(app_key, category_key, maker_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_boxes_category    ON boxes(app_key, category_key, maker_key, live);
CREATE INDEX IF NOT EXISTS idx_boxes_product     ON boxes(app_key, product_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_subsets_box       ON subsets(app_key, box_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_variants_subset   ON variants(app_key, box_key, subset_key);
CREATE INDEX IF NOT EXISTS idx_variants_tier     ON variants(app_key, box_key, tier);

-- 事实：任意维度切片 + 时间线
CREATE INDEX IF NOT EXISTS idx_breaks_user      ON breaks(app_key, user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_breaks_box       ON breaks(app_key, box_key);
CREATE INDEX IF NOT EXISTS idx_breaks_category  ON breaks(app_key, category_key);
CREATE INDEX IF NOT EXISTS idx_breaks_maker     ON breaks(app_key, maker_key);
CREATE INDEX IF NOT EXISTS idx_breaks_product   ON breaks(app_key, product_key);
CREATE INDEX IF NOT EXISTS idx_breaks_created   ON breaks(created_at);
CREATE INDEX IF NOT EXISTS idx_breaks_best_odds ON breaks(app_key, best_odds DESC);

CREATE INDEX IF NOT EXISTS idx_pull_stats_tier     ON pull_stats(app_key, tier);
CREATE INDEX IF NOT EXISTS idx_pull_stats_subset   ON pull_stats(app_key, subset_key);
CREATE INDEX IF NOT EXISTS idx_pull_stats_box      ON pull_stats(app_key, box_key);
CREATE INDEX IF NOT EXISTS idx_pull_stats_category ON pull_stats(app_key, category_key);
CREATE INDEX IF NOT EXISTS idx_pull_stats_maker    ON pull_stats(app_key, maker_key);

-- =====================================================================
--  元信息
-- =====================================================================
--  v3 起昵称不再由邮箱前缀一锤定音，登录后可以自己改（见 agent.md 6），
--  所以 display_name 必须全站唯一：唯一性判断一律走 lower(display_name)，
--  大小写不同的同名（Topps / topps）算同一个。
--  历史默认名是邮箱前缀，可能已经撞车，先把重复的改掉再建唯一索引，
--  否则 CREATE UNIQUE INDEX 会直接失败。这段重复执行也不会再改动任何行。
--  【重要】没有这个索引，接口仍然安全（唯一性由带 NOT EXISTS 的单条 UPDATE
--  保证），但缺少索引时并发开两个页面抢同一个昵称会多跑几次查询。
-- =====================================================================
UPDATE users
   SET display_name = display_name || '-' || substr(id, 1, 4)
 WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY lower(display_name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name ON users(lower(display_name));

INSERT INTO meta (key, value) VALUES ('schema_version', '3')
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');
