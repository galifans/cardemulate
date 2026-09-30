/**
 * 卡价站点可达性穿刺（一次性调研工具）
 *
 * 为什么需要它：本机出网被大量拦截（见 sources/README.md 第六节），
 * 而卡价又只能从第三方站点取。与其在死路上一个个人工试，不如一次把候选站点
 * 全打一遍，把「哪些站点能拿到数、能拿到什么数」写进 sources/prices/README.md，
 * 后面补录价格时直接照那张表走。
 *
 * 用法：
 *   node scripts/probe-price-sites.mjs                # 全部候选
 *   node scripts/probe-price-sites.mjs ebay comc      # 只看名字里含这些片段的
 *
 * 判读方式：
 *   200 且正文里能搜到关键词 -> 可用
 *   403 / 503 / ENOTFOUND    -> 不可用，别再试
 *   302 到登录页             -> 需要凭据，命令行拿不到数
 */

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 关键词用来判断「这条搜索真的返回了结果页」，而不是一个空壳 */
const KEYWORD = "topps";

const TARGETS = [
    {
        name: "ebay-sold",
        note: "eBay 已成交（点开需要账号，命令行只看得到搜索页）",
        url: "https://www.ebay.com/sch/i.html?_nkw=2025-26+topps+basketball+hobby+box&LH_Sold=1&LH_Complete=1",
    },
    { name: "ebay-home", note: "eBay 首页", url: "https://www.ebay.com/" },
    { name: "130point", note: "eBay 已成交聚合（POST 才出结果）", url: "https://130point.com/" },
    {
        name: "pricecharting",
        note: "PriceCharting 价格库",
        url: "https://www.pricecharting.com/search-products?q=2025-26+topps+basketball&type=prices",
    },
    { name: "cardladder", note: "Card Ladder（需订阅）", url: "https://www.cardladder.com/" },
    { name: "psacard-apr", note: "PSA 成交价格库", url: "https://www.psacard.com/auctionprices" },
    { name: "beckett", note: "Beckett 价格指南（多为会员内容）", url: "https://www.beckett.com/" },
    { name: "comc", note: "COMC 在售挂牌价", url: "https://www.comc.com/" },
    {
        name: "blowoutcards",
        note: "北美零售商，盒价按美元标",
        url: "https://www.blowoutcards.com/catalogsearch/result/?q=topps+basketball",
    },
    { name: "dacardworld", note: "北美零售商", url: "https://www.dacardworld.com/" },
    { name: "steelcity", note: "北美零售商", url: "https://www.steelcitycollectibles.com/" },
    { name: "sportscardspro", note: "卡片价格库", url: "https://www.sportscardspro.com/" },
    { name: "tcdb", note: "TCDB 卡片数据库（无价格）", url: "https://www.tcdb.com/" },
    { name: "cardhobby", note: "卡淘，国内卡牌交易平台", url: "https://www.cardhobby.com.cn/" },
    { name: "taobao", note: "淘宝搜索（盒价 RMB）", url: "https://s.taobao.com/search?q=topps%20%E7%AF%AE%E7%90%83%E5%8D%A1%E7%9B%92" },
    { name: "dewu", note: "得物", url: "https://www.dewu.com/" },
    {
        name: "yahoo-auction-jp",
        note: "日本雅虎拍卖（有成交价）",
        url: "https://auctions.yahoo.co.jp/search/search?p=topps+basketball",
    },
    {
        name: "mercari-jp",
        note: "日本煤炉（在售价）",
        url: "https://jp.mercari.com/search?keyword=topps%20basketball",
    },
    { name: "stockx", note: "StockX", url: "https://stockx.com/search?s=topps%20basketball" },
    { name: "topps", note: "Topps 官网（已知 403）", url: "https://www.topps.com/" },
    { name: "xcdn-checklistinsider", note: "对照组：已知可用", url: "https://xcdn.checklistinsider.com/" },

    // ---- 第二批：亚洲平台 + 汇率 ----
    {
        name: "blowoutcards-home",
        note: "北美零售商首页（上一批搜索页只有 212 字节，可疑）",
        url: "https://www.blowoutcards.com/",
    },
    {
        name: "ruten-tw",
        note: "台湾露天拍卖（盒价按新台币标）",
        url: "https://www.ruten.com.tw/search?q=topps%20%E7%B1%83%E7%90%83",
    },
    { name: "shopee-tw", note: "台湾虾皮", url: "https://shopee.tw/search?keyword=topps" },
    {
        name: "jd",
        note: "京东搜索",
        url: "https://search.jd.com/Search?keyword=topps%E7%AF%AE%E7%90%83%E5%8D%A1",
    },
    { name: "goofish", note: "闲鱼网页版", url: "https://www.goofish.com/search?q=topps" },
    { name: "zhuanzhuan", note: "转转", url: "https://www.zhuanzhuan.com/" },
    { name: "7788", note: "7788 收藏品交易", url: "https://www.7788.com/" },
    {
        name: "carousell-hk",
        note: "Carousell 香港",
        url: "https://www.carousell.com.hk/search/topps",
    },
    {
        name: "fx-er-api",
        note: "汇率：无需密钥的公开接口",
        url: "https://open.er-api.com/v6/latest/USD",
        keyword: "cny",
    },
    {
        name: "fx-frankfurter",
        note: "汇率：Frankfurter",
        url: "https://api.frankfurter.app/latest?from=USD&to=CNY",
        keyword: "cny",
    },
    {
        name: "fx-boc",
        note: "汇率：中国银行外汇牌价（人民币口径最权威）",
        url: "https://www.boc.cn/sourcedb/whpj/",
        keyword: "美元",
    },
];

const filters = process.argv.slice(2).filter((item) => !item.startsWith("-"));

const probe = async (target) => {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(target.url, {
            redirect: "follow",
            signal: controller.signal,
            headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        });
        const body = await response.text();
        const hit = body.toLowerCase().includes((target.keyword ?? KEYWORD).toLowerCase());
        return {
            name: target.name,
            note: target.note,
            url: target.url,
            status: response.status,
            finalUrl: response.url,
            bytes: body.length,
            hit,
            ms: Date.now() - started,
        };
    } catch (error) {
        return {
            name: target.name,
            note: target.note,
            url: target.url,
            status: error.name === "AbortError" ? "超时" : `失败 ${error.cause?.code ?? error.name}`,
            finalUrl: "",
            bytes: 0,
            hit: false,
            ms: Date.now() - started,
        };
    } finally {
        clearTimeout(timer);
    }
};

const chosen = filters.length
    ? TARGETS.filter((target) => filters.some((item) => target.name.includes(item)))
    : TARGETS;

const results = await Promise.all(chosen.map(probe));

for (const row of results) {
    const status = String(row.status);
    const mark = status === "200" ? (row.hit ? "可用" : "空壳") : "不通";
    console.log(
        `${row.name.padEnd(22)} ${status.padEnd(10)} ${String(row.bytes).padStart(7)} 字节  ` +
            `${String(row.ms).padStart(6)}ms  ${mark}  关键词命中=${row.hit ? "是" : "否"}`,
    );
    console.log(`   ${row.note}`);
    if (row.finalUrl && row.finalUrl !== row.url) console.log(`   落点 ${row.finalUrl}`);
}
