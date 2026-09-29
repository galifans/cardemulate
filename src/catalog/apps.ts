/**
 * 站点（app）注册表。
 *
 * 数据库里的 users 是全局的（一套账号可以登录所有站点），
 * 而 breaks / pull_stats 都带 app 字段，因此不同站点的拆盒数据互不干扰。
 * 新增一个站点：在这里加一条，然后新建一个 Pages 项目并把环境变量
 * CE_APP 设成对应的 key 即可，数据库结构不需要动。
 */
import type { AppDef } from "./types";

export const APPS: AppDef[] = [
    {
        key: "cardemulate",
        name: "CardEmulate",
        host: "cardemulate.wikiandroid.com",
        description: "电子卡牌拆包模拟器：按盒拆卡、配率与 checklist、个人与全站统计。",
        current: true,
    },
];

/** 当前站点 key。如需多站点共用一份代码，可用构建时的 VITE_APP_KEY 覆盖。 */
const envApp =
    typeof import.meta !== "undefined"
        ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_KEY
        : undefined;

export const APP_KEY = envApp && APPS.some((a) => a.key === envApp) ? envApp : APPS[0].key;

export const CURRENT_APP: AppDef =
    APPS.find((a) => a.key === APP_KEY) ?? APPS[0];
