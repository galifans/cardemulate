<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api, backendState, type GlobalStats } from "../api/client";
import { useAppStore } from "../stores/app";
import { TIER_ORDER, TIERS, GROUP_NAMES } from "../engine/tiers";
import { allBoxes, getBox } from "../catalog";
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

onMounted(async () => {
    try {
        const [global, board] = await Promise.all([api.global(), api.leaderboard()]);
        globalStats.value = global.global;
        leaders.value = board.leaderboard;
    } catch {
        /* 后端不可用时保持空数据 */
    }
    offline.value = backendState() === false;
    loaded.value = true;
});

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

/** 按盒子聚合，服务端已按 breaks 表算好 */
const boxRows = computed(() =>
    (server.value?.byBox ?? []).map((row) => ({
        key: row.box_key,
        name: boxName(row.box_key),
        boxes: row.boxes,
        cards: row.cards,
    })),
);

const tierRows = computed(() => {
    const map = new Map((server.value?.byTier ?? []).map((row) => [row.tier, row.total]));
    return TIER_ORDER.map((tier) => ({
        key: tier,
        name: TIERS[tier].name,
        color: TIERS[tier].color,
        count: map.get(tier) ?? 0,
    }));
});

const maxTier = computed(() => Math.max(1, ...tierRows.value.map((r) => r.count)));

const subsetRows = computed(() =>
    (server.value?.bySubset ?? [])
        .map((row) => {
            const meta = subsetIndex.value.get(row.subset_key);
            return {
                key: row.subset_key,
                name: meta?.name ?? row.subset_key,
                groupName: meta ? GROUP_NAMES[meta.group] : "",
                count: row.total,
            };
        })
        .slice(0, 24),
);

const subsetMax = computed(() => Math.max(1, ...subsetRows.value.map((r) => r.count)));

/** 最稀有的 20 张：服务端按 best_odds 倒序给出 */
const rarestRows = computed(() =>
    (server.value?.rarest ?? []).map((row) => ({
        key: `${row.seed}-${row.created_at}`,
        player: row.best_player ?? "—",
        variant: variantLabel(row.box_key, row.best_variant),
        tierName: row.best_tier ? tierMeta(row.best_tier).name : "—",
        color: row.best_tier ? tierMeta(row.best_tier).color : "var(--ce-text-dim)",
        oddsLabel: row.best_odds ? `1:${formatNumber(row.best_odds)}` : "—",
        boxLabel: boxName(row.box_key),
        seed: row.seed,
        date: formatDate(row.created_at),
    })),
);

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

const globalTierRows = computed(() => {
    const map = new Map((globalStats.value?.byTier ?? []).map((row) => [row.tier, row.total]));
    return TIER_ORDER.map((tier) => ({
        key: tier,
        name: TIERS[tier].name,
        color: TIERS[tier].color,
        count: map.get(tier) ?? 0,
    }));
});

const globalTotal = computed(() => Math.max(1, globalStats.value?.cards ?? 1));
</script>

<template>
    <div class="ce-shell">
        <header class="ce-page-head">
            <p class="ce-card-en">My Collection</p>
            <h1 class="ce-page-title">我的拆盒统计</h1>
            <p class="ce-page-desc">
                每一次拆盒都会写入云端数据库，登录后即可在这里看到自己的全部记录；
                排行榜与全站统计对所有访客开放。
            </p>
        </header>

        <p v-if="offline && loaded" class="ce-alert ce-alert-warn">
            无法连接后端服务，暂时拿不到统计数据。本地开发请使用
            <code class="ce-mono">npm run dev:cf</code> 启动完整环境。
        </p>
        <p v-if="store.state.error" class="ce-alert ce-alert-error">{{ store.state.error }}</p>
        <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">{{ store.state.info }}</p>

        <section v-if="!signedIn" class="ce-card ce-stats-top">
            <h2 class="ce-section-title">登录后查看我的拆盒统计</h2>
            <p class="ce-faint">
                本站不提供本地拆卡：每次拆盒都会写入云端数据库，登录后就能在这里看到拆盒数、
                稀有度分布、卡种子集、最稀有的卡以及完整的拆盒记录。注册只需要邮箱和密码。
            </p>
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
            </div>
            <div class="ce-stats-actions">
                <button
                    class="ce-btn"
                    type="button"
                    :disabled="store.state.busy"
                    @click="store.loadServerStats(); store.loadBreaks()"
                >
                    刷新云端数据
                </button>
                <button
                    class="ce-btn ce-btn-danger"
                    type="button"
                    :disabled="store.state.busy || myBoxes === 0"
                    @click="store.clearBreaks()"
                >
                    清空云端记录
                </button>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">按盒子</h2>
                <span class="ce-section-desc">数据来自云端 breaks 表</span>
            </div>

            <div v-if="boxRows.length" class="ce-card ce-table-wrap">
                <table class="ce-table">
                    <thead>
                        <tr>
                            <th>盒子</th>
                            <th>拆盒数</th>
                            <th>出卡数</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in boxRows" :key="row.key">
                            <td>{{ row.name }}</td>
                            <td class="ce-mono">{{ formatNumber(row.boxes) }}</td>
                            <td class="ce-mono">{{ formatNumber(row.cards) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else class="ce-empty">
                还没有拆过盒。<RouterLink to="/c/basketball" class="ce-link">去拆一盒</RouterLink>
            </div>
        </section>

        <section class="ce-section ce-grid ce-grid-2">
            <div class="ce-card">
                <h2 class="ce-section-title">稀有度分布</h2>
                <ul class="ce-tier-bars">
                    <li v-for="row in tierRows" :key="row.key">
                        <span class="ce-tier-dot" :style="{ background: row.color }"></span>
                        <span class="ce-tier-name">{{ row.name }}</span>
                        <span class="ce-tier-bar">
                            <i
                                :style="{
                                    width: `${(row.count / maxTier) * 100}%`,
                                    background: row.color,
                                }"
                            ></i>
                        </span>
                        <span class="ce-mono ce-tier-count">{{ row.count }}</span>
                    </li>
                </ul>
            </div>

            <div class="ce-card">
                <h2 class="ce-section-title">卡种子集 Top 24</h2>
                <ul v-if="subsetRows.length" class="ce-tier-bars">
                    <li v-for="row in subsetRows" :key="row.key">
                        <span class="ce-tier-dot" :style="{ background: TIERS.epic.color }"></span>
                        <span class="ce-tier-name">
                            {{ row.name }}
                            <span v-if="row.groupName" class="ce-faint">{{ row.groupName }}</span>
                        </span>
                        <span class="ce-tier-bar">
                            <i
                                :style="{
                                    width: `${(row.count / subsetMax) * 100}%`,
                                    background: TIERS.epic.color,
                                }"
                            ></i>
                        </span>
                        <span class="ce-mono ce-tier-count">{{ row.count }}</span>
                    </li>
                </ul>
                <p v-else class="ce-faint ce-mt-14">暂无数据。</p>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">最稀有的 20 张</h2>
                <span class="ce-section-desc">按配率倒序</span>
            </div>

            <div v-if="rarestRows.length" class="ce-card ce-table-wrap">
                <table class="ce-table">
                    <thead>
                        <tr>
                            <th>球员</th>
                            <th>卡种</th>
                            <th>稀有度</th>
                            <th>配率</th>
                            <th>盒子</th>
                            <th>种子</th>
                            <th>时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in rarestRows" :key="row.key">
                            <td>{{ row.player }}</td>
                            <td class="ce-faint">{{ row.variant }}</td>
                            <td :style="{ color: row.color }">{{ row.tierName }}</td>
                            <td class="ce-mono">{{ row.oddsLabel }}</td>
                            <td class="ce-faint">{{ row.boxLabel }}</td>
                            <td class="ce-mono">{{ row.seed }}</td>
                            <td class="ce-faint">{{ row.date }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else class="ce-faint ce-mt-14">还没有记录。</p>
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
                <ul v-if="globalStats" class="ce-tier-bars">
                    <li v-for="row in globalTierRows" :key="row.key">
                        <span class="ce-tier-dot" :style="{ background: row.color }"></span>
                        <span class="ce-tier-name">{{ row.name }}</span>
                        <span class="ce-tier-bar">
                            <i
                                :style="{
                                    width: `${(row.count / globalTotal) * 100}%`,
                                    background: row.color,
                                }"
                            ></i>
                        </span>
                        <span class="ce-mono ce-tier-count">{{ formatNumber(row.count) }}</span>
                    </li>
                </ul>
                <p v-else class="ce-faint ce-mt-14">后端不可用，暂时拿不到全站数据。</p>
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
</style>
