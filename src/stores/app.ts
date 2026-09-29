/**
 * 全局状态（组合式函数，不引入状态管理库）。
 *
 * 登录态 + 本地拆盒历史。拆盒历史同时保存在 localStorage，
 * 这样未登录 / 后端不可用时也能看到自己的统计。
 */

import { computed, reactive, readonly } from "vue";
import {
    api,
    ApiError,
    type ApiUser,
    type StatsFilter,
    type UserStats,
    type VariantTally,
} from "../api/client";
import type { BoxDefinition } from "../engine/types";
import type { RipResult } from "../engine/rip";

const HISTORY_KEY = "cardemulate.history.v1";
const MAX_LOCAL_HISTORY = 200;

export interface LocalBreak {
    boxKey: string;
    boxName: string;
    /** 维度冗余字段，和 D1 里 breaks 表的列一一对应，便于本地也做切片统计 */
    categoryKey: string;
    makerKey: string;
    productKey: string;
    seed: string;
    cardCount: number;
    byTier: Record<string, number>;
    bySubset: Record<string, number>;
    byVariant: Record<string, VariantTally>;
    best: { variantKey: string; fullName: string; player: string; tier: string; odds: number } | null;
    createdAt: string;
}

interface State {
    user: ApiUser | null;
    ready: boolean;
    busy: boolean;
    error: string;
    info: string;
    history: LocalBreak[];
    serverStats: UserStats | null;
}

const state = reactive<State>({
    user: null,
    ready: false,
    busy: false,
    error: "",
    info: "",
    history: [],
    serverStats: null,
});

const loadHistory = (): LocalBreak[] => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as LocalBreak[]) : [];
    } catch {
        return [];
    }
};

const saveHistory = (): void => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, MAX_LOCAL_HISTORY)));
    } catch {
        /* 容量不足时忽略 */
    }
};

const clearMessages = (): void => {
    state.error = "";
    state.info = "";
};

const refreshSession = async (): Promise<void> => {
    try {
        const result = await api.me();
        state.user = result.user;
    } catch {
        state.user = null;
    } finally {
        state.ready = true;
    }
};

const register = async (email: string, password: string): Promise<boolean> => {
    clearMessages();
    state.busy = true;
    try {
        const result = await api.register(email, password);
        state.user = result.user;
        state.info = "注册成功，拆盒记录将自动同步到云端。";
        await loadServerStats();
        return true;
    } catch (error) {
        state.error = error instanceof ApiError ? error.message : "注册失败";
        return false;
    } finally {
        state.busy = false;
    }
};

const login = async (email: string, password: string): Promise<boolean> => {
    clearMessages();
    state.busy = true;
    try {
        const result = await api.login(email, password);
        state.user = result.user;
        state.info = `欢迎回来，${result.user.displayName}。`;
        await loadServerStats();
        return true;
    } catch (error) {
        state.error = error instanceof ApiError ? error.message : "登录失败";
        return false;
    } finally {
        state.busy = false;
    }
};

const logout = async (): Promise<void> => {
    clearMessages();
    try {
        await api.logout();
    } catch {
        /* 忽略 */
    }
    state.user = null;
    state.serverStats = null;
    state.info = "已退出登录。";
};

const loadServerStats = async (filter?: StatsFilter): Promise<void> => {
    if (!state.user) {
        state.serverStats = null;
        return;
    }
    try {
        const result = await api.stats(filter);
        state.serverStats = result.stats;
    } catch {
        state.serverStats = null;
    }
};

/** 把一次拆盒结果写进本地历史，并在登录状态下同步到云端 */
const recordBreak = async (box: BoxDefinition, result: RipResult): Promise<void> => {
    // 卡种带上子集与稀有度：服务端 pull_stats 靠这两个字段做维度切片
    const byVariant: Record<string, VariantTally> = {};
    for (const card of result.cards) {
        const tally = byVariant[card.variantKey] ?? {
            count: 0,
            subsetKey: card.subsetKey,
            tier: card.tier,
        };
        tally.count += 1;
        byVariant[card.variantKey] = tally;
    }

    const entry: LocalBreak = {
        boxKey: box.key,
        boxName: box.name,
        categoryKey: box.category,
        makerKey: box.maker,
        productKey: box.productKey,
        seed: result.seed,
        cardCount: result.cards.length,
        byTier: { ...result.byTier },
        bySubset: { ...result.bySubset },
        byVariant,
        best: result.best
            ? {
                  variantKey: result.best.variantKey,
                  fullName: result.best.fullName,
                  player: result.best.player,
                  tier: result.best.tier,
                  odds: result.best.odds,
              }
            : null,
        createdAt: new Date().toISOString(),
    };

    state.history = [entry, ...state.history].slice(0, MAX_LOCAL_HISTORY);
    saveHistory();

    if (!state.user) return;

    try {
        await api.recordBreak({
            boxKey: box.key,
            categoryKey: box.category,
            makerKey: box.maker,
            productKey: box.productKey,
            seed: result.seed,
            cardCount: result.cards.length,
            byTier: entry.byTier,
            bySubset: entry.bySubset,
            byVariant,
            best: entry.best
                ? {
                      variantKey: entry.best.variantKey,
                      player: entry.best.player,
                      tier: entry.best.tier,
                      odds: entry.best.odds,
                  }
                : null,
        });
        await loadServerStats();
    } catch {
        state.error = "本次拆盒未能同步到云端，已保存在本机。";
    }
};

const clearHistory = async (): Promise<void> => {
    state.history = [];
    saveHistory();
    if (state.user) {
        try {
            await api.clearBreaks();
            await loadServerStats();
        } catch {
            /* 忽略 */
        }
    }
};

/** 本地历史的聚合视图（按盒子 / 品类 / 稀有度 / 子集汇总） */
const localSummary = computed(() => {
    const byBox = new Map<string, { boxKey: string; boxName: string; boxes: number; cards: number }>();
    const byCategory = new Map<string, number>();
    const byTier = new Map<string, number>();
    const bySubset = new Map<string, number>();

    for (const entry of state.history) {
        const current = byBox.get(entry.boxKey) ?? {
            boxKey: entry.boxKey,
            boxName: entry.boxName,
            boxes: 0,
            cards: 0,
        };
        current.boxes += 1;
        current.cards += entry.cardCount;
        byBox.set(entry.boxKey, current);

        const category = entry.categoryKey ?? "";
        byCategory.set(category, (byCategory.get(category) ?? 0) + 1);

        for (const [tier, count] of Object.entries(entry.byTier)) {
            byTier.set(tier, (byTier.get(tier) ?? 0) + count);
        }
        for (const [subset, count] of Object.entries(entry.bySubset)) {
            bySubset.set(subset, (bySubset.get(subset) ?? 0) + count);
        }
    }

    const totalBoxes = state.history.length;
    const totalCards = state.history.reduce((sum, item) => sum + item.cardCount, 0);

    return {
        totalBoxes,
        totalCards,
        byBox: Array.from(byBox.values()).sort((a, b) => b.boxes - a.boxes),
        byCategory: Array.from(byCategory.entries())
            .map(([category_key, boxes]) => ({ category_key, boxes }))
            .sort((a, b) => b.boxes - a.boxes),
        byTier: Array.from(byTier.entries())
            .map(([tier, total]) => ({ tier, total }))
            .sort((a, b) => b.total - a.total),
        bySubset: Array.from(bySubset.entries())
            .map(([subset_key, total]) => ({ subset_key, total }))
            .sort((a, b) => b.total - a.total),
    };
});

const init = async (): Promise<void> => {
    state.history = loadHistory();
    await refreshSession();
    if (state.user) await loadServerStats();
};

export const useAppStore = () => ({
    state: readonly(state),
    localSummary,
    init,
    register,
    login,
    logout,
    recordBreak,
    clearHistory,
    loadServerStats,
    clearMessages,
});
