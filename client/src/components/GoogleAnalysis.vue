<template>
  <section>
    <!-- 流量分析 -->
    <div>
      <h2 class="text-[24px] lg:text-[36px] font-bold">流量分析</h2>
      <h5 class="text-[16px] lg:text-[24px] opacity-70">近期網站總流量</h5>
    </div>
    <!-- 產品分析 -->
    <div class="grid grid-cols-2 gap-[12px] lg:gap-[24px]">
      <div class="products-analysis"></div>
      <div class="products-analysis"></div>
      <div class="products-analysis"></div>
      <div class="products-analysis"></div>
    </div>
  </section>
</template>

<style scoped>
section {
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (min-width: 1024px) {
  section {
    padding: 48px;
    gap: 48px;
  }
}

.products-analysis {
  width: 100%;
  aspect-ratio: 4 / 3;
  background-color: rgba(33, 42, 55, 0.7);
  border-radius: 10px;
}
</style>
