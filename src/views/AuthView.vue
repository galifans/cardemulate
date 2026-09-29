<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAppStore } from "../stores/app";

const store = useAppStore();
const router = useRouter();

const mode = ref<"login" | "register">("login");
const email = ref("");
const password = ref("");
const confirm = ref("");
const localError = ref("");

/** 与后端 MIN_PASSWORD_LENGTH / MAX_PASSWORD_LENGTH 保持一致（常见站点约束） */
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 32;

onMounted(() => {
    store.clearMessages();
});

const isRegister = computed(() => mode.value === "register");

const switchMode = (next: "login" | "register"): void => {
    mode.value = next;
    localError.value = "";
    store.clearMessages();
};

const submit = async (): Promise<void> => {
    localError.value = "";
    store.clearMessages();

    const account = email.value.trim();
    if (!account) {
        localError.value = "请输入邮箱。";
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(account)) {
        localError.value = "邮箱格式不正确。";
        return;
    }
    if (!password.value) {
        localError.value = "请输入密码。";
        return;
    }
    if (isRegister.value) {
        if (password.value.length < MIN_PASSWORD) {
            localError.value = `密码至少 ${MIN_PASSWORD} 位。`;
            return;
        }
        if (password.value.length > MAX_PASSWORD) {
            localError.value = `密码最多 ${MAX_PASSWORD} 位。`;
            return;
        }
        if (/\s/.test(password.value)) {
            localError.value = "密码不能包含空格。";
            return;
        }
        if (password.value !== confirm.value) {
            localError.value = "两次输入的密码不一致。";
            return;
        }
    }

    const ok = isRegister.value
        ? await store.register(account, password.value)
        : await store.login(account, password.value);

    if (ok) {
        password.value = "";
        confirm.value = "";
        await router.push("/stats");
        return;
    }

    // 邮箱已注册时直接切到登录页，省得用户自己去找入口
    if (isRegister.value && store.state.error.includes("已注册")) {
        mode.value = "login";
    }
};

const logout = async (): Promise<void> => {
    await store.logout();
};
</script>

<template>
    <div class="ce-shell ce-auth-shell">
        <section v-if="store.state.user" class="ce-card ce-auth-card">
            <p class="ce-card-en">Signed In</p>
            <h1 class="ce-auth-title">已登录</h1>
            <p class="ce-auth-desc">
                <strong>{{ store.state.user.displayName }}</strong>
                <br />
                <span class="ce-faint">{{ store.state.user.email }}</span>
            </p>
            <p v-if="store.state.info" class="ce-alert ce-alert-ok">{{ store.state.info }}</p>
            <div class="ce-auth-actions">
                <RouterLink class="ce-btn ce-btn-primary" to="/stats">查看我的统计</RouterLink>
                <button class="ce-btn" type="button" @click="logout">退出登录</button>
            </div>
        </section>

        <section v-else class="ce-card ce-auth-card">
            <h1 class="ce-auth-title">{{ isRegister ? "注册" : "登录" }}</h1>

            <div class="ce-auth-tabs">
                <button
                    type="button"
                    :class="{ active: !isRegister }"
                    @click="switchMode('login')"
                >
                    登录
                </button>
                <button
                    type="button"
                    :class="{ active: isRegister }"
                    @click="switchMode('register')"
                >
                    注册
                </button>
            </div>

            <form class="ce-auth-form" @submit.prevent="submit">
                <label class="ce-field">
                    <span>邮箱</span>
                    <input
                        v-model="email"
                        type="text"
                        inputmode="email"
                        autocomplete="email"
                        maxlength="100"
                        placeholder="you@example.com"
                    />
                </label>

                <label class="ce-field">
                    <span>密码</span>
                    <input
                        v-model="password"
                        type="password"
                        :autocomplete="isRegister ? 'new-password' : 'current-password'"
                        :placeholder="isRegister ? `${MIN_PASSWORD}~${MAX_PASSWORD} 位字符` : '请输入密码'"
                    />
                </label>

                <label v-if="isRegister" class="ce-field">
                    <span>确认密码</span>
                    <input
                        v-model="confirm"
                        type="password"
                        autocomplete="new-password"
                        placeholder="再输入一次"
                    />
                </label>

                <p v-if="isRegister" class="ce-faint ce-auth-rule">
                    密码 {{ MIN_PASSWORD }}~{{ MAX_PASSWORD }} 位，不能包含空格。
                </p>

                <p v-if="localError" class="ce-alert ce-alert-error">{{ localError }}</p>
                <p v-else-if="store.state.error" class="ce-alert ce-alert-error">
                    {{ store.state.error }}
                </p>
                <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">
                    {{ store.state.info }}
                </p>

                <button
                    class="ce-btn ce-btn-primary ce-auth-submit"
                    type="submit"
                    :disabled="store.state.busy"
                >
                    {{ store.state.busy ? "处理中…" : isRegister ? "注册" : "登录" }}
                </button>
            </form>

            <p class="ce-faint ce-auth-note">
                <template v-if="isRegister">
                    已有账号？<button class="ce-link" type="button" @click="switchMode('login')">直接登录</button>
                </template>
                <template v-else>
                    还没有账号？<button class="ce-link" type="button" @click="switchMode('register')">立即注册</button>
                </template>
            </p>
        </section>
    </div>
</template>

<style scoped>
.ce-auth-shell {
    display: flex;
    justify-content: center;
    padding-top: 40px;
}

.ce-auth-card {
    width: 100%;
    max-width: 460px;
}

.ce-auth-card p {
    margin: 0;
}

.ce-auth-title {
    font-size: 24px;
}

.ce-auth-desc {
    color: var(--ce-text-dim);
    font-size: 13.5px;
    margin-top: 10px !important;
}

.ce-auth-rule {
    font-size: 11.5px;
    margin-top: -2px !important;
}

.ce-link {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    color: var(--ce-brand);
    text-decoration: underline;
    cursor: pointer;
}

.ce-auth-tabs {
    display: flex;
    gap: 6px;
    margin: 20px 0 18px;
    padding: 4px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--ce-border-soft);
}

.ce-auth-tabs button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ce-text-dim);
    font-size: 13.5px;
}

.ce-auth-tabs button.active {
    background: var(--ce-brand-soft);
    color: var(--ce-brand);
    font-weight: 600;
}

.ce-auth-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.ce-auth-submit {
    justify-content: center;
    margin-top: 4px;
}

.ce-auth-note {
    margin-top: 18px !important;
    font-size: 12.5px;
}

.ce-auth-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
}
</style>
