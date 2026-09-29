<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { findCategory, findMaker, findProducts } from "../catalog";

const route = useRoute();
const categoryKey = computed(() => String(route.params.category));
const makerKey = computed(() => String(route.params.maker));

const category = computed(() => findCategory(categoryKey.value));
const maker = computed(() => findMaker(categoryKey.value, makerKey.value));
const products = computed(() => findProducts(categoryKey.value, makerKey.value));
</script>

<template>
    <div class="ce-shell">
        <nav class="ce-crumbs">
            <RouterLink to="/">卡品分类</RouterLink>
            <span>/</span>
            <RouterLink :to="`/c/${categoryKey}`">{{ category?.name ?? categoryKey }}</RouterLink>
            <span>/</span>
            <span>{{ maker?.name ?? makerKey }}</span>
        </nav>

        <header class="ce-page-head">
            <p class="ce-card-en">{{ maker?.nameEn }}</p>
            <h1 class="ce-page-title">{{ maker?.name ?? makerKey }} 系列</h1>
            <p class="ce-page-desc">选择一个系列，查看盒型与拆盒入口</p>
        </header>

        <section class="ce-section">
            <div v-if="products.length" class="ce-grid ce-grid-2">
                <component
                    :is="product.live ? RouterLink : 'div'"
                    v-for="product in products"
                    :key="product.key"
                    :to="product.live ? `/c/${categoryKey}/${makerKey}/${product.key}` : undefined"
                    class="ce-card"
                    :class="product.live ? 'ce-card-hover' : 'ce-card-off'"
                >
                    <p class="ce-card-title">
                        {{ product.name }}
                        <span v-if="product.live" class="ce-badge ce-badge-live">已上线</span>
                        <span v-else class="ce-badge ce-badge-soon">待上线</span>
                    </p>
                    <p v-if="product.releaseDate" class="ce-card-sub">
                        上市日期：{{ product.releaseDate }}
                    </p>
                    <p class="ce-card-sub">{{ product.note }}</p>
                    <p v-if="product.live" class="ce-soon-line ce-live-line">
                        已收录 {{ product.boxes.filter((b) => b.live).length }} 个可拆盒型
                    </p>
                </component>
            </div>
            <div v-else class="ce-empty">
                该发行商暂无可选系列。
                <RouterLink :to="`/c/${categoryKey}`" class="ce-link">返回上一步</RouterLink>
            </div>
        </section>
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
}

.ce-crumbs a:hover {
    color: var(--ce-brand);
}

.ce-page-head {
    padding: 22px 0 6px;
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
    margin-top: 4px !important;
}

.ce-soon-line {
    margin: 12px 0 0;
    font-size: 12.5px;
    color: var(--ce-warn);
}

.ce-live-line {
    color: var(--ce-brand);
}

.ce-link {
    color: var(--ce-brand);
}
</style>
