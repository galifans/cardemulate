/**
 * CardEmulate API —— Cloudflare Pages Functions
 * 路由全部挂在 /api/* 下（见 public/_routes.json）：
 *
 *   站点 / 目录
 *     GET  /api/config              站点元信息（app key、名称、域名）
 *     POST /api/catalog/sync        把前端 TS 目录镜像进 D1（需 CE_SYNC_TOKEN）
 *     GET  /api/catalog             从 D1 读回目录镜像（用于对账 / 外部工具）
 *
 *   账号
 *     POST /api/auth/register       注册（仅「邮箱 + 密码」，密码 6～32 位且不含空格）
 *     POST /api/auth/login          登录
 *     POST /api/auth/logout         退出
 *     GET  /api/me                  当前登录用户
 *
 *   拆盒与统计
 *     POST /api/break               记录一次拆盒（需登录）
 *     GET  /api/breaks              我的拆盒记录（需登录，分页）
 *     DELETE /api/break             清空我的拆盒记录（需登录；可按 category/maker/box 限定范围，
 *                                   不带条件才是清空全部）
 *     GET  /api/stats               我的统计（需登录，可按 category/maker/box 过滤）
 *     GET  /api/leaderboard         排行榜
 *     GET  /api/global              全站统计（可按 category/maker/box 过滤）
 *
 * 依赖 D1 绑定，变量名必须是 DB。
 * 可选环境变量：
 *   CE_APP         站点 key，默认 cardemulate
 *   CE_SYNC_TOKEN  目录同步令牌
 */

const SESSION_COOKIE = "ce_session";
const SESSION_TTL_DAYS = 30;
/**
 * 【重要】Cloudflare 的 WebCrypto 对 PBKDF2 有硬性上限：
 *   Pbkdf2 failed: iteration counts above 100000 are not supported
 * 超过 100000 会在运行期直接抛异常，导致注册/登录返回 500。
 * 本地 miniflare 不受此限制，所以这个坑只在线上暴露。
 * 100000 就是本站能用的最大值，不要调高。
 */
const PBKDF2_ITERATIONS = 100000;
/** 注册方式只有「邮箱 + 密码」一种，密码长度约束前后端保持同一套数字 */
// 账号密码采用常见站点的约束：邮箱 + 6～32 位且不含空格的密码
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 32;
const MAX_EMAIL_LENGTH = 100;
/** 单次上报的卡种上限，防止伪造超大 payload */
const MAX_VARIANTS_PER_BREAK = 600;
/** 批量写库时每条 SQL 拼多少行 */
const ROWS_PER_STATEMENT = 25;
/** 每次 db.batch() 最多提交多少条语句 */
const STATEMENTS_PER_BATCH = 40;
/** 拆盒记录分页上限 / 默认值 */
const MAX_BREAKS_PER_PAGE = 100;
const DEFAULT_BREAKS_PER_PAGE = 20;

const DEFAULT_APP = "cardemulate";

const json = (data, status = 200, extraHeaders = {}) =>
    new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...extraHeaders,
        },
    });

const fail = (message, status = 400) => json({ ok: false, error: message }, status);

/* ------------------------------------------------------------------ */
/* 基础工具                                                             */
/* ------------------------------------------------------------------ */

const toHex = (bytes) =>
    Array.from(new Uint8Array(bytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

const toBase64 = (bytes) => {
    let binary = "";
    const view = new Uint8Array(bytes);
    for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
    return btoa(binary);
};

const fromBase64 = (text) => {
    const binary = atob(text);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
};

const sha256Hex = async (text) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return toHex(digest);
};

const randomToken = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return toHex(bytes);
};

const hashPassword = async (password, saltText, iterations) => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: fromBase64(saltText), iterations, hash: "SHA-256" },
        key,
        256,
    );
    return toBase64(bits);
};

/** 常量时间字符串比较 */
const safeEqual = (a, b) => {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
};

const parseCookies = (request) => {
    const header = request.headers.get("Cookie") || "";
    const out = {};
    for (const part of header.split(";")) {
        const idx = part.indexOf("=");
        if (idx < 0) continue;
        out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
    return out;
};

const sessionCookie = (token, maxAgeSeconds) =>
    `${SESSION_COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

/** 校验密码是否符合常见约束，返回中文错误文案（通过则返回空字符串） */
const passwordProblem = (password) => {
    if (password.length < MIN_PASSWORD_LENGTH) return `密码至少 ${MIN_PASSWORD_LENGTH} 位`;
    if (password.length > MAX_PASSWORD_LENGTH) return `密码最多 ${MAX_PASSWORD_LENGTH} 位`;
    if (/\s/.test(password)) return "密码不能包含空格";
    return "";
};

/**
 * 维度 key 白名单：小写 slug，允许 . 与 :
 * 以容纳 app.category.maker.product.box；末尾的 - 是字面量（不是区间），
 * 所以形如 tcu26-basketball / value-box 的 key 都能通过。
 */
const isSafeKey = (value) =>
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[A-Za-z0-9._:-]+$/.test(value);

/** 维度 key，允许为空（老客户端可能不上报） */
const softKey = (value) => (isSafeKey(value) ? value : "");

const readJson = async (request) => {
    try {
        const body = await request.json();
        return body && typeof body === "object" ? body : null;
    } catch {
        return null;
    }
};

const appKeyOf = (env) =>
    typeof env?.CE_APP === "string" && env.CE_APP.length > 0 ? env.CE_APP : DEFAULT_APP;

/* ------------------------------------------------------------------ */
/* D1 访问                                                              */
/* ------------------------------------------------------------------ */

const requireDb = (env) => {
    if (!env || !env.DB) {
        throw new Error("D1 binding `DB` is missing");
    }
    return env.DB;
};

const currentUser = async (db, request) => {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (!token) return null;
    const tokenHash = await sha256Hex(token);
    const row = await db
        .prepare(
            `SELECT s.token_hash, s.expires_at, u.id, u.email, u.display_name, u.created_at
             FROM sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ?1`,
        )
        .bind(tokenHash)
        .first();
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
        await db.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
        return null;
    }
    return { id: row.id, email: row.email, displayName: row.display_name, createdAt: row.created_at };
};

const issueSession = async (db, userId) => {
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 86400000);
    await db
        .prepare(
            `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
             VALUES (?1, ?2, ?3, ?4)`,
        )
        .bind(tokenHash, userId, now.toISOString(), expires.toISOString())
        .run();
    return { token, maxAge: SESSION_TTL_DAYS * 86400 };
};

/* ------------------------------------------------------------------ */
/* 通用 SQL 拼装                                                        */
/* ------------------------------------------------------------------ */

/**
 * 把 [{column, value}] 里非空的值编译成 `AND col = ?n` 片段。
 * 这样「按品类 / 发行商 / 盒型切片」在任意查询里都能复用，不必为
 * 每个维度各写一套 SQL。
 */
const compileFilters = (filters, startIndex) => {
    const clauses = [];
    const binds = [];
    let index = startIndex;
    for (const [column, value] of filters) {
        if (!value) continue;
        clauses.push(`${column} = ?${index}`);
        binds.push(value);
        index += 1;
    }
    return { sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "", binds, next: index };
};

/**
 * 批量 upsert：把 rows 按 ROWS_PER_STATEMENT 行拼成一条多值 INSERT，
 * 冲突时更新非冲突列。避免 INSERT OR REPLACE —— 那会先删后插，
 * 触发外键 ON DELETE CASCADE 把子表数据一起删掉。
 */
const buildUpserts = (db, table, columns, conflictColumns, rows) => {
    const statements = [];
    const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
    for (let offset = 0; offset < rows.length; offset += ROWS_PER_STATEMENT) {
        const slice = rows.slice(offset, offset + ROWS_PER_STATEMENT);
        const binds = [];
        const tuples = [];
        let param = 1;
        for (const row of slice) {
            tuples.push(`(${columns.map(() => `?${param++}`).join(", ")})`);
            for (const column of columns) binds.push(row[column]);
        }
        const sql =
            `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")} ` +
            `ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ` +
            updateColumns.map((column) => `${column}=excluded.${column}`).join(", ");
        statements.push(db.prepare(sql).bind(...binds));
    }
    return statements;
};

/** 分片提交，避免单次 batch 语句过多 */
const runBatches = async (db, statements) => {
    for (let offset = 0; offset < statements.length; offset += STATEMENTS_PER_BATCH) {
        await db.batch(statements.slice(offset, offset + STATEMENTS_PER_BATCH));
    }
};

/* ------------------------------------------------------------------ */
/* 会话与账号                                                           */
/* ------------------------------------------------------------------ */

const handleRegister = async (request, env) => {
    const db = requireDb(env);
    const body = await readJson(request);
    if (!body) return fail("请求体格式不正确");

    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    // 注册只需要账号 + 密码，昵称不单独采集，直接取邮箱前缀做展示名
    const displayName = email.split("@")[0].slice(0, 24) || "收藏家";

    if (!email) return fail("请输入邮箱与密码");
    if (email.length > MAX_EMAIL_LENGTH) return fail("邮箱过长");
    if (!isEmail(email)) return fail("邮箱格式不正确");
    const problem = passwordProblem(password);
    if (problem) return fail(problem);

    const exists = await db.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
    if (exists) return fail("该邮箱已注册，请直接登录", 409);

    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = toBase64(saltBytes);
    const passwordHash = await hashPassword(password, salt, PBKDF2_ITERATIONS);
    const now = new Date().toISOString();

    const inserted = await db
        .prepare(
            `INSERT INTO users (email, display_name, password_hash, password_salt, iterations, created_at, last_seen_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
             RETURNING id, email, display_name, created_at`,
        )
        .bind(email, displayName, passwordHash, salt, PBKDF2_ITERATIONS, now)
        .first();

    if (!inserted) return fail("注册失败，请稍后再试", 500);

    const { token, maxAge } = await issueSession(db, inserted.id);
    return json(
        {
            ok: true,
            user: {
                id: inserted.id,
                email: inserted.email,
                displayName: inserted.display_name,
                createdAt: inserted.created_at,
            },
        },
        200,
        { "Set-Cookie": sessionCookie(token, maxAge) },
    );
};

const handleLogin = async (request, env) => {
    const db = requireDb(env);
    const body = await readJson(request);
    if (!body) return fail("请求体格式不正确");

    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return fail("请输入邮箱与密码");
    // 登录只限制上限，不能用长度下限去拒绝一个已注册的旧密码
    if (password.length > MAX_PASSWORD_LENGTH) return fail(`密码最多 ${MAX_PASSWORD_LENGTH} 位`);

    const user = await db
        .prepare(
            `SELECT id, email, display_name, created_at, password_hash, password_salt, iterations
             FROM users WHERE email = ?1`,
        )
        .bind(email)
        .first();

    if (!user) return fail("邮箱或密码不正确", 401);

    const candidate = await hashPassword(password, user.password_salt, user.iterations || PBKDF2_ITERATIONS);
    if (!safeEqual(candidate, user.password_hash)) return fail("邮箱或密码不正确", 401);

    await db
        .prepare("UPDATE users SET last_seen_at = ?1 WHERE id = ?2")
        .bind(new Date().toISOString(), user.id)
        .run();

    const { token, maxAge } = await issueSession(db, user.id);
    return json(
        {
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                createdAt: user.created_at,
            },
        },
        200,
        { "Set-Cookie": sessionCookie(token, maxAge) },
    );
};

const handleLogout = async (request, env) => {
    const db = requireDb(env);
    const token = parseCookies(request)[SESSION_COOKIE];
    if (token) {
        await db.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256Hex(token)).run();
    }
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
};

const handleMe = async (request, env) => {
    const db = requireDb(env);
    const user = await currentUser(db, request);
    return json({ ok: true, user });
};

/* ------------------------------------------------------------------ */
/* 拆盒上报                                                             */
/* ------------------------------------------------------------------ */

/** 校验客户端上报的拆盒结果，返回可入库的聚合数据 */
const sanitizeBreak = (body, appKey) => {
    if (!body || !isSafeKey(body.boxKey)) return null;
    const seed = typeof body.seed === "string" ? body.seed.slice(0, 40) : "";
    const cardCount = Number.isInteger(body.cardCount) ? body.cardCount : null;
    if (cardCount === null || cardCount < 0 || cardCount > 2000) return null;

    const cleanMap = (raw, limit) => {
        const out = {};
        if (!raw || typeof raw !== "object") return out;
        let count = 0;
        for (const [key, value] of Object.entries(raw)) {
            if (!isSafeKey(key)) continue;
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) continue;
            out[key] = Math.min(Math.round(n), 2000);
            count += 1;
            if (count >= limit) break;
        }
        return out;
    };

    // 卡种不能只带张数：pull_stats 还要按子集与稀有度切片，
    // 所以每个卡种都随带上报它的 subsetKey / tier。【重要】
    const cleanVariants = (raw, limit) => {
        const out = [];
        if (!raw || typeof raw !== "object") return out;
        for (const [key, value] of Object.entries(raw)) {
            if (!isSafeKey(key)) continue;
            const item = value && typeof value === "object" ? value : { count: value };
            const n = Number(item.count);
            if (!Number.isFinite(n) || n <= 0) continue;
            out.push({
                variantKey: key.slice(0, 160),
                subsetKey: softKey(item.subsetKey) || null,
                tier: typeof item.tier === "string" ? item.tier.slice(0, 20) : null,
                count: Math.min(Math.round(n), 2000),
            });
            if (out.length >= limit) break;
        }
        return out;
    };

    const byTier = cleanMap(body.byTier, 12);
    const bySubset = cleanMap(body.bySubset, 120);
    const byVariant = cleanVariants(body.byVariant, MAX_VARIANTS_PER_BREAK);

    let best = null;
    if (body.best && isSafeKey(body.best.variantKey)) {
        best = {
            variantKey: body.best.variantKey.slice(0, 160),
            player: typeof body.best.player === "string" ? body.best.player.slice(0, 80) : "",
            tier: typeof body.best.tier === "string" ? body.best.tier.slice(0, 20) : "common",
            odds: Number.isFinite(body.best.odds) ? Math.max(0, Math.round(body.best.odds)) : 0,
        };
    }

    return {
        appKey,
        boxKey: body.boxKey,
        categoryKey: softKey(body.categoryKey),
        makerKey: softKey(body.makerKey),
        productKey: softKey(body.productKey),
        seed,
        cardCount,
        byTier,
        bySubset,
        byVariant,
        best,
    };
};

const handleRecordBreak = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const user = await currentUser(db, request);
    if (!user) return fail("请先登录", 401);

    const body = await readJson(request);
    const record = sanitizeBreak(body, appKey);
    if (!record) return fail("拆盒数据不合法");

    const now = new Date().toISOString();
    const statements = [
        db
            .prepare(
                `INSERT INTO breaks (app_key, user_id, box_key, category_key, maker_key, product_key,
                                     seed, card_count, by_tier, by_subset,
                                     best_variant, best_player, best_tier, best_odds, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
            )
            .bind(
                appKey,
                user.id,
                record.boxKey,
                record.categoryKey,
                record.makerKey,
                record.productKey,
                record.seed,
                record.cardCount,
                JSON.stringify(record.byTier),
                JSON.stringify(record.bySubset),
                record.best?.variantKey ?? null,
                record.best?.player ?? null,
                record.best?.tier ?? null,
                record.best?.odds ?? null,
                now,
            ),
    ];

    for (const item of record.byVariant) {
        statements.push(
            db
                .prepare(
                    `INSERT INTO pull_stats (app_key, user_id, box_key, category_key, maker_key, product_key,
                                             variant_key, subset_key, tier, count, first_at, last_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
                     ON CONFLICT (app_key, user_id, box_key, variant_key) DO UPDATE SET
                         count = pull_stats.count + excluded.count,
                         subset_key = excluded.subset_key,
                         tier = excluded.tier,
                         last_at = excluded.last_at`,
                )
                .bind(
                    appKey,
                    user.id,
                    record.boxKey,
                    record.categoryKey,
                    record.makerKey,
                    record.productKey,
                    item.variantKey,
                    item.subsetKey,
                    item.tier,
                    item.count,
                    now,
                ),
        );
    }

    await runBatches(db, statements);
    return json({ ok: true });
};

/**
 * 清空我的拆盒记录（需登录）。
 *
 * 支持三种范围：不带条件 = 全部；?category=xxx = 该品类；?box=xxx = 该盒型。
 * 三者作用在同一套维度字段上，所以直接复用 compileFilters。
 *
 * 【重要】维度参数一旦出现就必须合法。softKey 会把非法值吞成空字符串，
 * 条件被跳过就静默变成「清空全部」—— 删除不可逆，这里宁可报错也不能猜。
 */
const handleDeleteBreaks = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const user = await currentUser(db, request);
    if (!user) return fail("请先登录", 401);

    const url = new URL(request.url);
    const filters = [];
    for (const dimension of ["category", "maker", "box"]) {
        const raw = url.searchParams.get(dimension);
        if (raw === null || raw === "") continue;
        if (!isSafeKey(raw)) return fail("清空范围不合法，请重新选择");
        filters.push([`${dimension}_key`, raw]);
    }

    const where = compileFilters(filters, 3);
    const scope = `WHERE app_key = ?1 AND user_id = ?2${where.sql}`;
    const binds = [appKey, user.id, ...where.binds];

    const counted = await db.prepare(`SELECT COUNT(*) AS total FROM breaks ${scope}`).bind(...binds).first();

    // 两张事实表都要删：只删 breaks 会让统计页的累计数字与记录列表对不上
    await db.batch([
        db.prepare(`DELETE FROM breaks ${scope}`).bind(...binds),
        db.prepare(`DELETE FROM pull_stats ${scope}`).bind(...binds),
    ]);

    return json({ ok: true, removed: counted?.total ?? 0 });
};

/** 安全地把库里存的 JSON 文本解析成对象，脏数据一律当空对象 */
const parseJsonObject = (text) => {
    try {
        const parsed = JSON.parse(String(text ?? "{}"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

/**
 * 我的拆盒记录：按 id 倒序分页返回。
 * 前端不再保留任何本地记录，统计页就是靠这个接口 + /api/stats 渲染的。
 */
const handleListBreaks = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const user = await currentUser(db, request);
    if (!user) return fail("请先登录", 401);

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit"));
    const rawOffset = Number(url.searchParams.get("offset"));
    const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_BREAKS_PER_PAGE)
        : DEFAULT_BREAKS_PER_PAGE;
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

    const filters = readFilters(request);
    // ?1 = app_key、?2 = user_id，切片条件从 ?3 开始，limit/offset 接在后面
    const where = compileFilters(
        [
            ["category_key", filters.categoryKey],
            ["maker_key", filters.makerKey],
            ["box_key", filters.boxKey],
        ],
        3,
    );
    const scope = `WHERE app_key = ?1 AND user_id = ?2${where.sql}`;

    const [total, rows] = await Promise.all([
        db.prepare(`SELECT COUNT(*) AS total FROM breaks ${scope}`).bind(appKey, user.id, ...where.binds).first(),
        db
            .prepare(
                `SELECT id, box_key, category_key, maker_key, product_key, seed, card_count,
                        by_tier, by_subset, best_variant, best_player, best_tier, best_odds, created_at
                 FROM breaks ${scope}
                 ORDER BY id DESC LIMIT ?${where.next} OFFSET ?${where.next + 1}`,
            )
            .bind(appKey, user.id, ...where.binds, limit, offset)
            .all(),
    ]);

    return json({
        ok: true,
        user,
        filters,
        total: total?.total ?? 0,
        limit,
        offset,
        breaks: (rows?.results ?? []).map((row) => ({
            id: row.id,
            boxKey: row.box_key,
            categoryKey: row.category_key,
            makerKey: row.maker_key,
            productKey: row.product_key,
            seed: row.seed,
            cardCount: row.card_count,
            byTier: parseJsonObject(row.by_tier),
            bySubset: parseJsonObject(row.by_subset),
            best: row.best_variant
                ? {
                      variantKey: row.best_variant,
                      player: row.best_player ?? "",
                      tier: row.best_tier ?? "common",
                      odds: row.best_odds ?? 0,
                  }
                : null,
            createdAt: row.created_at,
        })),
    });
};

/* ------------------------------------------------------------------ */
/* 统计                                                                 */
/* ------------------------------------------------------------------ */

/** 从 query string 里取切片条件；只接受合法 slug，其余忽略 */
const readFilters = (request) => {
    const url = new URL(request.url);
    const pick = (name) => softKey(url.searchParams.get(name) ?? "");
    return {
        boxKey: pick("box"),
        categoryKey: pick("category"),
        makerKey: pick("maker"),
    };
};

const handleStats = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const user = await currentUser(db, request);
    const filters = readFilters(request);
    if (!user) return json({ ok: true, user: null, filters, stats: null });

    const breakFilter = compileFilters(
        [
            ["category_key", filters.categoryKey],
            ["maker_key", filters.makerKey],
            ["box_key", filters.boxKey],
        ],
        2,
    );
    const pullFilter = compileFilters(
        [
            ["category_key", filters.categoryKey],
            ["maker_key", filters.makerKey],
            ["box_key", filters.boxKey],
        ],
        2,
    );

    const byUser = "app_key = ?1 AND user_id = ?2";

    const [summary, byBox, byCategory, byMaker, byTier, bySubset, recent, rarest] = await Promise.all([
        db
            .prepare(
                `SELECT COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${byUser}${breakFilter.sql}`,
            )
            .bind(appKey, user.id, ...breakFilter.binds)
            .first(),
        db
            .prepare(
                `SELECT box_key, category_key, maker_key, product_key,
                        COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${byUser}${breakFilter.sql}
                 GROUP BY box_key ORDER BY boxes DESC`,
            )
            .bind(appKey, user.id, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT category_key, COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${byUser}${breakFilter.sql}
                 GROUP BY category_key ORDER BY boxes DESC`,
            )
            .bind(appKey, user.id, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT maker_key, COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${byUser}${breakFilter.sql}
                 GROUP BY maker_key ORDER BY boxes DESC`,
            )
            .bind(appKey, user.id, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT tier, SUM(count) AS total FROM pull_stats
                 WHERE ${byUser}${pullFilter.sql} AND tier IS NOT NULL
                 GROUP BY tier ORDER BY total DESC`,
            )
            .bind(appKey, user.id, ...pullFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT subset_key, SUM(count) AS total FROM pull_stats
                 WHERE ${byUser}${pullFilter.sql} AND subset_key IS NOT NULL
                 GROUP BY subset_key ORDER BY total DESC LIMIT 120`,
            )
            .bind(appKey, user.id, ...pullFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT box_key, category_key, maker_key, seed,
                        best_player, best_tier, best_variant, best_odds, created_at
                 FROM breaks WHERE ${byUser}${breakFilter.sql}
                 ORDER BY id DESC LIMIT 20`,
            )
            .bind(appKey, user.id, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT box_key, category_key, maker_key, seed,
                        best_player, best_tier, best_variant, best_odds, created_at
                 FROM breaks WHERE ${byUser}${breakFilter.sql} AND best_odds IS NOT NULL
                 ORDER BY best_odds DESC LIMIT 20`,
            )
            .bind(appKey, user.id, ...breakFilter.binds)
            .all(),
    ]);

    return json({
        ok: true,
        user,
        filters,
        stats: {
            boxes: summary?.boxes ?? 0,
            cards: summary?.cards ?? 0,
            byBox: byBox?.results ?? [],
            byCategory: byCategory?.results ?? [],
            byMaker: byMaker?.results ?? [],
            byTier: byTier?.results ?? [],
            bySubset: bySubset?.results ?? [],
            recent: recent?.results ?? [],
            rarest: rarest?.results ?? [],
        },
    });
};

const handleLeaderboard = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const filters = readFilters(request);
    const where = compileFilters(
        [
            ["b.category_key", filters.categoryKey],
            ["b.maker_key", filters.makerKey],
            ["b.box_key", filters.boxKey],
        ],
        2,
    );

    const rows = await db
        .prepare(
            `SELECT u.display_name, COUNT(b.id) AS boxes, COALESCE(SUM(b.card_count), 0) AS cards,
                    MAX(b.best_odds) AS best_odds
             FROM users u JOIN breaks b ON b.user_id = u.id
             WHERE b.app_key = ?1${where.sql}
             GROUP BY u.id ORDER BY boxes DESC, cards DESC LIMIT 30`,
        )
        .bind(appKey, ...where.binds)
        .all();

    return json({ ok: true, filters, leaderboard: rows?.results ?? [] });
};

const handleGlobal = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const filters = readFilters(request);

    const breakFilter = compileFilters(
        [
            ["category_key", filters.categoryKey],
            ["maker_key", filters.makerKey],
            ["box_key", filters.boxKey],
        ],
        2,
    );
    const pullFilter = compileFilters(
        [
            ["category_key", filters.categoryKey],
            ["maker_key", filters.makerKey],
            ["box_key", filters.boxKey],
        ],
        2,
    );
    const scope = "app_key = ?1";

    const [totals, users, byTier, bySubset, byBox, byCategory, byMaker, catalog] = await Promise.all([
        db
            .prepare(
                `SELECT COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${scope}${breakFilter.sql}`,
            )
            .bind(appKey, ...breakFilter.binds)
            .first(),
        db.prepare("SELECT COUNT(*) AS users FROM users").first(),
        db
            .prepare(
                `SELECT tier, SUM(count) AS total FROM pull_stats
                 WHERE ${scope}${pullFilter.sql} AND tier IS NOT NULL
                 GROUP BY tier ORDER BY total DESC`,
            )
            .bind(appKey, ...pullFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT subset_key, SUM(count) AS total FROM pull_stats
                 WHERE ${scope}${pullFilter.sql} AND subset_key IS NOT NULL
                 GROUP BY subset_key ORDER BY total DESC LIMIT 120`,
            )
            .bind(appKey, ...pullFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT box_key, COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${scope}${breakFilter.sql}
                 GROUP BY box_key ORDER BY boxes DESC LIMIT 50`,
            )
            .bind(appKey, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT category_key, COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${scope}${breakFilter.sql}
                 GROUP BY category_key ORDER BY boxes DESC`,
            )
            .bind(appKey, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT maker_key, COUNT(*) AS boxes, COALESCE(SUM(card_count), 0) AS cards
                 FROM breaks WHERE ${scope}${breakFilter.sql}
                 GROUP BY maker_key ORDER BY boxes DESC`,
            )
            .bind(appKey, ...breakFilter.binds)
            .all(),
        db
            .prepare(
                `SELECT
                     (SELECT COUNT(*) FROM categories WHERE app_key = ?1) AS categories,
                     (SELECT COUNT(*) FROM makers     WHERE app_key = ?1) AS makers,
                     (SELECT COUNT(*) FROM products   WHERE app_key = ?1) AS products,
                     (SELECT COUNT(*) FROM boxes      WHERE app_key = ?1) AS boxes,
                     (SELECT COUNT(*) FROM subsets    WHERE app_key = ?1) AS subsets,
                     (SELECT COUNT(*) FROM variants   WHERE app_key = ?1) AS variants`,
            )
            .bind(appKey)
            .first(),
    ]);

    return json({
        ok: true,
        app: appKey,
        filters,
        global: {
            users: users?.users ?? 0,
            boxes: totals?.boxes ?? 0,
            cards: totals?.cards ?? 0,
            byTier: byTier?.results ?? [],
            bySubset: bySubset?.results ?? [],
            byBox: byBox?.results ?? [],
            byCategory: byCategory?.results ?? [],
            byMaker: byMaker?.results ?? [],
        },
        catalog: {
            categories: catalog?.categories ?? 0,
            makers: catalog?.makers ?? 0,
            products: catalog?.products ?? 0,
            boxes: catalog?.boxes ?? 0,
            subsets: catalog?.subsets ?? 0,
            variants: catalog?.variants ?? 0,
        },
    });
};

/* ------------------------------------------------------------------ */
/* 目录镜像                                                             */
/* ------------------------------------------------------------------ */

/**
 * 把前端 TS 目录写进 D1 的维度表。
 *
 * 为什么不在构建期同步？ Pages 构建时没有 D1 绑定，而这里只在需要时
 * 手工 POST 一次（带上 CE_SYNC_TOKEN），代价低、可重复执行。
 * 之所以要镜像，是为了能用纯 SQL 做跨站点 / 跨品类的对账与分析。
 */
const handleCatalogSync = async (request, env) => {
    const db = requireDb(env);
    const token = env.CE_SYNC_TOKEN;
    if (!token) return fail("未配置 CE_SYNC_TOKEN，目录同步已停用", 503);
    const provided = request.headers.get("x-sync-token") || "";
    if (!safeEqual(provided, token)) return fail("同步令牌不正确", 401);

    const body = await readJson(request);
    if (!body) return fail("请求体格式不正确");

    const appKey = softKey(body.app?.key) || appKeyOf(env);
    const now = new Date().toISOString();

    const take = (list, limit) => (Array.isArray(list) ? list.slice(0, limit) : []);

    const appRows = [
        {
            key: appKey,
            name: String(body.app?.name ?? appKey).slice(0, 60),
            host: String(body.app?.host ?? "").slice(0, 120),
            description: String(body.app?.description ?? "").slice(0, 240),
            updated_at: now,
        },
    ];

    const categoryRows = take(body.categories, 200).map((item) => ({
        app_key: appKey,
        key: softKey(item.key),
        name: String(item.name ?? item.key ?? "").slice(0, 60),
        name_en: String(item.nameEn ?? "").slice(0, 60),
        icon: String(item.icon ?? "").slice(0, 40),
        tagline: String(item.tagline ?? "").slice(0, 120),
        sort_order: Number.isFinite(item.order) ? item.order : 0,
        live: item.live ? 1 : 0,
        updated_at: now,
    }));

    const makerRows = take(body.makers, 500).map((item) => ({
        app_key: appKey,
        category_key: softKey(item.categoryKey),
        key: softKey(item.key),
        name: String(item.name ?? item.key ?? "").slice(0, 60),
        name_en: String(item.nameEn ?? "").slice(0, 60),
        sort_order: Number.isFinite(item.order) ? item.order : 0,
        live: item.live ? 1 : 0,
        updated_at: now,
    }));

    const productRows = take(body.products, 1000).map((item) => ({
        app_key: appKey,
        key: softKey(item.key),
        category_key: softKey(item.categoryKey),
        maker_key: softKey(item.makerKey),
        name: String(item.name ?? item.key ?? "").slice(0, 120),
        release_date: item.releaseDate ? String(item.releaseDate).slice(0, 20) : null,
        sort_order: Number.isFinite(item.order) ? item.order : 0,
        live: item.live ? 1 : 0,
        note: String(item.note ?? "").slice(0, 400),
        updated_at: now,
    }));

    const boxRows = take(body.boxes, 2000).map((item) => ({
        app_key: appKey,
        key: softKey(item.key),
        product_key: softKey(item.productKey),
        category_key: softKey(item.categoryKey),
        maker_key: softKey(item.makerKey),
        slug: String(item.slug ?? "").slice(0, 60),
        name: String(item.name ?? item.key ?? "").slice(0, 160),
        cards_per_pack: Number.isFinite(item.cardsPerPack) ? item.cardsPerPack : 0,
        packs_per_box: Number.isFinite(item.packsPerBox) ? item.packsPerBox : 0,
        boxes_per_case: Number.isFinite(item.boxesPerCase) ? item.boxesPerCase : 0,
        auto_guaranteed: item.autoGuaranteed ? 1 : 0,
        live: item.live ? 1 : 0,
        sort_order: Number.isFinite(item.order) ? item.order : 0,
        updated_at: now,
    }));

    const subsetRows = take(body.subsets, 8000).map((item) => ({
        app_key: appKey,
        box_key: softKey(item.boxKey),
        key: softKey(item.key),
        name: String(item.name ?? item.key ?? "").slice(0, 120),
        code: item.code ? String(item.code).slice(0, 30) : null,
        kind: String(item.kind ?? "base").slice(0, 20),
        detailed: item.detailed ? 1 : 0,
        in_box: item.inBox === false ? 0 : 1,
        sort_order: Number.isFinite(item.order) ? item.order : 0,
        subject_count: Number.isFinite(item.subjectCount) ? item.subjectCount : 0,
        updated_at: now,
    }));

    const variantRows = take(body.variants, 20000).map((item) => ({
        app_key: appKey,
        box_key: softKey(item.boxKey),
        key: String(item.key ?? "").slice(0, 200),
        subset_key: String(item.subsetKey ?? "").slice(0, 120),
        name: String(item.name ?? "").slice(0, 120),
        full_name: String(item.fullName ?? "").slice(0, 200),
        group_kind: String(item.groupKind ?? "base").slice(0, 20),
        tier: String(item.tier ?? "common").slice(0, 20),
        odds: Number.isFinite(item.odds) ? item.odds : 0,
        numbered: Number.isFinite(item.numbered) ? item.numbered : null,
        weight: Number.isFinite(item.weight) ? item.weight : 0,
        updated_at: now,
    }));

    const invalid =
        !categoryRows.length && !boxRows.length
            ? "负载里没有任何品类或盒型"
            : null;
    if (invalid) return fail(invalid);

    // 顺序即外键顺序：apps -> categories -> makers -> products -> boxes -> subsets -> variants
    await runBatches(db, buildUpserts(db, "apps", ["key", "name", "host", "description", "updated_at"], ["key"], appRows));
    await runBatches(
        db,
        buildUpserts(
            db,
            "categories",
            ["app_key", "key", "name", "name_en", "icon", "tagline", "sort_order", "live", "updated_at"],
            ["app_key", "key"],
            categoryRows,
        ),
    );
    await runBatches(
        db,
        buildUpserts(
            db,
            "makers",
            ["app_key", "category_key", "key", "name", "name_en", "sort_order", "live", "updated_at"],
            ["app_key", "category_key", "key"],
            makerRows,
        ),
    );
    await runBatches(
        db,
        buildUpserts(
            db,
            "products",
            ["app_key", "key", "category_key", "maker_key", "name", "release_date", "sort_order", "live", "note", "updated_at"],
            ["app_key", "key"],
            productRows,
        ),
    );
    await runBatches(
        db,
        buildUpserts(
            db,
            "boxes",
            [
                "app_key", "key", "product_key", "category_key", "maker_key", "slug", "name",
                "cards_per_pack", "packs_per_box", "boxes_per_case", "auto_guaranteed", "live",
                "sort_order", "updated_at",
            ],
            ["app_key", "key"],
            boxRows,
        ),
    );
    await runBatches(
        db,
        buildUpserts(
            db,
            "subsets",
            ["app_key", "box_key", "key", "name", "code", "kind", "detailed", "in_box", "sort_order", "subject_count", "updated_at"],
            ["app_key", "box_key", "key"],
            subsetRows,
        ),
    );
    await runBatches(
        db,
        buildUpserts(
            db,
            "variants",
            ["app_key", "box_key", "key", "subset_key", "name", "full_name", "group_kind", "tier", "odds", "numbered", "weight", "updated_at"],
            ["app_key", "box_key", "key"],
            variantRows,
        ),
    );

    return json({
        ok: true,
        app: appKey,
        synced: {
            apps: appRows.length,
            categories: categoryRows.length,
            makers: makerRows.length,
            products: productRows.length,
            boxes: boxRows.length,
            subsets: subsetRows.length,
            variants: variantRows.length,
        },
    });
};

/** 从 D1 读回目录镜像（对账用） */
const handleCatalogRead = async (request, env) => {
    const db = requireDb(env);
    const appKey = appKeyOf(env);
    const url = new URL(request.url);
    const boxKey = softKey(url.searchParams.get("box") ?? "");

    const base = compileFilters([["box_key", boxKey]], 2);

    const [categories, makers, products, boxes, subsets, variants, schema] = await Promise.all([
        db.prepare("SELECT * FROM categories WHERE app_key = ?1 ORDER BY sort_order").bind(appKey).all(),
        db.prepare("SELECT * FROM makers WHERE app_key = ?1 ORDER BY category_key, sort_order").bind(appKey).all(),
        db.prepare("SELECT * FROM products WHERE app_key = ?1 ORDER BY category_key, sort_order").bind(appKey).all(),
        db.prepare("SELECT * FROM boxes WHERE app_key = ?1 ORDER BY category_key, sort_order").bind(appKey).all(),
        db.prepare(`SELECT * FROM subsets WHERE app_key = ?1${base.sql} ORDER BY box_key, sort_order`).bind(appKey, ...base.binds).all(),
        db.prepare(`SELECT * FROM variants WHERE app_key = ?1${base.sql} ORDER BY box_key, odds`).bind(appKey, ...base.binds).all(),
        db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").first(),
    ]);

    return json({
        ok: true,
        app: appKey,
        schemaVersion: schema?.value ?? null,
        categories: categories?.results ?? [],
        makers: makers?.results ?? [],
        products: products?.results ?? [],
        boxes: boxes?.results ?? [],
        subsets: subsets?.results ?? [],
        variants: variants?.results ?? [],
    });
};

const handleConfig = (env) =>
    json({
        ok: true,
        app: appKeyOf(env),
        auth: "pbkdf2-sha256",
        features: {
            leaderboard: true,
            globalStats: true,
            catalogSync: Boolean(env.CE_SYNC_TOKEN),
        },
    });

/* ------------------------------------------------------------------ */
/* 路由分发                                                             */
/* ------------------------------------------------------------------ */

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": new URL(request.url).origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, x-sync-token",
            },
        });
    }

    const path = new URL(request.url).pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
    const method = request.method.toUpperCase();

    // 【重要】这里必须 await。`return handleXxx()` 只是把 Promise 交出去，
    // try/catch 不会捕获它的拒绝，任何异步失败都会变成未处理异常，
    // 线上表现为 Pages 的 1101 错误页，而不是本文件统一的 JSON 报错。
    try {
        if (path === "config" && method === "GET") return await handleConfig(env);

        if (path === "catalog" && method === "GET") return await handleCatalogRead(request, env);
        if (path === "catalog/sync" && method === "POST") return await handleCatalogSync(request, env);

        if (path === "auth/register" && method === "POST") return await handleRegister(request, env);
        if (path === "auth/login" && method === "POST") return await handleLogin(request, env);
        if (path === "auth/logout" && method === "POST") return await handleLogout(request, env);
        if (path === "me" && method === "GET") return await handleMe(request, env);

        if (path === "stats" && method === "GET") return await handleStats(request, env);
        if (path === "break" && method === "POST") return await handleRecordBreak(request, env);
        if (path === "breaks" && method === "GET") return await handleListBreaks(request, env);
        if (path === "break" && method === "DELETE") return await handleDeleteBreaks(request, env);
        if (path === "leaderboard" && method === "GET") return await handleLeaderboard(request, env);
        if (path === "global" && method === "GET") return await handleGlobal(request, env);

        return fail(`未知接口：${method} /api/${path}`, 404);
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        // 实现细节只进日志（Pages 面板的实时日志可见），
        // 返回给用户的必须是干净的固定文案，见 agent.md 2.1。
        console.error(`[api] ${method} /api/${path} -> ${detail}`, error instanceof Error ? error.stack : "");
        return fail("服务暂时不可用，请稍后重试。", 500);
    }
}
