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

import { TCU26_BASKETBALL_BOXES } from "./basketball/topps/tcu26-basketball";

/** 全部已实现的盒型 */
export const REGISTERED_BOXES: BoxDefinition[] = registerBoxes([...TCU26_BASKETBALL_BOXES]);
