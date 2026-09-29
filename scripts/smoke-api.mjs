/**
 * API 冒烟脚本：注册 -> 登录 -> 记录拆盒 -> 我的拆盒记录 -> 按范围清空 -> 我的统计
 * -> 全站统计 -> 排行榜。
 * 默认打本地 wrangler pages dev（http://127.0.0.1:8788），
 * 传第一个参数或设 CE_BASE 环境变量即可改成线上站点：
 *
 *   node scripts/smoke-api.mjs https://cardemulate.pages.dev
 *
 * 手动管理 Session Cookie（Node fetch 不会自动保存）。
 */
const ORIGIN = (process.argv[2] || process.env.CE_BASE || "http://127.0.0.1:8788").replace(/\/$/, "");
const BASE = `${ORIGIN}/api`;

let cookie = "";

const call = async (path, init = {}, session) => {
    const headers = { ...(init.headers || {}) };
    if (session) headers.Cookie = session;
    const response = await fetch(`${BASE}/${path}`, { ...init, headers });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const text = await response.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        body = text;
    }
    return { status: response.status, body, setCookie };
};

const post = (path, payload, session) =>
    call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, session);

const tokenOf = (setCookie) => {
    const raw = setCookie.find((item) => item.startsWith("ce_session="));
    if (!raw) return "";
    return raw.split(";")[0];
};

const show = (label, result) => {
    console.log(`\n=== ${label} (${result.status}) ===`);
    console.log(JSON.stringify(result.body, null, 2));
};

const main = async () => {
    console.log(`=== 目标站点 ${ORIGIN} ===`);
    const email = `smoke${Date.now()}@example.com`;

    console.log("=== 注册约束校验（全部应失败） ===");
    for (const [label, payload] of [
        ["空邮箱", { email: "", password: "abc123" }],
        ["邮箱格式错", { email: "abc", password: "abc123" }],
        ["密码 5 位", { email, password: "abc12" }],
        ["密码 33 位", { email, password: "a".repeat(33) }],
        ["密码含空格", { email, password: "abc 123" }],
    ]) {
        const result = await post("auth/register", payload);
        console.log(`${label.padEnd(12)} ${result.status} ${JSON.stringify(result.body)}`);
    }

    console.log("\n=== 注册与登录 ===");
    show("注册-合法", await post("auth/register", { email, password: "abc123" }));
    show("注册-重复邮箱", await post("auth/register", { email, password: "abc123" }));
    show("登录-密码错", await post("auth/login", { email, password: "wrong1" }));

    const login = await post("auth/login", { email, password: "abc123" });
    cookie = tokenOf(login.setCookie) || cookie;
    show("登录-正确", { status: login.status, body: login.body, setCookie: login.setCookie.length });

    show("当前用户", await call("me", {}, cookie));

    /** 造一笔拆盒记录，boxKey / categoryKey 可覆盖，用来验证按范围清空 */
    const breakPayload = (over = {}) => ({
        boxKey: "basketball.topps.tcu26-basketball.value-box",
        categoryKey: "basketball",
        makerKey: "topps",
        productKey: "tcu26-basketball",
        seed: "TEST-1",
        cardCount: 28,
        byTier: { common: 25, rare: 3 },
        bySubset: { base: 25, "clutch-city": 3 },
        byVariant: {
            "base-common": { count: 25, subsetKey: "base", tier: "common" },
            "clutch-city-rare": { count: 3, subsetKey: "clutch-city", tier: "rare" },
        },
        best: { variantKey: "clutch-city-rare", player: "Test Player", tier: "rare", odds: 24 },
        ...over,
    });

    show("记录拆盒", await post("break", breakPayload(), cookie));

    show("我的统计", await call("stats", {}, cookie));
    console.log("\n=== 维度切片校验 ===");
    const stats = (await call("stats", {}, cookie)).body.stats;
    console.log("byTier  :", JSON.stringify(stats.byTier));
    console.log("bySubset:", JSON.stringify(stats.bySubset));
    const tierOk = stats.byTier.length === 2;
    const subsetOk = stats.bySubset.some((row) => row.subset_key === "clutch-city");
    console.log(tierOk && subsetOk ? "OK: 稀有度与子集维度均已正确入库" : "FAIL: 维度聚合仍不正确");

    console.log("\n=== 拆盒记录接口校验 ===");
    const anonBreaks = await call("breaks");
    console.log(`未登录 GET /api/breaks -> ${anonBreaks.status} ${JSON.stringify(anonBreaks.body)}`);
    console.log(anonBreaks.status === 401 ? "OK: 未登录被拦截" : "FAIL: 未登录不应拿到记录");

    const mine = await call("breaks?limit=5", {}, cookie);
    show("我的拆盒记录", {
        status: mine.status,
        body: {
            total: mine.body.total,
            limit: mine.body.limit,
            offset: mine.body.offset,
            first: mine.body.breaks?.[0],
        },
    });
    const first = mine.body.breaks?.[0];
    const recordOk =
        mine.status === 200 &&
        mine.body.total === 1 &&
        first?.seed === "TEST-1" &&
        first?.cardCount === 28 &&
        first?.best?.variantKey === "clutch-city-rare" &&
        first?.bySubset?.["clutch-city"] === 3;
    console.log(recordOk ? "OK: 拆盒记录已从数据库正确读出" : "FAIL: 拆盒记录字段不正确");

    console.log("\n=== 按范围清空校验 ===");
    const totalOf = async () => (await call("breaks?limit=1", {}, cookie)).body.total;
    console.log("清空前总条数:", await totalOf());

    // 越权与非法范围都必须被挡下来，且不能误删
    const anonDelete = await call("break", { method: "DELETE" });
    console.log(`未登录 DELETE /api/break -> ${anonDelete.status}`);
    console.log(anonDelete.status === 401 ? "OK: 未登录被拦截" : "FAIL: 未登录不应能清空");

    const badScope = await call("break?category=not%20a%20key", { method: "DELETE" }, cookie);
    console.log(`非法范围 DELETE /api/break -> ${badScope.status} ${JSON.stringify(badScope.body)}`);
    console.log(badScope.status === 400 ? "OK: 非法范围被拒绝" : "FAIL: 非法范围应报错而不是静默清空");
    const survived = await totalOf();
    console.log(`非法请求后总条数: ${survived}`);
    console.log(survived === 1 ? "OK: 被拒绝的请求没有删掉任何记录" : "FAIL: 被拒绝的请求不应改写数据");

    // 再补两笔别的品类，验证只清空选中范围
    await post("break", breakPayload({ seed: "TEST-2" }), cookie);
    await post(
        "break",
        breakPayload({
            boxKey: "baseball.topps.tcbs26-baseball.hobby-box",
            categoryKey: "baseball",
            productKey: "tcbs26-baseball",
            seed: "TEST-3",
        }),
        cookie,
    );
    console.log("补两笔后总条数:", await totalOf());

    const clearBasketball = await call("break?category=basketball", { method: "DELETE" }, cookie);
    console.log(`按品类清空 -> ${clearBasketball.status} ${JSON.stringify(clearBasketball.body)}`);
    const afterCategory = await call("breaks?limit=20", {}, cookie);
    const leftKeys = [...new Set((afterCategory.body.breaks ?? []).map((row) => row.categoryKey))];
    const scopeOk =
        clearBasketball.status === 200 &&
        clearBasketball.body.removed === 2 &&
        afterCategory.body.total === 1 &&
        leftKeys.length === 1 &&
        leftKeys[0] === "baseball";
    console.log(scopeOk ? "OK: 只清空了选中的品类" : "FAIL: 范围清空不正确（可能误删了别的品类）");

    // 盒型 key 里带连字符，单独验一遍：它必须能通过 key 校验
    const boxKey = "baseball.topps.tcbs26-baseball.hobby-box";
    const clearBox = await call(`break?box=${encodeURIComponent(boxKey)}`, { method: "DELETE" }, cookie);
    console.log(`按盒型清空 -> ${clearBox.status} ${JSON.stringify(clearBox.body)}`);
    const afterBox = await totalOf();
    console.log(
        clearBox.status === 200 && clearBox.body.removed === 1 && afterBox === 0
            ? "OK: 只清空了选中的盒型"
            : "FAIL: 按盒型清空不正确",
    );

    await post("break", breakPayload({ seed: "TEST-4" }), cookie);
    const clearAll = await call("break", { method: "DELETE" }, cookie);
    console.log(`不带范围清空 -> ${clearAll.status} ${JSON.stringify(clearAll.body)}`);
    const finalTotal = await totalOf();
    console.log(
        clearAll.body.removed === 1 && finalTotal === 0
            ? "OK: 不带范围即清空全部"
            : "FAIL: 不带范围应清空全部",
    );

    show("清空后的我的统计", await call("stats", {}, cookie));

    show("排行榜", await call("leaderboard"));
    show("全站统计", await call("global"));

    show("退出登录", await call("auth/logout", { method: "POST" }, cookie));
    show("退出后再查当前用户", await call("me", {}, cookie));
};

main().catch((error) => {
    console.error("冒烟失败:", error);
    process.exit(1);
});
