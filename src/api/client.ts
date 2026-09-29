/**
 * 后端 API 客户端。
 *
 * 线上：同域 /api/*（Cloudflare Pages Functions）
 * 本地：`npm run dev:cf` 会启动 wrangler，同样走 /api/*；
 *       只跑 `npm run dev` 时后端不可用，前端会自动降级为「本地模式」。
 */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

let backendAvailable: boolean | null = null;

export const backendState = (): boolean | null => backendAvailable;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    let response: Response;
    try {
        response = await fetch(`${BASE}/api/${path}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            ...init,
        });
    } catch {
        backendAvailable = false;
        throw new ApiError("无法连接服务器（本地开发请使用 npm run dev:cf）", 0);
    }

    backendAvailable = true;

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        const message =
            payload && typeof payload === "object" && "error" in payload
                ? String((payload as { error: unknown }).error)
                : `请求失败（${response.status}）`;
        throw new ApiError(message, response.status);
    }

    return payload as T;
};

export interface ApiUser {
    id: number;
    email: string;
    displayName: string;
    createdAt: string;
}

/** 服务端统计切片：按品类 / 发行商 / 盒型下钻，不传则不限制 */
export interface StatsFilter {
    category?: string;
    maker?: string;
    box?: string;
}

const queryString = (filter?: StatsFilter, extra?: Record<string, string | number>): string => {
    const params = new URLSearchParams();
    if (filter?.category) params.set("category", filter.category);
    if (filter?.maker) params.set("maker", filter.maker);
    if (filter?.box) params.set("box", filter.box);
    for (const [key, value] of Object.entries(extra ?? {})) params.set(key, String(value));
    const text = params.toString();
    return text ? `?${text}` : "";
};

/** 一个卡种的本次拆出情况；subsetKey / tier 用于服务端按维度切片 */
export interface VariantTally {
    count: number;
    subsetKey: string;
    tier: string;
}

export interface BreakPayload {
    boxKey: string;
    /** 维度冗余字段，便于服务端在任意维度上做切片统计 */
    categoryKey: string;
    makerKey: string;
    productKey: string;
    seed: string;
    cardCount: number;
    byTier: Record<string, number>;
    bySubset: Record<string, number>;
    byVariant: Record<string, VariantTally>;
    best: {
        variantKey: string;
        player: string;
        tier: string;
        odds: number;
    } | null;
}

/** 一行拆盒记录（stats 的 recent / rarest 列表使用） */
export interface BreakRow {
    box_key: string;
    category_key: string;
    maker_key: string;
    seed: string;
    best_player: string | null;
    best_tier: string | null;
    best_variant: string | null;
    best_odds: number | null;
    created_at: string;
}

/** GET /api/breaks 返回的一条拆盒记录；数据全部来自 D1 的 breaks 表 */
export interface BreakRecord {
    id: number;
    boxKey: string;
    categoryKey: string;
    makerKey: string;
    productKey: string;
    seed: string;
    cardCount: number;
    byTier: Record<string, number>;
    bySubset: Record<string, number>;
    best: {
        variantKey: string;
        player: string;
        tier: string;
        odds: number;
    } | null;
    createdAt: string;
}

/** 按维度聚合的一行 */
export interface DimensionRow {
    boxes: number;
    cards: number;
}

export interface UserStats {
    boxes: number;
    cards: number;
    byBox: (DimensionRow & { box_key: string; category_key: string; maker_key: string; product_key: string })[];
    byCategory: (DimensionRow & { category_key: string })[];
    byMaker: (DimensionRow & { maker_key: string })[];
    byTier: { tier: string; total: number }[];
    bySubset: { subset_key: string; total: number }[];
    recent: BreakRow[];
    rarest: BreakRow[];
}

export interface GlobalStats {
    users: number;
    boxes: number;
    cards: number;
    byTier: { tier: string; total: number }[];
    bySubset: { subset_key: string; total: number }[];
    byBox: (DimensionRow & { box_key: string })[];
    byCategory: (DimensionRow & { category_key: string })[];
    byMaker: (DimensionRow & { maker_key: string })[];
}

/** D1 里目录镜像的规模（由 /api/global 返回，用于对账） */
export interface CatalogCounts {
    categories: number;
    makers: number;
    products: number;
    boxes: number;
    subsets: number;
    variants: number;
}

/** 目录同步负载：由 src/catalog/db.ts 从 TS 目录生成 */
export interface CatalogPayload {
    app: { key: string; name: string; host: string; description: string };
    categories: {
        key: string;
        name: string;
        nameEn: string;
        icon: string;
        tagline: string;
        order: number;
        live: boolean;
    }[];
    makers: { categoryKey: string; key: string; name: string; nameEn: string; order: number; live: boolean }[];
    products: {
        key: string;
        categoryKey: string;
        makerKey: string;
        name: string;
        releaseDate: string | null;
        order: number;
        live: boolean;
        note: string;
    }[];
    boxes: {
        key: string;
        productKey: string;
        categoryKey: string;
        makerKey: string;
        slug: string;
        name: string;
        cardsPerPack: number;
        packsPerBox: number;
        boxesPerCase: number;
        autoGuaranteed: boolean;
        live: boolean;
        order: number;
    }[];
    subsets: {
        boxKey: string;
        key: string;
        name: string;
        code: string | null;
        kind: string;
        detailed: boolean;
        inBox: boolean;
        order: number;
        subjectCount: number;
    }[];
    variants: {
        boxKey: string;
        key: string;
        subsetKey: string;
        name: string;
        fullName: string;
        groupKind: string;
        tier: string;
        odds: number;
        numbered: number | null;
        weight: number;
    }[];
}

export const api = {
    register: (email: string, password: string) =>
        request<{ ok: true; user: ApiUser }>("auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    login: (email: string, password: string) =>
        request<{ ok: true; user: ApiUser }>("auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    logout: () => request<{ ok: true }>("auth/logout", { method: "POST" }),

    me: () => request<{ ok: true; user: ApiUser | null }>("me"),

    /** 站点元信息（后端能力开关） */
    config: () =>
        request<{
            ok: true;
            app: string;
            features: { leaderboard: boolean; globalStats: boolean; catalogSync: boolean };
        }>("config"),

    stats: (filter?: StatsFilter) =>
        request<{ ok: true; user: ApiUser | null; stats: UserStats | null }>(
            `stats${queryString(filter)}`,
        ),

    recordBreak: (payload: BreakPayload) =>
        request<{ ok: true }>("break", { method: "POST", body: JSON.stringify(payload) }),

    /** 我的拆盒记录（需登录）。全部数据存在 D1，前端不再保留本地历史 */
    breaks: (filter?: StatsFilter, limit = 20, offset = 0) =>
        request<{
            ok: true;
            user: ApiUser;
            total: number;
            limit: number;
            offset: number;
            breaks: BreakRecord[];
        }>(`breaks${queryString(filter, { limit, offset })}`),

    clearBreaks: () => request<{ ok: true }>("break", { method: "DELETE" }),

    leaderboard: (filter?: StatsFilter) =>
        request<{
            ok: true;
            leaderboard: { display_name: string; boxes: number; cards: number; best_odds: number | null }[];
        }>(`leaderboard${queryString(filter)}`),

    global: (filter?: StatsFilter) =>
        request<{ ok: true; global: GlobalStats; catalog: CatalogCounts }>(
            `global${queryString(filter)}`,
        ),

    /** 目录镜像（对账用，需要后端已同步过） */
    catalog: (box?: string) =>
        request<{ ok: true; schemaVersion: string | null } & Record<string, unknown>>(
            `catalog${box ? `?box=${encodeURIComponent(box)}` : ""}`,
        ),

    /** 把 TS 目录镜像进 D1；需要 CE_SYNC_TOKEN */
    syncCatalog: (payload: CatalogPayload, token: string) =>
        request<{ ok: true; synced: Record<string, number> }>("catalog/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-sync-token": token },
            body: JSON.stringify(payload),
        }),
};
