<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api, backendState, type GlobalStats } from "../api/client";
import { useAppStore } from "../stores/app";
import { TIER_ORDER, TIERS, GROUP_NAMES } from "../engine/tiers";
import { allBoxes } from "../catalog";
import type { GroupKind, Tier } from "../engine/types";

const store = useAppStore();
const globalStats = ref<GlobalStats | null>(null);
const leaders = ref<{ display_name: string; boxes: number; cards: number }[]>([]);
const offline = ref(false);
const loaded = ref(false);

onMounted(async () => {
    try {
        const [global, board] = await Promise.all([api.global(), api.leaderboard()]);
        globalStats.value = global.global;
        leaders.value = board.leaderboard;
    } catch {
        /* 后端不可用时静默降级为纯本机统计 */
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

const formatNumber = (value: number): string => value.toLocaleString("zh-CN");

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const time = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    return `${date.toLocaleDateString("zh-CN")} ${time}`;
};

const tierMeta = (tier: string) => TIERS[tier as Tier] ?? TIERS.common;

/* ------------------------- 本机统计 ------------------------- */

const history = computed(() => store.state.history);

const localBoxRows = computed(() => {
    const map = new Map<
        string,
        { key: string; name: string; boxes: number; cards: number; numbered: number }
    >();
    for (const entry of history.value) {
        const row = map.get(entry.boxKey) ?? {
            key: entry.boxKey,
            name: entry.boxName,
            boxes: 0,
            cards: 0,
            numbered: 0,
        };
        row.boxes += 1;
        row.cards += entry.cardCount;
        for (const [tier, count] of Object.entries(entry.byTier)) {
            if (tier === "epic" || tier === "legendary" || tier === "mythic") row.numbered += count;
        }
        map.set(entry.boxKey, row);
    }
    return Array.from(map.values()).sort((a, b) => b.boxes - a.boxes);
});

const localTierRows = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of history.value) {
        for (const [tier, count] of Object.entries(entry.byTier)) {
            counts.set(tier, (counts.get(tier) ?? 0) + count);
        }
    }
    return TIER_ORDER.map((tier) => ({
        key: tier,
        name: TIERS[tier].name,
        color: TIERS[tier].color,
        count: counts.get(tier) ?? 0,
    }));
});

const localMaxTier = computed(() => Math.max(1, ...localTierRows.value.map((r) => r.count)));

const localSubsetRows = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of history.value) {
        for (const [key, count] of Object.entries(entry.bySubset)) {
            counts.set(key, (counts.get(key) ?? 0) + count);
        }
    }
    return Array.from(counts.entries())
        .map(([key, count]) => {
            const meta = subsetIndex.value.get(key);
            return {
                key,
                name: meta?.name ?? key,
                groupName: meta ? GROUP_NAMES[meta.group] : "",
                count,
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 24);
});

const localSubsetMax = computed(() => Math.max(1, ...localSubsetRows.value.map((r) => r.count)));

const localRarest = computed(() =>
    history.value
        .filter((entry) => entry.best !== null)
        .sort((a, b) => (b.best?.odds ?? 0) - (a.best?.odds ?? 0))
        .slice(0, 10)
        .map((entry) => ({
            key: `${entry.seed}-${entry.createdAt}`,
            player: entry.best?.player ?? "—",
            fullName: entry.best?.fullName ?? "—",
            oddsLabel: `1:${formatNumber(entry.best?.odds ?? 0)}`,
            tierName: tierMeta(entry.best?.tier ?? "common").name,
            color: tierMeta(entry.best?.tier ?? "common").color,
            date: formatDate(entry.createdAt),
        })),
);

const localRecent = computed(() =>
    history.value.slice(0, 10).map((entry) => ({
        key: `${entry.seed}-${entry.createdAt}`,
        boxName: entry.boxName,
        seed: entry.seed,
        cardCount: entry.cardCount,
        date: formatDate(entry.createdAt),
    })),
);

/* ------------------------- 云端统计 ------------------------- */

const server = computed(() => store.state.serverStats);

const serverTierRows = computed(() => {
    const map = new Map((server.value?.byTier ?? []).map((row) => [row.tier, row.total]));
    return TIER_ORDER.map((tier) => ({
        key: tier,
        name: TIERS[tier].name,
        color: TIERS[tier].color,
        count: map.get(tier) ?? 0,
    }));
});

const serverMaxTier = computed(() => Math.max(1, ...serverTierRows.value.map((r) => r.count)));

const serverSubsetRows = computed(() =>
    (server.value?.bySubset ?? []).map((row) => ({
        key: row.subset_key,
        name: subsetIndex.value.get(row.subset_key)?.name ?? row.subset_key,
        count: row.total,
    })),
);

const serverRarest = computed(() =>
    (server.value?.rarest ?? []).map((row) => ({
        key: `${row.seed}-${row.created_at}`,
        player: row.best_player ?? "—",
        variant: row.best_variant ?? "—",
        tierName: row.best_tier ? tierMeta(row.best_tier).name : "—",
        color: row.best_tier ? tierMeta(row.best_tier).color : "var(--ce-text-dim)",
        oddsLabel: row.best_odds ? `1:${formatNumber(row.best_odds)}` : "—",
        boxKey: row.box_key,
        seed: row.seed,
        date: formatDate(row.created_at),
    })),
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
const localCards = computed(() => history.value.reduce((sum, entry) => sum + entry.cardCount, 0));
</script>

<template>
    <div class="ce-shell">
        <header class="ce-page-head">
            <p class="ce-card-en">My Collection</p>
            <h1 class="ce-page-title">我的拆盒统计</h1>
            <p class="ce-page-desc">
                本机统计始终可用（存于浏览器 localStorage，最多 200 盒）；登录后额外获得云端同步、全站排行与跨设备记录。
            </p>
        </header>

        <p v-if="offline && loaded" class="ce-alert ce-alert-warn">
            无法连接后端服务，当前仅展示本机统计。本地开发请使用
            <code class="ce-mono">npm run dev:cf</code> 启动完整环境。
        </p>
        <p v-if="store.state.error" class="ce-alert ce-alert-error">{{ store.state.error }}</p>
        <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">{{ store.state.info }}</p>

        <section class="ce-card ce-stats-top">
            <div class="ce-summary-grid">
                <div>
                    <strong>{{ formatNumber(history.length) }}</strong>
                    <span>本机拆盒数</span>
                </div>
                <div>
                    <strong>{{ formatNumber(localCards) }}</strong>
                    <span>本机出卡数</span>
                </div>
                <div>
                    <strong>{{ server ? formatNumber(server.boxes) : "—" }}</strong>
                    <span>云端拆盒数</span>
                </div>
                <div>
                    <strong>{{ server ? formatNumber(server.cards) : "—" }}</strong>
                    <span>云端出卡数</span>
                </div>
            </div>
            <div class="ce-stats-actions">
                <button
                    v-if="!store.state.user"
                    class="ce-btn ce-btn-primary"
                    type="button"
                    @click="$router.push('/auth')"
                >
                    注册 / 登录以同步云端
                </button>
                <button
                    v-else
                    class="ce-btn"
                    type="button"
                    :disabled="store.state.busy"
                    @click="store.loadServerStats()"
                >
                    刷新云端统计
                </button>
                <button
                    class="ce-btn ce-btn-danger"
                    type="button"
                    :disabled="history.length === 0"
                    @click="store.clearHistory()"
                >
                    清空记录
                </button>
            </div>
        </section>

        <section class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">本机 · 按盒子</h2>
                <span class="ce-section-desc">编号卡 = 中高稀有度（编号平行 / 签名 / 实物）张数</span>
            </div>

            <div v-if="localBoxRows.length" class="ce-card ce-table-wrap">
                <table class="ce-table">
                    <thead>
                        <tr>
                            <th>盒子</th>
                            <th>拆盒数</th>
                            <th>出卡数</th>
                            <th>编号卡</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in localBoxRows" :key="row.key">
                            <td>{{ row.name }}</td>
                            <td class="ce-mono">{{ formatNumber(row.boxes) }}</td>
                            <td class="ce-mono">{{ formatNumber(row.cards) }}</td>
                            <td class="ce-mono">{{ formatNumber(row.numbered) }}</td>
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
                <h2 class="ce-section-title">本机 · 稀有度分布</h2>
                <ul class="ce-tier-bars">
                    <li v-for="row in localTierRows" :key="row.key">
                        <span class="ce-tier-dot" :style="{ background: row.color }"></span>
                        <span class="ce-tier-name">{{ row.name }}</span>
                        <span class="ce-tier-bar">
                            <i
                                :style="{
                                    width: `${(row.count / localMaxTier) * 100}%`,
                                    background: row.color,
                                }"
                            ></i>
                        </span>
                        <span class="ce-mono ce-tier-count">{{ row.count }}</span>
                    </li>
                </ul>
            </div>

            <div class="ce-card">
                <h2 class="ce-section-title">本机 · 卡种子集 Top 24</h2>
                <ul v-if="localSubsetRows.length" class="ce-tier-bars">
                    <li v-for="row in localSubsetRows" :key="row.key">
                        <span class="ce-tier-dot" :style="{ background: TIERS.epic.color }"></span>
                        <span class="ce-tier-name">
                            {{ row.name }}
                            <span v-if="row.groupName" class="ce-faint">{{ row.groupName }}</span>
                        </span>
                        <span class="ce-tier-bar">
                            <i
                                :style="{
                                    width: `${(row.count / localSubsetMax) * 100}%`,
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

        <section class="ce-section ce-grid ce-grid-2">
            <div class="ce-card">
                <h2 class="ce-section-title">本机 · 最稀有的 10 张</h2>
                <ul v-if="localRarest.length" class="ce-record-list">
                    <li v-for="row in localRarest" :key="row.key">
                        <span class="ce-tier-dot" :style="{ background: row.color }"></span>
                        <span class="ce-record-main">
                            <strong>{{ row.player }}</strong>
                            <em>{{ row.fullName }} · {{ row.tierName }}</em>
                        </span>
                        <span class="ce-mono ce-record-odds">{{ row.oddsLabel }}</span>
                        <span class="ce-faint ce-record-date">{{ row.date }}</span>
                    </li>
                </ul>
                <p v-else class="ce-faint ce-mt-14">暂无数据。</p>
            </div>

            <div class="ce-card">
                <h2 class="ce-section-title">本机 · 最近拆盒</h2>
                <ul v-if="localRecent.length" class="ce-record-list">
                    <li v-for="row in localRecent" :key="row.key">
                        <span class="ce-tier-dot" style="background: var(--ce-brand)"></span>
                        <span class="ce-record-main">
                            <strong>{{ row.boxName }}</strong>
                            <em class="ce-mono">种子 {{ row.seed }}</em>
                        </span>
                        <span class="ce-faint ce-record-odds">{{ row.cardCount }} 张</span>
                        <span class="ce-faint ce-record-date">{{ row.date }}</span>
                    </li>
                </ul>
                <p v-else class="ce-faint ce-mt-14">暂无数据。</p>
            </div>
        </section>

        <section v-if="store.state.user" class="ce-section">
            <div class="ce-section-head">
                <h2 class="ce-section-title">云端 · {{ store.state.user.displayName }}</h2>
                <span class="ce-section-desc">
                    {{ store.state.user.email }} · 注册于 {{ formatDate(store.state.user.createdAt) }}
                </span>
            </div>

            <div class="ce-grid ce-grid-2">
                <div class="ce-card">
                    <h2 class="ce-section-title">云端 · 稀有度分布</h2>
                    <ul class="ce-tier-bars">
                        <li v-for="row in serverTierRows" :key="row.key">
                            <span class="ce-tier-dot" :style="{ background: row.color }"></span>
                            <span class="ce-tier-name">{{ row.name }}</span>
                            <span class="ce-tier-bar">
                                <i
                                    :style="{
                                        width: `${(row.count / serverMaxTier) * 100}%`,
                                        background: row.color,
                                    }"
                                ></i>
                            </span>
                            <span class="ce-mono ce-tier-count">{{ row.count }}</span>
                        </li>
                    </ul>
                </div>

                <div class="ce-card">
                    <h2 class="ce-section-title">云端 · 卡种子集</h2>
                    <div v-if="serverSubsetRows.length" class="ce-chip-list">
                        <span v-for="row in serverSubsetRows" :key="row.key" class="ce-chip">
                            {{ row.name }}
                            <b class="ce-mono">{{ row.count }}</b>
                        </span>
                    </div>
                    <p v-else class="ce-faint ce-mt-14">暂无数据。</p>
                </div>
            </div>

            <div class="ce-card ce-mt-16">
                <h2 class="ce-section-title">云端 · 最稀有的 20 张</h2>
                <div v-if="serverRarest.length" class="ce-table-wrap">
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
                            <tr v-for="row in serverRarest" :key="row.key">
                                <td>{{ row.player }}</td>
                                <td class="ce-faint">{{ row.variant }}</td>
                                <td :style="{ color: row.color }">{{ row.tierName }}</td>
                                <td class="ce-mono">{{ row.oddsLabel }}</td>
                                <td class="ce-faint">{{ row.boxKey }}</td>
                                <td class="ce-mono">{{ row.seed }}</td>
                                <td class="ce-faint">{{ row.date }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else class="ce-faint ce-mt-14">云端还没有记录。</p>
            </div>
        </section>

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
