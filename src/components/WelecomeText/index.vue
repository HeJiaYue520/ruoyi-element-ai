<!-- 欢迎提示词 -->
<script setup lang="ts">
import { useTimeGreeting } from '@/hooks/useTimeGreeting';
import { useUserStore } from '@/store';

const greeting = useTimeGreeting();
const userStore = useUserStore();

const username = computed(() => userStore.userInfo?.username ?? '我是 Element Plus X');
</script>

<template>
  <div
    class="welcome-text w-full flex flex-wrap items-center justify-center text-center text-lg font-semibold mb-32px mt-12px font-size-32px line-height-32px"
  >
    {{ greeting }}好，{{ username }}
  </div>
</template>

<style scoped lang="scss"></style>
