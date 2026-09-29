<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api, backendState, type GlobalStats, type StatsFilter, type UserStats } from "../api/client";
import { useAppStore } from "../stores/app";
import { TIER_ORDER, TIERS, GROUP_NAMES } from "../engine/tiers";
import { isAutograph } from "../engine/marks";
import { allBoxes, CATEGORIES, getBox } from "../catalog";
import type { GroupKind, Tier } from "../engine/types";

const store = useAppStore();
/** store 是普通对象，嵌套的 ComputedRef 不会在模板里自动解包，必须先取出来 */
const hasMoreBreaks = store.hasMoreBreaks;
const globalStats = ref<GlobalStats | null>(null);
const leaders = ref<{ display_name: string; boxes: number; cards: number }[]>([]);
const offline = ref(false);
const loaded = ref(false);

const signedIn = computed(() => Boolean(store.state.user));

/** 编号卡口径：中高稀有度（编号平行 / 签名 / 实物） */
const NUMBERED_TIERS = ["epic", "legendary", "mythic"] as const;

/** 全站累计与排行榜不随拆盒记录自动变化，清空后需要单独重取 */
const loadPublic = async (): Promise<void> => {
    try {
        const [global, board] = await Promise.all([api.global(), api.leaderboard()]);
        globalStats.value = global.global;
        leaders.value = board.leaderboard;
    } catch {
        /* 后端不可用时保持空数据 */
    }
};

const onDrillKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && drillKey.value) closeDrill();
};

onMounted(async () => {
    window.addEventListener("keydown", onDrillKey);
    await loadPublic();
    offline.value = backendState() === false;
    loaded.value = true;
});

onBeforeUnmount(() => window.removeEventListener("keydown", onDrillKey));

/** 子集 key -> { 名称, 分组 } 查表 */
const subsetIndex = computed(() => {
    const map = new Map<string, { name: string; group: GroupKind }>();
    for (const box of allBoxes()) {
        for (const subset of box.subsets) {
            map.set(subset.key, { name: subset.name, group: subset.kind });
        }
    }
    return map;
});

/** 卡种查表：库里的 best_variant 只是 key，要还原成可读名称 */
const variantIndex = computed(() => {
    const map = new Map<string, string>();
    for (const box of allBoxes()) {
        for (const variant of box.variants) {
            map.set(`${box.key}|${variant.key}`, variant.fullName);
        }
    }
    return map;
});

const boxName = (key: string): string => getBox(key)?.name ?? key;

const variantLabel = (boxKey: string, key: string | null | undefined): string =>
    key ? (variantIndex.value.get(`${boxKey}|${key}`) ?? key) : "—";

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const time = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    return `${date.toLocaleDateString("zh-CN")} ${time}`;
};

const tierMeta = (tier: string) => TIERS[tier as Tier] ?? TIERS.common;

/* ------------------------- 我的云端统计 ------------------------- */

const server = computed(() => store.state.serverStats);

const myBoxes = computed(() => server.value?.boxes ?? 0);
const myCards = computed(() => server.value?.cards ?? 0);

const myNumbered = computed(() =>
    NUMBERED_TIERS.reduce(
        (sum, tier) => sum + (server.value?.byTier.find((row) => row.tier === tier)?.total ?? 0),
        0,
    ),
);

/**
 * 签字卡：服务端只按子集聚合，而「哪些子集是签字」在本地目录里，
 * 所以拿 subset_key 回目录查分组再求和（不为了一个计数去动库表）。
 */
const autographTotal = (rows: readonly { subset_key: string; total: number }[]): number =>
    rows.reduce((sum, row) => {
        const kind = subsetIndex.value.get(row.subset_key)?.group;
        return kind !== undefined && isAutograph(kind) ? sum + row.total : sum;
    }, 0);

const myAutographs = computed(() => autographTotal(server.value?.bySubset ?? []));

/** 按盒子聚合，服务端已按 breaks 表算好 */
const boxRows = computed(() =>
    (server.value?.byBox ?? []).map((row) => ({
        key: row.box_key,
        name: boxName(row.box_key),
        boxes: row.boxes,
        cards: row.cards,
    })),
);

/* ------------------------- 清空拆盒记录 ------------------------- */

/**
 * 为什么不做成一键清空：拆盒记录删掉就没了。这里先把范围摊开让用户自己挑，
 * 再单独走一步确认，确认页会重述将要消失的条数并要求明确勾选。
 */
const clearOpen = ref(false);
/** pick = 挑范围；confirm = 二次确认 */
const clearStage = ref<"pick" | "confirm">("pick");
const pickedBoxes = ref<string[]>([]);
const acknowledged = ref(false);

interface ClearOption {
    key: string;
    name: string;
    boxes: number;
    cards: number;
    categoryKey: string;
    categoryName: string;
}

/** 只列出「确有记录」的盒型 —— 没有记录的盒子没什么可清空的 */
const clearOptions = computed<ClearOption[]>(() =>
    (server.value?.byBox ?? []).map((row) => {
        const box = getBox(row.box_key);
        const category = CATEGORIES.find((item) => item.key === box?.category);
        return {
            key: row.box_key,
            name: box?.name ?? row.box_key,
            boxes: row.boxes,
            cards: row.cards,
            categoryKey: box?.category ?? "",
            categoryName: category?.name ?? "其他",
        };
    }),
);

/** 按品类分组，方便整类勾选 */
const clearGroups = computed(() => {
    const groups = new Map<string, { key: string; name: string; items: ClearOption[]; boxes: number }>();
    for (const option of clearOptions.value) {
        const group = groups.get(option.categoryKey) ?? {
            key: option.categoryKey,
            name: option.categoryName,
            items: [],
            boxes: 0,
        };
        group.items.push(option);
        group.boxes += option.boxes;
        groups.set(option.categoryKey, group);
    }
    return [...groups.values()];
});

const pickedOptions = computed(() => clearOptions.value.filter((item) => pickedBoxes.value.includes(item.key)));
const isPicked = (key: string): boolean => pickedBoxes.value.includes(key);
const isAllPicked = computed(
    () => pickedBoxes.value.length > 0 && pickedBoxes.value.length === clearOptions.value.length,
);
const pickedBoxCount = computed(() => pickedOptions.value.reduce((sum, item) => sum + item.boxes, 0));

const isGroupPicked = (groupKey: string): boolean => {
    const items = clearGroups.value.find((group) => group.key === groupKey)?.items ?? [];
    return items.length > 0 && items.every((item) => isPicked(item.key));
};

/** 勾选状态一变就退回第一步，避免在旧确认页上提交新范围 */
const resetToPick = (): void => {
    clearStage.value = "pick";
    acknowledged.value = false;
};

const toggleBox = (key: string): void => {
    pickedBoxes.value = isPicked(key)
        ? pickedBoxes.value.filter((item) => item !== key)
        : [...pickedBoxes.value, key];
    resetToPick();
};

const toggleGroup = (groupKey: string): void => {
    const keys = clearGroups.value.find((group) => group.key === groupKey)?.items.map((item) => item.key) ?? [];
    if (!keys.length) return;
    pickedBoxes.value = keys.every((key) => isPicked(key))
        ? pickedBoxes.value.filter((key) => !keys.includes(key))
        : [...new Set([...pickedBoxes.value, ...keys])];
    resetToPick();
};

const pickAll = (): void => {
    pickedBoxes.value = clearOptions.value.map((option) => option.key);
    resetToPick();
};

const pickNone = (): void => {
    pickedBoxes.value = [];
    resetToPick();
};

const toggleClearPanel = (): void => {
    if (clearOpen.value) closeClearPanel();
    else clearOpen.value = true;
};

const closeClearPanel = (): void => {
    clearOpen.value = false;
    pickedBoxes.value = [];
    resetToPick();
};

const onAcknowledge = (event: Event): void => {
    acknowledged.value = (event.target as HTMLInputElement).checked;
};

/**
 * 把勾选结果收敛成尽量少的下发次数：
 * 整品类都被选中就按品类下发，全部盒型都被选中就按「全部」下发。
 */
const clearScopes = computed<StatsFilter[]>(() => {
    if (!pickedBoxes.value.length) return [];
    if (isAllPicked.value) return [{}];

    const scopes: StatsFilter[] = [];
    for (const group of clearGroups.value) {
        const keys = group.items.map((item) => item.key);
        const chosen = keys.filter((key) => isPicked(key));
        if (!chosen.length) continue;
        if (chosen.length === keys.length) scopes.push({ category: group.key });
        else for (const key of chosen) scopes.push({ box: key });
    }
    return scopes;
});

const confirmClear = async (): Promise<void> => {
    if (!acknowledged.value || !clearScopes.value.length) return;
    const done = await store.clearBreaks(clearScopes.value);
    if (!done) return;
    closeClearPanel();
    await loadPublic();
};

/* ------------------------- 单个盒型的明细 ------------------------- */

/** 打开弹窗的盒型 key；null 表示未打开 */
const drillKey = ref<string | null>(null);
const drillStats = ref<UserStats | null>(null);
const drillLoading = ref(false);

const drillName = computed(() => (drillKey.value ? boxName(drillKey.value) : ""));

const openDrill = async (key: string): Promise<void> => {
    drillKey.value = key;
    drillStats.value = null;
    drillLoading.value = true;
    try {
        const result = await api.stats({ box: key });
        /* 请求回来前弹窗可能已经关掉或换成了别的盒型 */
        if (drillKey.value !== key) return;
        drillStats.value = result.stats;
    } catch {
        if (drillKey.value === key) drillStats.value = null;
    } finally {
        if (drillKey.value === key) drillLoading.value = false;
    }
};

const closeDrill = (): void => {
    drillKey.value = null;
    drillStats.value = null;
    drillLoading.value = false;
};

const drillNumbered = computed(() =>
    NUMBERED_TIERS.reduce(
        (sum, tier) => sum + (drillStats.value?.byTier.find((row) => row.tier === tier)?.total ?? 0),
        0,
    ),
);

const drillAutographs = computed(() => autographTotal(drillStats.value?.bySubset ?? []));

const drillTierRows = computed(() => {
    const map = new Map((drillStats.value?.byTier ?? []).map((row) => [row.tier, row.total]));
    return TIER_ORDER.map((tier) => ({
        key: tier,
        name: TIERS[tier].name,
        color: TIERS[tier].color,
        count: map.get(tier) ?? 0,
    }));
});

const drillTierMax = computed(() => Math.max(1, ...drillTierRows.value.map((r) => r.count)));

const drillSubsetRows = computed(() =>
    (drillStats.value?.bySubset ?? []).map((row) => {
        const meta = subsetIndex.value.get(row.subset_key);
        return {
            key: row.subset_key,
            name: meta?.name ?? row.subset_key,
            groupName: meta ? GROUP_NAMES[meta.group] : "",
            count: row.total,
        };
    }),
);

const drillSubsetMax = computed(() => Math.max(1, ...drillSubsetRows.value.map((r) => r.count)));

/** 拆盒记录：直接来自 GET /api/breaks（D1 的 breaks 表） */
const breakRows = computed(() =>
    store.state.breaks.map((row) => {
        const meta = row.best ? tierMeta(row.best.tier) : null;
        return {
            id: row.id,
            boxLabel: boxName(row.boxKey),
            seed: row.seed,
            cardCount: row.cardCount,
            numbered: NUMBERED_TIERS.reduce((sum, tier) => sum + (row.byTier[tier] ?? 0), 0),
            bestPlayer: row.best?.player || "—",
            bestVariant: variantLabel(row.boxKey, row.best?.variantKey),
            bestTierName: meta?.name ?? "—",
            bestColor: meta?.color ?? "var(--ce-text-dim)",
            bestOdds: row.best?.odds ? `1:${formatNumber(row.best.odds)}` : "—",
            date: formatDate(row.createdAt),
        };
    }),
);

/* ------------------------- 全站统计 ------------------------- */
</script>

<template>
    <div class="ce-shell">
        <header class="ce-page-head">
            <p class="ce-card-en">My Collection</p>
            <h1 class="ce-page-title">我的拆盒统计</h1>
            <p class="ce-page-desc">
                这里汇总你的全部拆盒记录；排行榜与全站统计对所有访客开放。
            </p>
        </header>

        <p v-if="offline && loaded" class="ce-alert ce-alert-warn">
            统计数据暂时不可用，请稍后重试。
        </p>
        <p v-if="store.state.error" class="ce-alert ce-alert-error">{{ store.state.error }}</p>
        <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">{{ store.state.info }}</p>

        <section v-if="!signedIn" class="ce-card ce-stats-top">
            <h2 class="ce-section-title">登录后查看我的拆盒统计</h2>
            <div class="ce-stats-actions">
                <RouterLink to="/auth" class="ce-btn ce-btn-primary">注册 / 登录</RouterLink>
            </div>
        </section>

        <template v-if="signedIn">
        <section class="ce-card ce-stats-top">
            <div class="ce-summary-grid">
                <div>
                    <strong>{{ formatNumber(myBoxes) }}</strong>
                    <span>拆盒数</span>
                </div>
                <div>
                    <strong>{{ formatNumber(myCards) }}</strong>
                    <span>出卡数</span>
                </div>
                <div>
                    <strong>{{ formatNumber(boxRows.length) }}</strong>
                    <span>已拆盒型</span>
                </div>
                <div>
                    <strong>{{ formatNumber(myNumbered) }}</strong>
                    <span>编号卡</span>
                </div>
                <div>
                    <strong>{{ formatNumber(myAutographs) }}</strong>
                    <span>签字卡</span>
                </div>
            </div>
            <div class="ce-stats-actions">
                <button
                    class="ce-btn ce-btn-danger"
                    type="button"
                    :disabled="store.state.busy || myBoxes === 0"
                    @click="toggleClearPanel"
                >
                    {{ clearOpen ? "收起" : "清空拆盒记录" }}
                </button>
            </div>

            <div v-if="clearOpen" class="ce-clear">
                <template v-if="clearStage === 'pick'">
                    <div class="ce-clear-head">
                        <h3 class="ce-section-title">选择要清空的盒型</h3>
                        <span class="ce-section-desc">可以单品盒，也可以整个品类</span>
                    </div>

                    <ul class="ce-clear-list">
                        <li v-for="group in clearGroups" :key="group.key" class="ce-clear-group">
                            <label class="ce-clear-row ce-clear-row-group">
                                <input
                                    type="checkbox"
                                    :checked="isGroupPicked(group.key)"
                                    @change="toggleGroup(group.key)"
                                />
                                <span class="ce-clear-name">{{ group.name }}</span>
                                <span class="ce-faint">
                                    {{ group.items.length }} 个盒型 ·
                                    {{ formatNumber(group.boxes) }} 条
                                </span>
                            </label>
                            <ul class="ce-clear-sub">
                                <li v-for="option in group.items" :key="option.key">
                                    <label class="ce-clear-row">
                                        <input
                                            type="checkbox"
                                            :checked="isPicked(option.key)"
                                            @change="toggleBox(option.key)"
                                        />
                                        <span class="ce-clear-name">{{ option.name }}</span>
                                        <span class="ce-faint">
                                            {{ formatNumber(option.boxes) }} 条 ·
                                            {{ formatNumber(option.cards) }} 张
                                        </span>
                                    </label>
                                </li>
                            </ul>
                        </li>
                    </ul>

                    <div class="ce-stats-actions ce-mt-16">
                        <button class="ce-btn ce-btn-sm" type="button" @click="pickAll">全选</button>
                        <button
                            class="ce-btn ce-btn-sm"
                            type="button"
                            :disabled="!pickedBoxes.length"
                            @click="pickNone"
                        >
                            取消选择
                        </button>
                        <button class="ce-btn ce-btn-sm" type="button" @click="closeClearPanel">
                            关闭
                        </button>
                        <button
                            class="ce-btn ce-btn-sm ce-btn-danger"
                            type="button"
                            :disabled="!pickedBoxes.length"
                            @click="clearStage = 'confirm'"
                        >
                            清空选中的 {{ formatNumber(pickedBoxCount) }} 条
                        </button>
                    </div>
                </template>

                <template v-else>
                    <h3 class="ce-section-title">确认清空</h3>
                    <p class="ce-alert ce-alert-warn">
                        <template v-if="isAllPicked">
                            即将清空全部 {{ formatNumber(pickedBoxCount) }} 条拆盒记录。
                        </template>
                        <template v-else>
                            即将清空 {{ pickedBoxes.length }} 个盒型的
                            {{ formatNumber(pickedBoxCount) }} 条拆盒记录。
                        </template>
                        清空后这些记录会立刻消失，无法恢复。
                    </p>

                    <ul class="ce-clear-summary">
                        <li v-for="option in pickedOptions" :key="option.key">
                            <span class="ce-clear-name">{{ option.name }}</span>
                            <span class="ce-faint">{{ formatNumber(option.boxes) }} 条</span>
                        </li>
                    </ul>

                    <label class="ce-clear-row ce-clear-ack">
                        <input type="checkbox" :checked="acknowledged" @change="onAcknowledge" />
                        <span>我明白这些记录无法恢复</span>
                    </label>

                    <div class="ce-stats-actions ce-mt-16">
                        <button
                            class="ce-btn ce-btn-sm"
                            type="button"
                            :disabled="store.state.busy"
                            @click="clearStage = 'pick'"
                        >
                            返回选择
                        </button>
                        <button
                            class="ce-btn ce-btn-sm ce-btn-danger"
                            type="button"
                            :disabled="!acknowledged || store.state.busy"
                            @click="confirmClear"
                        >
                            确认清空
                        </button>
                    </div>
                </template>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">按盒子</h2>
                <span class="ce-section-desc">按盒型汇总</span>
            </div>

            <div v-if="boxRows.length" class="ce-card ce-table-wrap">
                <table class="ce-table">
                    <thead>
                        <tr>
                            <th>盒子</th>
                            <th>拆盒数</th>
                            <th>出卡数</th>
                            <th class="ce-col-action" aria-label="操作"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in boxRows" :key="row.key">
                            <td>{{ row.name }}</td>
                            <td class="ce-mono">{{ formatNumber(row.boxes) }}</td>
                            <td class="ce-mono">{{ formatNumber(row.cards) }}</td>
                            <td class="ce-col-action">
                                <button
                                    class="ce-btn ce-btn-sm"
                                    type="button"
                                    @click="openDrill(row.key)"
                                >
                                    查看统计
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else class="ce-empty">
                还没有拆过盒。<RouterLink to="/c/basketball" class="ce-link">去拆一盒</RouterLink>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">拆盒记录</h2>
                <span class="ce-section-desc">
                    共 {{ formatNumber(store.state.breakTotal) }} 条 · 已显示
                    {{ breakRows.length }} 条
                </span>
            </div>

            <div v-if="breakRows.length" class="ce-card ce-table-wrap">
                <table class="ce-table">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>盒子</th>
                            <th>种子</th>
                            <th>张数</th>
                            <th>编号卡</th>
                            <th>最佳卡</th>
                            <th>配率</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in breakRows" :key="row.id">
                            <td class="ce-faint">{{ row.date }}</td>
                            <td>{{ row.boxLabel }}</td>
                            <td class="ce-mono">{{ row.seed }}</td>
                            <td class="ce-mono">{{ row.cardCount }}</td>
                            <td class="ce-mono">{{ row.numbered }}</td>
                            <td>
                                {{ row.bestPlayer }}
                                <em class="ce-faint">{{ row.bestVariant }}</em>
                            </td>
                            <td :style="{ color: row.bestColor }">
                                {{ row.bestTierName }}
                                <span class="ce-mono ce-faint">{{ row.bestOdds }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="ce-faint ce-mt-14">还没有拆盒记录。</p>

            <div v-if="hasMoreBreaks" class="ce-stats-actions ce-mt-16">
                <button
                    class="ce-btn"
                    type="button"
                    :disabled="store.state.busy"
                    @click="store.loadMoreBreaks()"
                >
                    显示更多
                </button>
            </div>
        </section>
        </template>

        <section class="ce-section ce-grid ce-grid-2">
            <div class="ce-card">
                <h2 class="ce-section-title">全站累计</h2>
                <div class="ce-summary-grid">
                    <div>
                        <strong>{{ globalStats ? formatNumber(globalStats.users) : "—" }}</strong>
                        <span>收藏家</span>
                    </div>
                    <div>
                        <strong>{{ globalStats ? formatNumber(globalStats.boxes) : "—" }}</strong>
                        <span>拆盒数</span>
                    </div>
                    <div>
                        <strong>{{ globalStats ? formatNumber(globalStats.cards) : "—" }}</strong>
                        <span>出卡数</span>
                    </div>
                </div>
                <p v-if="!globalStats" class="ce-faint ce-mt-14">全站数据暂时不可用。</p>
            </div>

            <div class="ce-card">
                <h2 class="ce-section-title">拆盒排行 Top 20</h2>
                <ol v-if="leaders.length" class="ce-board">
                    <li v-for="(row, index) in leaders" :key="row.display_name">
                        <span class="ce-board-rank ce-mono">{{ index + 1 }}</span>
                        <span class="ce-board-name">{{ row.display_name }}</span>
                        <span class="ce-board-value ce-mono">
                            {{ formatNumber(row.boxes) }} 盒 / {{ formatNumber(row.cards) }} 张
                        </span>
                    </li>
                </ol>
                <p v-else class="ce-faint ce-mt-14">暂无排行数据。</p>
            </div>
        </section>

        <div v-if="drillKey" class="ce-modal" @click.self="closeDrill">
            <div class="ce-modal-panel" role="dialog" aria-modal="true" aria-labelledby="ce-drill-title">
                <div class="ce-modal-head">
                    <h2 id="ce-drill-title" class="ce-section-title">{{ drillName }}</h2>
                    <button class="ce-modal-close" type="button" @click="closeDrill">关闭</button>
                </div>

                <p v-if="drillLoading" class="ce-faint ce-mt-14">正在读取…</p>
                <p v-else-if="!drillStats" class="ce-faint ce-mt-14">
                    暂时读不到这个盒型的统计，请稍后重试。
                </p>
                <template v-else>
                    <div class="ce-summary-grid ce-mt-16">
                        <div>
                            <strong>{{ formatNumber(drillStats.boxes) }}</strong>
                            <span>拆盒数</span>
                        </div>
                        <div>
                            <strong>{{ formatNumber(drillStats.cards) }}</strong>
                            <span>出卡数</span>
                        </div>
                        <div>
                            <strong>{{ formatNumber(drillNumbered) }}</strong>
                            <span>编号卡</span>
                        </div>
                        <div>
                            <strong>{{ formatNumber(drillAutographs) }}</strong>
                            <span>签字卡</span>
                        </div>
                    </div>

                    <div class="ce-modal-block">
                        <h3 class="ce-section-title">稀有度分布</h3>
                        <ul class="ce-tier-bars">
                            <li v-for="row in drillTierRows" :key="row.key">
                                <span class="ce-tier-dot" :style="{ background: row.color }"></span>
                                <span class="ce-tier-name">{{ row.name }}</span>
                                <span class="ce-tier-bar">
                                    <i
                                        :style="{
                                            width: `${(row.count / drillTierMax) * 100}%`,
                                            background: row.color,
                                        }"
                                    ></i>
                                </span>
                                <span class="ce-mono ce-tier-count">{{ formatNumber(row.count) }}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="ce-modal-block">
                        <h3 class="ce-section-title">卡种子集</h3>
                        <ul v-if="drillSubsetRows.length" class="ce-tier-bars">
                            <li v-for="row in drillSubsetRows" :key="row.key">
                                <span class="ce-tier-dot" :style="{ background: TIERS.epic.color }"></span>
                                <span class="ce-tier-name">
                                    {{ row.name }}
                                    <span v-if="row.groupName" class="ce-faint">{{ row.groupName }}</span>
                                </span>
                                <span class="ce-tier-bar">
                                    <i
                                        :style="{
                                            width: `${(row.count / drillSubsetMax) * 100}%`,
                                            background: TIERS.epic.color,
                                        }"
                                    ></i>
                                </span>
                                <span class="ce-mono ce-tier-count">{{ formatNumber(row.count) }}</span>
                            </li>
                        </ul>
                        <p v-else class="ce-faint ce-mt-14">这个盒型还没有出过卡。</p>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ce-page-head {
    padding: 30px 0 6px;
    max-width: 820px;
}

.ce-page-head p {
    margin: 0;
}

.ce-page-title {
    font-size: 27px;
    margin-top: 2px !important;
}

.ce-page-desc {
    color: var(--ce-text-dim);
    font-size: 14px;
    margin-top: 8px !important;
}

.ce-stats-top {
    margin-top: 22px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.ce-stats-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

/* ---------------- 清空拆盒记录 ---------------- */

.ce-clear {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--ce-border);
}

.ce-clear-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.ce-clear-list,
.ce-clear-sub,
.ce-clear-summary {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
}

.ce-clear-group + .ce-clear-group {
    margin-top: 12px;
}

.ce-clear-sub {
    margin: 4px 0 0 24px;
}

.ce-clear-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 9px;
    cursor: pointer;
    font-size: 13.5px;
    color: var(--ce-text);
}

.ce-clear-row:hover {
    background: rgba(255, 255, 255, 0.045);
}

.ce-clear-row input {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    accent-color: var(--ce-danger);
}

.ce-clear-row-group {
    font-weight: 600;
    background: rgba(255, 255, 255, 0.035);
}

.ce-clear-name {
    flex: 1;
    min-width: 0;
}

.ce-clear-ack {
    margin-top: 14px;
    border: 1px solid var(--ce-border);
}

.ce-clear-summary {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    max-height: 186px;
    overflow-y: auto;
}

.ce-clear-summary li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
}

.ce-mt-14 {
    margin-top: 14px;
}

.ce-mt-16 {
    margin-top: 16px;
}

.ce-tier-bars {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ce-tier-bars li {
    display: grid;
    grid-template-columns: 10px minmax(88px, 1.3fr) 1.5fr 42px;
    align-items: center;
    gap: 9px;
    font-size: 12.5px;
}

.ce-tier-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.ce-tier-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ce-tier-bar {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
    display: block;
}

.ce-tier-bar i {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
}

.ce-tier-count {
    text-align: right;
    color: var(--ce-text-dim);
}

.ce-record-list {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
}

.ce-record-list li {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
}

.ce-record-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.ce-record-main strong {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ce-record-main em {
    font-style: normal;
    font-size: 11.5px;
    color: var(--ce-text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ce-record-odds {
    color: var(--ce-brand);
    font-size: 12px;
    white-space: nowrap;
}

.ce-record-date {
    font-size: 11.5px;
    white-space: nowrap;
}

.ce-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 14px;
}

.ce-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--ce-border);
    background: rgba(255, 255, 255, 0.03);
    font-size: 12px;
    color: var(--ce-text-dim);
}

.ce-chip b {
    color: var(--ce-brand);
}

.ce-board {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
}

.ce-board li {
    display: grid;
    grid-template-columns: 26px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
}

.ce-board-rank {
    color: var(--ce-text-faint);
}

.ce-board-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ce-board-value {
    color: var(--ce-text-dim);
    font-size: 12px;
}

.ce-link {
    color: var(--ce-brand);
}

/* ---------------- 盒型明细弹窗 ---------------- */

.ce-col-action {
    width: 1%;
    text-align: right;
    white-space: nowrap;
}
</style>
