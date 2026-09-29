<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
    <div class="ce-shell ce-404">
        <p class="ce-404-code ce-mono">404</p>
        <h1 class="ce-404-title">这个盒子不存在</h1>
        <p class="ce-404-desc">
            链接可能已经失效，或者你手输的地址有误。回到首页重新挑一个品类吧。
        </p>
        <div class="ce-404-actions">
            <RouterLink class="ce-btn ce-btn-primary" to="/">返回首页</RouterLink>
            <RouterLink class="ce-btn" to="/c/basketball">去拆篮球盒</RouterLink>
        </div>
    </div>
</template>

<style scoped>
.ce-404 {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 6px;
}

.ce-404-code {
    font-size: 64px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(100deg, var(--ce-brand) 0%, #bff5d6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1;
}

.ce-404-title {
    font-size: 24px;
    margin: 14px 0 0;
}

.ce-404-desc {
    color: var(--ce-text-dim);
    font-size: 14px;
    margin: 10px 0 0;
    max-width: 440px;
}

.ce-404-actions {
    display: flex;
    gap: 10px;
    margin-top: 24px;
    flex-wrap: wrap;
    justify-content: center;
}
</style>
