/**
 * 卡淘成交价采集 —— 为卡价模型标定与验算提供原始样本。
 *
 * 为什么单独有个脚本
 * ----------------
 * 卡价模型的每个系数都是标定值，标定值必须能复核。这个脚本把「怎么取得样本」
 * 固定下来：同一个检索接口、同一个过滤口径、同一份输出格式，换时间重跑即可
 * 得到新样本，不用重新推敲取数方式。
 *
 * 接口
 * ----
 * GET https://www.cardhobby.com.cn/NewCommodity/SearchCommodity
 *     ?userId=&pageIndex=N&pageSize=60
 *     &searchKey=<关键词，子串匹配标题>
 *     &searchJson=[{"Key":"Status","Value":-2}]   -2 = 已售出，1 = 出售中
 *     &sort=EffectiveTimeStamp&sortType=DESC
 * 需要浏览器 UA 与 Referer。响应是 JSON，`data.PagedMarketItemList` 是记录数组：
 *   Title          标题（关键词堆砌，没有结构化的卡种 / 平行 / 限量字段）
 *   LowestPrice    成交价（RMB）。同一条记录里 Price 恒为 "1.00"，不是价格
 *   PriceCount     出价次数
 *   EffectiveDate  成交时间
 * 注意：`data.Total` 与真实可翻页深度对不上（实测 Topps Chrome Update 报 3037，
 * 但第 400 页仍返回记录），所以脚本按「连续多少页没有新条目」判停，不信 Total。
 *
 * 用法
 * ----
 *   node scripts/scrape-card-sales.mjs                     # 默认系列，最多 80 页/关键词
 *   node scripts/scrape-card-sales.mjs --pages 20          # 快速冒烟
 *   node scripts/scrape-card-sales.mjs --out .snapshot/x.jsonl
 *   node scripts/scrape-card-sales.mjs --keys "Topps Finest,Cosmic Chrome"
 */
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const REFERER = "https://www.cardhobby.com.cn/market/search?searchtype=1";
const PAGE_SIZE = 60;
const SLEEP_MS = 320;

/**
 * 在册系列的检索词。注意检索是标题**子串**匹配，不是分词，
 * 所以一个系列要给几个写法：卖家写 "TCU"、"Chrome Update"、"Topps Chrome" 的都有。
 * 命中多个关键词的记录靠 ID 去重。
 */
export const SERIES_KEYWORDS = {
    "tcu26-basketball": ["Topps Chrome Update", "Chrome Update"],
    "tfinest26-basketball": ["Topps Finest"],
    "tcosmic26-basketball": ["Cosmic Chrome"],
    "tsig26-basketball": ["Signature Class"],
    "thoops26-basketball": ["NBA Hoops"],
    "tccj26-basketball": ["Cactus Jack"],
    "tthree26-basketball": ["Topps Three"],
    "tbb26-basketball": ["Topps Basketball"],
};

const sleep = (ms) => new Promise((s) => setTimeout(s, ms));

export async function searchSold(keyword, pageIndex, retries = 3) {
    const url =
        "https://www.cardhobby.com.cn/NewCommodity/SearchCommodity?userId=&pageIndex=" +
        pageIndex +
        "&pageSize=" +
        PAGE_SIZE +
        "&searchKey=" +
        encodeURIComponent(keyword) +
        "&searchJson=" +
        encodeURIComponent(JSON.stringify([{ Key: "Status", Value: -2 }])) +
        "&sort=EffectiveTimeStamp&sortType=DESC";
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { "user-agent": UA, referer: REFERER },
                signal: AbortSignal.timeout(25000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return json.data?.PagedMarketItemList ?? [];
        } catch (err) {
            if (attempt > retries) throw err;
            await sleep(1500 * attempt);
        }
    }
}

/** 一条成交记录里模型用得上的字段 */
export function pickRow(row, keyword) {
    const price = Number(row.LowestPrice);
    if (!Number.isFinite(price)) return null;
    return {
        id: row.ID,
        keyword,
        title: row.Title,
        price,
        bids: Number(row.PriceCount) || 0,
        soldAt: row.EffectiveDate,
        seller: row.SellRealName ?? null,
    };
}

async function main() {
    const argv = process.argv.slice(2);
    const argOf = (name, fallback) => {
        const i = argv.indexOf(`--${name}`);
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
    };
    const maxPages = Number(argOf("pages", 80));
    const out = argOf("out", ".snapshot/card-sales.jsonl");
    const onlyKeys = argOf("keys", "");
    const keywords = onlyKeys
        ? onlyKeys.split(",").map((s) => s.trim())
        : Object.values(SERIES_KEYWORDS).flat();

    await mkdir(dirname(out), { recursive: true });
    const stream = createWriteStream(out, { encoding: "utf8" });
    const seen = new Set();
    let written = 0;

    for (const keyword of keywords) {
        let barren = 0;
        let fromKeyword = 0;
        for (let page = 1; page <= maxPages && barren < 3; page++) {
            let rows;
            try {
                rows = await searchSold(keyword, page);
            } catch (err) {
                console.log(`  [跳过] ${keyword} 第 ${page} 页：${String(err.message ?? err)}`);
                break;
            }
            if (rows.length === 0) break;
            let fresh = 0;
            for (const row of rows) {
                const picked = pickRow(row, keyword);
                if (!picked || seen.has(picked.id)) continue;
                seen.add(picked.id);
                fresh += 1;
                written += 1;
                stream.write(JSON.stringify(picked) + "\n");
            }
            fromKeyword += fresh;
            barren = fresh === 0 ? barren + 1 : 0;
            if (page % 20 === 0) console.log(`  ${keyword} 第 ${page} 页，累计新增 ${fromKeyword}`);
            await sleep(SLEEP_MS);
        }
        console.log(`${keyword.padEnd(22)} 新增 ${String(fromKeyword).padStart(6)} 条（累计 ${written}）`);
        if (fromKeyword === 0) console.log(`  提示：该关键词没有新样本，可能是检索词写法不对`);
    }

    await new Promise((resolve) => stream.end(resolve));
    console.log(`\n写入 ${written} 条 -> ${out}`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("scrape-card-sales.mjs")) {
    await main();
}
