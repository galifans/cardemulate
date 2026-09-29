<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { findCategory, findMaker, findProduct } from "../catalog";
import { getBox } from "../catalog";

const route = useRoute();
const categoryKey = computed(() => String(route.params.category));
const makerKey = computed(() => String(route.params.maker));
const productKey = computed(() => String(route.params.product));

const category = computed(() => findCategory(categoryKey.value));
const maker = computed(() => findMaker(categoryKey.value, makerKey.value));
const product = computed(() => findProduct(categoryKey.value, makerKey.value, productKey.value));
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
                    <component
                        :is="box.live ? RouterLink : 'div'"
                        v-for="box in product.boxes"
                        :key="box.ref"
                        :to="box.live ? `/open/${box.ref}` : undefined"
                        class="ce-card"
                        :class="box.live ? 'ce-card-hover' : 'ce-card-off'"
                    >
                        <p class="ce-card-title">
                            {{ box.name }}
                            <span v-if="box.live" class="ce-badge ce-badge-live">可拆盒</span>
                            <span v-else class="ce-badge ce-badge-soon">待上线</span>
                        </p>
                        <p class="ce-card-sub">{{ box.note }}</p>

                        <div v-if="box.live && getBox(box.ref)" class="ce-box-config">
                            <span class="ce-badge">
                                {{ getBox(box.ref)!.cardsPerPack }} 张 / 包
                            </span>
                            <span class="ce-badge">{{ getBox(box.ref)!.packsPerBox }} 包 / 盒</span>
                            <span class="ce-badge">
                                {{ getBox(box.ref)!.packsPerBox * getBox(box.ref)!.cardsPerPack }} 张 / 盒
                            </span>
                            <span class="ce-badge">{{ getBox(box.ref)!.boxesPerCase }} 盒 / 箱</span>
                            <span class="ce-badge">
                                {{ getBox(box.ref)!.autoGuaranteed ? "有签名保证" : "无签名保证" }}
                            </span>
                        </div>

                        <p v-if="box.live" class="ce-soon-line ce-live-line">点击进入拆盒</p>
                        <p v-else class="ce-soon-line">待上线，敬请期待！</p>
                    </component>
                </div>
            </section>

            <section v-if="product.boxes.some((b) => b.live)" class="ce-section">
                <div class="ce-card">
                    <h2 class="ce-section-title">
                        {{ getBox(product.boxes.find((b) => b.live)!.ref)!.name }}
                    </h2>
                    <div class="ce-highlights">
                        <div>
                            <h3 class="ce-hl-title">本盒独家内容</h3>
                            <ul>
                                <li
                                    v-for="item in getBox(product.boxes.find((b) => b.live)!.ref)!
                                        .boxExclusives"
                                    :key="item"
                                >
                                    {{ item }}
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 class="ce-hl-title">注意事项</h3>
                            <ul>
                                <li
                                    v-for="item in getBox(product.boxes.find((b) => b.live)!.ref)!.notes"
                                    :key="item"
                                >
                                    {{ item }}
                                </li>
                            </ul>
                        </div>
                    </div>
                    <p class="ce-faint ce-hl-foot">
                        共 {{ getBox(product.boxes.find((b) => b.live)!.ref)!.subsets.length }} 个子集、
                        {{ getBox(product.boxes.find((b) => b.live)!.ref)!.variants.length }} 个卡种。
                        进入拆盒页可查看完整配率表与 Checklist。
                    </p>
                </div>
            </section>
        </template>

        <div v-else class="ce-empty">
            没有找到该系列。<RouterLink to="/" class="ce-link">返回首页</RouterLink>
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

.ce-soon-line {
    margin: 12px 0 0;
    font-size: 12.5px;
    color: var(--ce-warn);
}

.ce-live-line {
    color: var(--ce-brand);
}

.ce-highlights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 22px;
    margin-top: 16px;
}

.ce-hl-title {
    font-size: 13px;
    color: var(--ce-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
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

.ce-hl-foot {
    margin: 18px 0 0;
    font-size: 12.5px;
}

.ce-link {
    color: var(--ce-brand);
}
</style>
