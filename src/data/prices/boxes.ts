/**
 * 盒型购入价登记表（RMB）。
 *
 * 每个线上盒型一条。价格口径以**发行商官方发售价**为准（俗称「原价卡盒」）：
 * 官方公布的美元发售价按登记汇率折成 RMB，美元原值留在 msrpUsd 里备查，
 * 不做隐含换算。官方没公布过发售价的盒型退回公开零售报价，用 basis 标出口径。
 *
 * 来源站点 key 与 sources/prices/README.md 的站点表对应；可信度见 types.ts 的
 * PriceConfidence —— 本机可访问并能逐字读到的只有卡淘与系列指南页。
 *
 * 改价的正确姿势：改数字 + 同步 asOf + 把 note 里的口径说清楚。
 */
import type { BoxPriceEntry, PriceSourceInfo } from "./types";

/** 价格记录的基准日期：整张表最后一次核对的时间 */
export const PRICE_AS_OF = "2026-10-01";

/** 汇率口径：USD -> CNY，来源见 PRICE_SOURCES 里的 fx 条目 */
export const USD_CNY = 7.2;

/** 查价站点实测记录（与 sources/prices/README.md 一一对应） */
export const PRICE_SOURCES: PriceSourceInfo[] = [
    {
        key: "cardhobby",
        name: "卡淘",
        url: "https://www.cardhobby.com.cn/",
        kind: "market",
        reachable: true,
        note: "本机可访问。检索结果其实由 JSON 接口返回，已用它标定系列系数，口径见 sources/prices/README.md",
    },
    {
        key: "boc",
        name: "中国银行外汇牌价",
        url: "https://www.boc.cn/sourcedb/whpj/",
        kind: "fx",
        reachable: true,
        note: "人民币口径的汇率参考",
    },
    {
        key: "er-api",
        name: "ExchangeRate-API 公开端点",
        url: "https://open.er-api.com/v6/latest/USD",
        kind: "fx",
        reachable: true,
        note: "折算用的实时汇率",
    },
    {
        key: "checklistinsider",
        name: "Checklist Insider 系列指南",
        url: "https://www.checklistinsider.com/",
        kind: "index",
        reachable: true,
        note: "本机可访问。每个系列的指南页逐盒型记下 Topps 预售与发售日的官方价，是本机唯一能读到官方发售价的来源",
    },
    {
        key: "topps-retail",
        name: "Topps 官网 / 北美零售公开报价",
        url: "https://www.topps.com/",
        kind: "index",
        reachable: true,
        note: "官网在真实浏览器里可达，但在售盒型基本都写着售罄、已下架商品整页不含价格，只能靠公开报价；零售商站点仍有人机验证",
    },
];

/** 官方发售价口径：美元原价折成 RMB，原值与口径一起留下 */
const entry = (
    boxKey: string,
    msrpUsd: number,
    note: string,
    confidence: BoxPriceEntry["confidence"] = "verified",
): BoxPriceEntry => ({
    boxKey,
    cost: Math.round(msrpUsd * USD_CNY),
    basis: "msrp",
    msrpUsd,
    source: "checklistinsider",
    asOf: PRICE_AS_OF,
    confidence,
    note,
});

/** 官方没公布过发售价的盒型：退回公开零售报价，口径用 basis 标出来 */
const retailEntry = (
    boxKey: string,
    cost: number,
    note: string,
    confidence: BoxPriceEntry["confidence"] = "reference",
): BoxPriceEntry => ({
    boxKey,
    cost,
    basis: "retail",
    source: "topps-retail",
    asOf: PRICE_AS_OF,
    confidence,
    note,
});

/** 全部盒型的购入价 */
export const BOX_PRICES: BoxPriceEntry[] = [
    /* 2025-26 Topps Chrome Updates Basketball */
    entry("basketball.topps.tcu26-basketball.hobby-box", 549.99, "发售日官方价，每盒 1 张签名"),
    entry("basketball.topps.tcu26-basketball.jumbo-box", 1099.99, "发售日官方价，每盒 3 张签名"),
    entry("basketball.topps.tcu26-basketball.value-box", 44.99, "零售盒型的官方价"),
    entry("basketball.topps.tcu26-basketball.mega-box", 84.99, "预售官方价"),

    /* 2025-26 Topps Chrome Cactus Jack Basketball */
    entry("basketball.topps.tccj26-basketball.hobby-box", 499.99, "发售日官方价；联名款定量少，官方渠道按抽签发售"),

    /* 2025-26 Topps Cosmic Chrome Basketball */
    entry("basketball.topps.tcosmic26-basketball.hobby-box", 579.99, "预售官方价；官方渠道按抽签发售"),

    /* 2025-26 Topps 3 Basketball */
    entry("basketball.topps.tthree26-basketball.hobby-box", 999.99, "会员预售官方价；单包盒型、张张带限量"),

    /* 2025-26 Topps Finest Basketball */
    entry("basketball.topps.tfinest26-basketball.hobby-box", 499.99, "发售日官方价，每盒 2 张签名"),
    retailEntry(
        "basketball.topps.tfinest26-basketball.breaker-delight-box",
        3240,
        "官方未公布该盒型的发售价，沿用公开零售报价折算",
    ),

    /* 2025-26 Topps Signature Class Basketball */
    entry("basketball.topps.tsig26-basketball.hobby-box", 549.99, "发售日官方价，每盒 2 张签名"),
    entry("basketball.topps.tsig26-basketball.hobby-jumbo-box", 899.99, "预售官方价，每盒 4 张签名"),
    entry("basketball.topps.tsig26-basketball.value-blaster-box", 34.99, "零售盒型的官方价"),
    entry("basketball.topps.tsig26-basketball.mega-box", 64.99, "零售盒型的官方价"),

    /* 2025-26 Topps Basketball（旗舰） */
    entry("basketball.topps.tbb26-basketball.tbb26-hobby", 119.99, "发售日官方价"),
    entry("basketball.topps.tbb26-basketball.tbb26-hobby-jumbo", 229.99, "预售官方价"),
    entry("basketball.topps.tbb26-basketball.tbb26-mega", 49.99, "预售官方价"),
    entry("basketball.topps.tbb26-basketball.tbb26-value-box", 24.99, "预售官方价"),

    /* 2025-26 Topps Hoops Basketball */
    entry("basketball.topps.thoops26-basketball.thoops26-hobby", 279.99, "发售日官方价，每盒 1 张签名"),
    entry("basketball.topps.thoops26-basketball.thoops26-hobby-jumbo", 519.99, "预售官方价，每盒 2 张签名"),
    entry("basketball.topps.thoops26-basketball.thoops26-value-box", 34.99, "预售官方价"),
    retailEntry(
        "basketball.topps.thoops26-basketball.thoops26-hanger",
        85,
        "官方未公布该盒型的发售价，按同系列零售盒型的相对规格估算",
        "estimate",
    ),
    entry("basketball.topps.thoops26-basketball.thoops26-fanatics", 39.99, "渠道专供盒型的官方价"),
];
