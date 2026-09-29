<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { findCategory, findMaker, findProduct } from "../catalog";
import { getBox } from "../catalog";
import type { BoxRef } from "../catalog/types";

const route = useRoute();
const categoryKey = computed(() => String(route.params.category));
const makerKey = computed(() => String(route.params.maker));
const productKey = computed(() => String(route.params.product));

const category = computed(() => findCategory(categoryKey.value));
const maker = computed(() => findMaker(categoryKey.value, makerKey.value));
const product = computed(() => findProduct(categoryKey.value, makerKey.value, productKey.value));

/** 一张盒型卡片：规格与内容摘要都来自注册表，没注册的占位盒型只有手写说明 */
interface BoxCard extends BoxRef {
    config: {
        cardsPerPack: number;
        packsPerBox: number;
        cardsPerBox: number;
        boxesPerCase: number;
        autoGuaranteed: boolean;
    } | null;
    content: {
        exclusives: string[];
        subsetCount: number;
        variantCount: number;
    } | null;
}

const boxCards = computed<BoxCard[]>(() =>
    (product.value?.boxes ?? []).map((ref) => {
        const box = getBox(ref.ref);
        return {
            ...ref,
            config: box
                ? {
                      cardsPerPack: box.cardsPerPack,
                      packsPerBox: box.packsPerBox,
                      cardsPerBox: box.cardsPerPack * box.packsPerBox,
                      boxesPerCase: box.boxesPerCase,
                      autoGuaranteed: box.autoGuaranteed,
                  }
                : null,
            content: box
                ? {
                      exclusives: box.boxExclusives,
                      subsetCount: box.subsets.length,
                      variantCount: box.variants.length,
                  }
                : null,
        };
    }),
);

/** 注意事项四个盒型完全一致，取任一已上线盒型的即可 */
const boxNotes = computed(() => {
    for (const card of boxCards.value) {
        const box = getBox(card.ref);
        if (box?.live) return box.notes;
    }
    return [];
});

/** 配置说明弹窗：只存 boxKey，内容从 boxCards 里现取，避免两处状态不同步 */
const configRef = ref("");
const configDetail = computed(() => {
    const card = boxCards.value.find((item) => item.ref === configRef.value);
    if (!card?.content) return null;
    return { name: card.name, ...card.content };
});

const openConfig = (ref: string) => {
    configRef.value = ref;
};

const closeConfig = () => {
    configRef.value = "";
};
</script>

<template>
    <div class="ce-shell">
        <nav class="ce-crumbs">
            <RouterLink to="/">卡品分类</RouterLink>
            <span>/</span>
            <RouterLink :to="`/c/${categoryKey}`">{{ category?.name }}</RouterLink>
            <span>/</span>
            <RouterLink :to="`/c/${categoryKey}/${makerKey}`">{{ maker?.name }}</RouterLink>
            <span>/</span>
            <span>{{ product?.name }}</span>
        </nav>

        <template v-if="product">
            <header class="ce-page-head">
                <p class="ce-card-en">{{ maker?.nameEn }}</p>
                <h1 class="ce-page-title">{{ product.name }}</h1>
                <p class="ce-page-desc">
                    <span v-if="product.releaseDate">上市日期 {{ product.releaseDate }} · </span>
                    {{ product.note }}
                </p>
            </header>

            <section class="ce-section">
                <div class="ce-section-head">
                    <h2 class="ce-section-title">选择盒型</h2>
                    <span class="ce-section-desc">当前仅支持「按盒拆」</span>
                </div>

                <div class="ce-grid ce-grid-2">
                    <div
                        v-for="card in boxCards"
                        :key="card.ref"
                        class="ce-card ce-box-card"
                        :class="card.live ? 'ce-card-hover' : 'ce-card-off'"
                    >
                        <p class="ce-card-title">
                            {{ card.name }}
                            <span v-if="card.live" class="ce-badge ce-badge-live">可拆盒</span>
                            <span v-else class="ce-badge ce-badge-soon">待上线</span>
                            <button
                                v-if="card.content"
                                class="ce-box-more"
                                type="button"
                                @click="openConfig(card.ref)"
                            >
                                配置说明
                            </button>
                        </p>
                        <p v-if="card.note" class="ce-card-sub">{{ card.note }}</p>

                        <div v-if="card.config" class="ce-box-config">
                            <span class="ce-badge">{{ card.config.cardsPerPack }} 张 / 包</span>
                            <span class="ce-badge">{{ card.config.packsPerBox }} 包 / 盒</span>
                            <span class="ce-badge">{{ card.config.cardsPerBox }} 张 / 盒</span>
                            <span v-if="card.config.boxesPerCase > 0" class="ce-badge">
                                {{ card.config.boxesPerCase }} 盒 / 箱
                            </span>
                            <span class="ce-badge">
                                {{ card.config.autoGuaranteed ? "有签名保证" : "无签名保证" }}
                            </span>
                        </div>

                        <!-- 整卡可点：覆盖层负责跳转，上面的按钮靠 z-index 盖住它 -->
                        <RouterLink
                            v-if="card.live"
                            class="ce-box-cover"
                            :to="`/open/${card.ref}`"
                            :aria-label="`进入拆盒页：${card.name}`"
                        ></RouterLink>
                    </div>
                </div>
            </section>

            <section v-if="boxNotes.length" class="ce-section">
                <div class="ce-card">
                    <h2 class="ce-section-title">注意事项</h2>
                    <div class="ce-highlights">
                        <div>
                            <ul>
                                <li v-for="item in boxNotes" :key="item">{{ item }}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </template>

        <div v-else class="ce-empty">
            没有找到该系列。<RouterLink to="/" class="ce-link">返回首页</RouterLink>
        </div>

        <div v-if="configDetail" class="ce-modal" @click.self="closeConfig">
            <div class="ce-modal-panel" role="dialog" aria-modal="true" aria-labelledby="ce-config-title">
                <div class="ce-modal-head">
                    <h2 id="ce-config-title" class="ce-section-title">{{ configDetail.name }}</h2>
                    <button class="ce-modal-close" type="button" @click="closeConfig">关闭</button>
                </div>

                <div v-if="configDetail.exclusives.length" class="ce-modal-block">
                    <h3 class="ce-section-title">本盒独家内容</h3>
                    <ul class="ce-config-list">
                        <li v-for="item in configDetail.exclusives" :key="item">{{ item }}</li>
                    </ul>
                </div>

                <p class="ce-faint ce-config-foot">
                    共 {{ configDetail.subsetCount }} 个子集、{{ configDetail.variantCount }} 个卡种。
                    进入拆盒页可查看完整配率表与 Checklist。
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ce-crumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 22px 0 0;
    font-size: 13px;
    color: var(--ce-text-faint);
    flex-wrap: wrap;
}

.ce-crumbs a:hover {
    color: var(--ce-brand);
}

.ce-page-head {
    padding: 22px 0 6px;
    max-width: 820px;
}

.ce-page-head p {
    margin: 0;
}

.ce-page-title {
    font-size: 27px;
    margin-top: 2px !important;
    line-height: 1.25;
}

.ce-page-desc {
    color: var(--ce-text-dim);
    font-size: 14px;
    margin-top: 8px !important;
}

.ce-box-config {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
}

.ce-box-card {
    position: relative;
}

.ce-box-more {
    /* 整卡跳转靠覆盖层实现，按钮必须压在它上面才点得到 */
    position: relative;
    z-index: 1;
    padding: 1px 9px;
    border-radius: 999px;
    border: 1px dashed var(--ce-border);
    background: transparent;
    color: var(--ce-text-faint);
    font-size: 11.5px;
    transition: color 0.16s ease, border-color 0.16s ease;
}

.ce-box-more:hover {
    border-color: var(--ce-brand);
    color: var(--ce-brand);
}

.ce-box-cover {
    position: absolute;
    inset: 0;
    border-radius: inherit;
}

.ce-config-list {
    margin: 10px 0 0;
    padding-left: 18px;
    color: var(--ce-text-dim);
    font-size: 13.5px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.ce-config-foot {
    margin: 20px 0 0;
    font-size: 12.5px;
}

.ce-highlights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 22px;
    margin-top: 16px;
}

.ce-highlights ul {
    margin: 0;
    padding-left: 18px;
    color: var(--ce-text-dim);
    font-size: 13.5px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.ce-link {
    color: var(--ce-brand);
}
</style>
