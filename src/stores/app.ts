/**
 * 全局状态（组合式函数，不引入状态管理库）。
 *
 * 账号 + 云端拆盒记录。拆卡必须登录，所有记录都存在云端 D1，
 * 浏览器不再保存任何拆盒历史；统计页的数据全部来自
 * GET /api/breaks（记录列表）与 GET /api/stats（聚合切片）。
 */

import { computed, reactive, readonly } from "vue";
import {
    api,
    ApiError,
    type ApiUser,
    type BreakRecord,
    type StatsFilter,
    type UserStats,
    type VariantTally,
} from "../api/client";
import type { BoxDefinition } from "../engine/types";
import type { RipResult } from "../engine/rip";
import { boxCostRmb, sumValueRmb } from "../data/prices";

/** 一次拉取多少条拆盒记录；服务端单页上限 100 */
const BREAKS_PAGE_SIZE = 20;

interface State {
    user: ApiUser | null;
    ready: boolean;
    busy: boolean;
    error: string;
    info: string;
    /** 云端拆盒记录（最新在前），未登录时为空数组 */
    breaks: BreakRecord[];
    /** 云端记录总数，可能大于 breaks.length（分页） */
    breakTotal: number;
    /** 云端聚合统计，用于按盒子 / 稀有度 / 子集切片 */
    serverStats: UserStats | null;
}

const state = reactive<State>({
    user: null,
    ready: false,
    busy: false,
    error: "",
    info: "",
    breaks: [],
    breakTotal: 0,
    serverStats: null,
});

const clearMessages = (): void => {
    state.error = "";
    state.info = "";
};

const resetCloud = (): void => {
    state.breaks = [];
    state.breakTotal = 0;
    state.serverStats = null;
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

/** 云端聚合统计（需登录） */
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

/** 拉取云端拆盒记录（需登录）；未登录时清空 */
const loadBreaks = async (): Promise<void> => {
    if (!state.user) {
        resetCloud();
        return;
    }
    try {
        const result = await api.breaks(undefined, BREAKS_PAGE_SIZE, 0);
        state.breaks = result.breaks;
        state.breakTotal = result.total;
    } catch (error) {
        state.breaks = [];
        state.breakTotal = 0;
        state.error = error instanceof ApiError ? error.message : "读取拆盒记录失败";
    }
};

/** 再取一页追加到列表尾部（统计页的「显示更多」） */
const loadMoreBreaks = async (): Promise<void> => {
    if (!state.user || state.breaks.length >= state.breakTotal) return;
    state.busy = true;
    try {
        const result = await api.breaks(undefined, BREAKS_PAGE_SIZE, state.breaks.length);
        state.breaks = [...state.breaks, ...result.breaks];
        state.breakTotal = result.total;
    } catch (error) {
        state.error = error instanceof ApiError ? error.message : "读取拆盒记录失败";
    } finally {
        state.busy = false;
    }
};

const hasMoreBreaks = computed(() => state.breaks.length < state.breakTotal);

/** 登录 / 注册成功后统一把云端数据拉齐 */
const syncAfterAuth = async (): Promise<void> => {
    await Promise.all([loadBreaks(), loadServerStats()]);
};

const register = async (email: string, password: string): Promise<boolean> => {
    clearMessages();
    state.busy = true;
    try {
        const result = await api.register(email, password);
        state.user = result.user;
        state.info = "注册成功，现在可以直接拆卡了。";
        await syncAfterAuth();
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
        await syncAfterAuth();
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
    resetCloud();
    state.info = "已退出登录。";
};

/** 昵称可用性检测的结果；error 表示没问出结果，与「已被占用」是两件事 */
export type NicknameAvailability = "available" | "taken" | "error";

/**
 * 问后端这个昵称能不能用。
 *
 * 这里刻意不写 state.error / state.info：检测是用户随时可能重复点的动作，
 * 提示应该出现在输入框旁边，由调用方自己决定措词与位置。
 */
const checkNickname = async (displayName: string): Promise<NicknameAvailability> => {
    if (!state.user) return "error";
    try {
        const result = await api.checkNickname(displayName);
        return result.available ? "available" : "taken";
    } catch {
        return "error";
    }
};

/**
 * 改昵称（需登录）。
 *
 * 昵称全站唯一，重名由后端拒绝；成功后直接回写 state.user，
 * 头部与排行榜立刻就是新名字。
 */
const updateNickname = async (displayName: string): Promise<boolean> => {
    clearMessages();
    if (!state.user) {
        state.error = "请先登录。";
        return false;
    }
    state.busy = true;
    try {
        const result = await api.updateProfile(displayName);
        state.user = result.user;
        state.info = `昵称已改为 ${result.user.displayName}。`;
        return true;
    } catch (error) {
        state.error = error instanceof ApiError ? error.message : "昵称没能保存，请稍后重试。";
        return false;
    } finally {
        state.busy = false;
    }
};

/**
 * 记录一次拆盒：只写云端。
 * 未登录时直接拒绝 —— 本站没有「本地拆卡」这种玩法。
 */
const recordBreak = async (box: BoxDefinition, result: RipResult): Promise<boolean> => {
    if (!state.user) {
        state.error = "请先登录后再拆卡。";
        return false;
    }

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

    const best = result.best
        ? {
              variantKey: result.best.variantKey,
              player: result.best.player,
              tier: result.best.tier,
              odds: result.best.odds,
          }
        : null;

    state.busy = true;
    try {
        await api.recordBreak({
            boxKey: box.key,
            categoryKey: box.category,
            makerKey: box.maker,
            productKey: box.productKey,
            seed: result.seed,
            cardCount: result.cards.length,
            costRmb: boxCostRmb(box.key),
            valueRmb: sumValueRmb(result.cards, box.productKey),
            byTier: { ...result.byTier },
            bySubset: { ...result.bySubset },
            byVariant,
            best,
        });
        // 这里刻意不写 state.info：拆盒本身的结果已经占了整屏，
        // 再补一句「已记入统计」既多余又会被当成新的一条结果。
        await syncAfterAuth();
        return true;
    } catch (error) {
        state.error =
            error instanceof ApiError ? error.message : "本次拆盒未能保存，请稍后重试。";
        return false;
    } finally {
        state.busy = false;
    }
};

/**
 * 清空我的拆盒记录（需登录）。
 *
 * scopes 里的每一项是一个范围（品类 / 发行商 / 盒型），为空表示清空全部。
 * 范围逐个下发、最后汇总一次提示：界面上的确认只走一次，不该冒出好几条提示。
 *
 * 记录一旦清空无法恢复，确认流程在界面上完成，这里只负责执行与回报条数。
 */
const clearBreaks = async (scopes: StatsFilter[] = []): Promise<boolean> => {
    clearMessages();
    if (!state.user) {
        state.error = "请先登录。";
        return false;
    }
    state.busy = true;
    let removed = 0;
    let failed = false;
    try {
        for (const scope of scopes.length ? scopes : [{}]) {
            try {
                const result = await api.clearBreaks(scope);
                removed += result.removed;
            } catch {
                // 继续把剩下的范围清完，最后统一回报，避免删了一半却什么都不说
                failed = true;
            }
        }
        await syncAfterAuth();
        if (failed) {
            state.error = `已清空 ${removed} 条拆盒记录，其余未能清空，请稍后重试。`;
        } else {
            state.info = removed > 0 ? `已清空 ${removed} 条拆盒记录。` : "没有需要清空的记录。";
        }
        return !failed;
    } finally {
        state.busy = false;
    }
};

const init = async (): Promise<void> => {
    await refreshSession();
    if (state.user) await syncAfterAuth();
};

export const useAppStore = () => ({
    state: readonly(state),
    hasMoreBreaks,
    init,
    register,
    login,
    logout,
    checkNickname,
    updateNickname,
    recordBreak,
    clearBreaks,
    loadBreaks,
    loadMoreBreaks,
    loadServerStats,
    clearMessages,
});
