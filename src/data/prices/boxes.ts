/**
 * 盒型购入价登记表（RMB）。
 *
 * 每个线上盒型一条。价格口径是「国内到手价」：海外公开零售价按当天汇率折算，
 * 已经把这层口径写进 note 里，不做隐含换算。
 *
 * 来源站点 key 与 sources/prices/README.md 的站点表对应；可信度见 types.ts 的
 * PriceConfidence —— 本机能实测的只有卡淘，其余是公开零售报价，属 reference。
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
        key: "topps-retail",
        name: "Topps / 北美零售公开报价",
        url: "https://www.topps.com/",
        kind: "index",
        reachable: false,
        note: "官网与主要零售商本机均被拦截，价格只能引用公开报价，无法复核",
    },
];

const entry = (
    boxKey: string,
    cost: number,
    note: string,
    confidence: BoxPriceEntry["confidence"] = "reference",
    source = "topps-retail",
): BoxPriceEntry => ({ boxKey, cost, source, asOf: PRICE_AS_OF, confidence, note });

/** 全部盒型的购入价 */
export const BOX_PRICES: BoxPriceEntry[] = [
    /* 2025-26 Topps Chrome Updates Basketball */
    entry("basketball.topps.tcu26-basketball.hobby-box", 1380, "北美公开零售价折算，每盒 1 张签名"),
    entry("basketball.topps.tcu26-basketball.jumbo-box", 2500, "北美公开零售价折算，每盒 3 张签名"),
    entry("basketball.topps.tcu26-basketball.value-box", 145, "北美公开零售价折算"),
    entry("basketball.topps.tcu26-basketball.mega-box", 330, "北美公开零售价折算"),

    /* 2025-26 Topps Chrome Cactus Jack Basketball */
    entry("basketball.topps.tccj26-basketball.hobby-box", 2600, "联名款定量少，公开价长期高于同规格普通盒"),

    /* 2025-26 Topps Cosmic Chrome Basketball */
    entry("basketball.topps.tcosmic26-basketball.hobby-box", 1600, "北美公开零售价折算"),

    /* 2025-26 Topps 3 Basketball */
    entry("basketball.topps.tthree26-basketball.hobby-box", 2200, "单包盒型、张张带限量，公开价按高端盒型口径登记"),

    /* 2025-26 Topps Finest Basketball */
    entry("basketball.topps.tfinest26-basketball.hobby-box", 1580, "北美公开零售价折算"),
    entry("basketball.topps.tfinest26-basketball.breaker-delight-box", 3240, "直播专用盒型，北美公开零售价折算"),

    /* 2025-26 Topps Signature Class Basketball */
    entry("basketball.topps.tsig26-basketball.hobby-box", 1300, "北美公开零售价折算"),
    entry("basketball.topps.tsig26-basketball.hobby-jumbo-box", 2500, "北美公开零售价折算"),
    entry("basketball.topps.tsig26-basketball.value-blaster-box", 215, "北美公开零售价折算"),
    entry("basketball.topps.tsig26-basketball.mega-box", 500, "北美公开零售价折算"),

    /* 2025-26 Topps Basketball（旗舰） */
    entry("basketball.topps.tbb26-basketball.tbb26-hobby", 1080, "北美公开零售价折算"),
    entry("basketball.topps.tbb26-basketball.tbb26-hobby-jumbo", 2160, "北美公开零售价折算"),
    entry("basketball.topps.tbb26-basketball.tbb26-mega", 430, "北美公开零售价折算"),
    entry("basketball.topps.tbb26-basketball.tbb26-value-box", 240, "北美公开零售价折算"),

    /* 2025-26 Topps Hoops Basketball */
    entry("basketball.topps.thoops26-basketball.thoops26-hobby", 860, "北美公开零售价折算"),
    entry("basketball.topps.thoops26-basketball.thoops26-hobby-jumbo", 1800, "北美公开零售价折算"),
    entry("basketball.topps.thoops26-basketball.thoops26-value-box", 180, "北美公开零售价折算"),
    entry("basketball.topps.thoops26-basketball.thoops26-hanger", 85, "北美公开零售价折算"),
    entry("basketball.topps.thoops26-basketball.thoops26-fanatics", 290, "渠道专供盒型，北美公开零售价折算"),
];
