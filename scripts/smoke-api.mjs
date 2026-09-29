/**
 * 本地 API 冒烟脚本（临时，不入库）。
 * 直接对着 wrangler pages dev 起的本地全栈服务跑完整链路：
 * 注册 -> 登录 -> 记录拆盒 -> 我的统计 -> 全站统计 -> 排行榜。
 * 手动管理 Session Cookie（Node fetch 不会自动保存）。
 */
const BASE = "http://127.0.0.1:8788/api";

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

    show(
        "记录拆盒",
        await post(
            "break",
            {
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
            },
            cookie,
        ),
    );

    show("我的统计", await call("stats", {}, cookie));
    console.log("\n=== 维度切片校验 ===");
    const stats = (await call("stats", {}, cookie)).body.stats;
    console.log("byTier  :", JSON.stringify(stats.byTier));
    console.log("bySubset:", JSON.stringify(stats.bySubset));
    const tierOk = stats.byTier.length === 2;
    const subsetOk = stats.bySubset.some((row) => row.subset_key === "clutch-city");
    console.log(tierOk && subsetOk ? "OK: 稀有度与子集维度均已正确入库" : "FAIL: 维度聚合仍不正确");

    show("排行榜", await call("leaderboard"));
    show("全站统计", await call("global"));

    show("退出登录", await call("auth/logout", { method: "POST" }, cookie));
    show("退出后再查当前用户", await call("me", {}, cookie));
};

main().catch((error) => {
    console.error("冒烟失败:", error);
    process.exit(1);
});
