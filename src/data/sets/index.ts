/**
 * 盒型总装入口。
 *
 * 这是唯一需要手工维护的「内容清单」：新增一个品类 / 发行商 / 系列 / 盒型时，
 * 在这里加一行 import 并把它拼进 registerBoxes() 即可。
 *
 * 目录约定：
 *   data/sets/<category>/<maker>/<product-key>/
 *       roster.ts  名单（可选）
 *       box.ts     盒型与配率数据
 *       index.ts   出口
 *
 * 注册后 src/catalog 会自动推导出站点目录（分类 -> 发行商 -> 系列 -> 盒型），
 * 前端不需要为任何具体盒型写死代码。
 */
import { registerBoxes } from "@/catalog/registry";
import type { BoxDefinition } from "@/engine/types";

import { TCCJ26_BASKETBALL_BOXES } from "./basketball/topps/tccj26-basketball";
import { TCOSMIC26_BASKETBALL_BOXES } from "./basketball/topps/tcosmic26-basketball";
import { TFINEST26_BASKETBALL_BOXES } from "./basketball/topps/tfinest26-basketball";
import { TSIG26_BASKETBALL_BOXES } from "./basketball/topps/tsig26-basketball";
import { TBB26_BASKETBALL_BOXES } from "./basketball/topps/tbb26-basketball";
import { THOOPS26_BASKETBALL_BOXES } from "./basketball/topps/thoops26-basketball";
import { TTHREE26_BASKETBALL_BOXES } from "./basketball/topps/tthree26-basketball";
import { TCU26_BASKETBALL_BOXES } from "./basketball/topps/tcu26-basketball";

/** 全部已实现的盒型 */
export const REGISTERED_BOXES: BoxDefinition[] = registerBoxes([
    ...TCU26_BASKETBALL_BOXES,
    ...TCCJ26_BASKETBALL_BOXES,
    ...TCOSMIC26_BASKETBALL_BOXES,
    ...TTHREE26_BASKETBALL_BOXES,
    ...TFINEST26_BASKETBALL_BOXES,
    ...TSIG26_BASKETBALL_BOXES,
    ...TBB26_BASKETBALL_BOXES,
    ...THOOPS26_BASKETBALL_BOXES,
]);
